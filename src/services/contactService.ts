import { PoolClient } from "pg";
import pool from "../database";

interface Contact {
    id: number;
    phoneNumber: string | null;
    email: string | null;
    linkedId: number | null;
    linkPrecedence: "primary" | "secondary";
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

interface IdentifyRequest {
    email?: string | null;
    phoneNumber?: string | number | null;
}

interface ConsolidatedContact {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
}

async function findMatchingContacts(
    client: PoolClient,
    email: string | null,
    phoneNumber: string | null
): Promise<Contact[]> {
    const conditions: string[] = [];
    const values: string[] = [];

    if (email) {
        conditions.push(`email = $${conditions.length + 1}`);
        values.push(email);
    }
    if (phoneNumber) {
        conditions.push(`"phoneNumber" = $${conditions.length + 1}`);
        values.push(phoneNumber);
    }

    if (conditions.length === 0) return [];

    const { rows } = await client.query<Contact>(
        `SELECT * FROM contacts
         WHERE (${conditions.join(" OR ")})
         AND "deletedAt" IS NULL
         ORDER BY "createdAt" ASC`,
        values
    );

    return rows;
}

async function resolvePrimary(
    client: PoolClient,
    contact: Contact
): Promise<Contact> {
    if (contact.linkPrecedence === "primary") return contact;
    if (!contact.linkedId) return contact;

    const { rows } = await client.query<Contact>(
        `SELECT * FROM contacts WHERE id = $1 AND "deletedAt" IS NULL`,
        [contact.linkedId]
    );

    if (rows.length === 0) return contact;
    return resolvePrimary(client, rows[0]);
}

async function fetchCluster(
    client: PoolClient,
    primaryId: number
): Promise<Contact[]> {
    const { rows } = await client.query<Contact>(
        `SELECT * FROM contacts
         WHERE (id = $1 OR "linkedId" = $1)
         AND "deletedAt" IS NULL
         ORDER BY "createdAt" ASC`,
        [primaryId]
    );
    return rows;
}

async function mergePrimaries(
    client: PoolClient,
    primaries: Contact[]
): Promise<Contact> {
    primaries.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const truePrimary = primaries[0];

    for (const demoted of primaries.slice(1)) {
        await client.query(
            `UPDATE contacts
             SET "linkedId" = $1, "updatedAt" = NOW()
             WHERE "linkedId" = $2 AND id != $1`,
            [truePrimary.id, demoted.id]
        );

        await client.query(
            `UPDATE contacts
             SET "linkedId" = $1, "linkPrecedence" = 'secondary', "updatedAt" = NOW()
             WHERE id = $2`,
            [truePrimary.id, demoted.id]
        );
    }

    return truePrimary;
}

function buildResponse(primary: Contact, cluster: Contact[]): ConsolidatedContact {
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

    for (const contact of cluster) {
        if (contact.id === primary.id) continue;
        secondaryContactIds.push(contact.id);
        if (contact.email && !emails.includes(contact.email)) emails.push(contact.email);
        if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) phoneNumbers.push(contact.phoneNumber);
    }

    return { primaryContactId: primary.id, emails, phoneNumbers, secondaryContactIds };
}

export async function identify(request: IdentifyRequest): Promise<ConsolidatedContact> {
    const email = request.email?.toString().trim().toLowerCase() || null;
    const phoneNumber = request.phoneNumber?.toString().trim() || null;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const matches = await findMatchingContacts(client, email, phoneNumber);

        if (matches.length === 0) {
            const { rows } = await client.query<Contact>(
                `INSERT INTO contacts ("phoneNumber", email, "linkPrecedence")
                 VALUES ($1, $2, 'primary')
                 RETURNING *`,
                [phoneNumber, email]
            );
            await client.query("COMMIT");
            return buildResponse(rows[0], [rows[0]]);
        }

        const primaryMap = new Map<number, Contact>();

        for (const contact of matches) {
            const primary = await resolvePrimary(client, contact);
            primaryMap.set(primary.id, primary);
        }

        const primaries = Array.from(primaryMap.values());

        const truePrimary =
            primaries.length > 1
                ? await mergePrimaries(client, primaries)
                : primaries[0];

        const cluster = await fetchCluster(client, truePrimary.id);

        const isNewEmail = email && !cluster.some((c) => c.email === email);
        const isNewPhone = phoneNumber && !cluster.some((c) => c.phoneNumber === phoneNumber);

        if (isNewEmail || isNewPhone) {
            await client.query(
                `INSERT INTO contacts ("phoneNumber", email, "linkedId", "linkPrecedence")
                 VALUES ($1, $2, $3, 'secondary')`,
                [phoneNumber, email, truePrimary.id]
            );
        }

        const finalCluster = await fetchCluster(client, truePrimary.id);

        await client.query("COMMIT");
        return buildResponse(truePrimary, finalCluster);
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}