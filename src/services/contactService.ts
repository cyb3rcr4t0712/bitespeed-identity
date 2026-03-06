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

export async function identify(request: IdentifyRequest): Promise<ConsolidatedContact> {
    const email = request.email?.toString().trim().toLowerCase() || null;
    const phoneNumber = request.phoneNumber?.toString().trim() || null;

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

    const { rows: matches } = await pool.query<Contact>(
        `SELECT * FROM contacts
         WHERE (${conditions.join(" OR ")})
         AND "deletedAt" IS NULL
         ORDER BY "createdAt" ASC`,
        values
    );

    if (matches.length === 0) {
        const { rows } = await pool.query<Contact>(
            `INSERT INTO contacts ("phoneNumber", email, "linkPrecedence")
             VALUES ($1, $2, 'primary')
             RETURNING *`,
            [phoneNumber, email]
        );

        const c = rows[0];
        return {
            primaryContactId: c.id,
            emails: c.email ? [c.email] : [],
            phoneNumbers: c.phoneNumber ? [c.phoneNumber] : [],
            secondaryContactIds: [],
        };
    }

    let primary = matches[0];
    if (primary.linkPrecedence === "secondary" && primary.linkedId) {
        const { rows } = await pool.query<Contact>(
            `SELECT * FROM contacts WHERE id = $1 AND "deletedAt" IS NULL`,
            [primary.linkedId]
        );
        if (rows.length > 0) primary = rows[0];
    }

    const { rows: cluster } = await pool.query<Contact>(
        `SELECT * FROM contacts
         WHERE (id = $1 OR "linkedId" = $1)
         AND "deletedAt" IS NULL
         ORDER BY "createdAt" ASC`,
        [primary.id]
    );

    const isNewEmail = email && !cluster.some((c) => c.email === email);
    const isNewPhone = phoneNumber && !cluster.some((c) => c.phoneNumber === phoneNumber);

    if (isNewEmail || isNewPhone) {
        await pool.query(
            `INSERT INTO contacts ("phoneNumber", email, "linkedId", "linkPrecedence")
             VALUES ($1, $2, $3, 'secondary')`,
            [phoneNumber, email, primary.id]
        );
    }

    const { rows: finalCluster } = await pool.query<Contact>(
        `SELECT * FROM contacts
         WHERE (id = $1 OR "linkedId" = $1)
         AND "deletedAt" IS NULL
         ORDER BY "createdAt" ASC`,
        [primary.id]
    );

    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

    for (const contact of finalCluster) {
        if (contact.id === primary.id) continue;
        secondaryContactIds.push(contact.id);
        if (contact.email && !emails.includes(contact.email)) emails.push(contact.email);
        if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) phoneNumbers.push(contact.phoneNumber);
    }

    return { primaryContactId: primary.id, emails, phoneNumbers, secondaryContactIds };
}