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

    const primary = matches[0];
    return {
        primaryContactId: primary.id,
        emails: primary.email ? [primary.email] : [],
        phoneNumbers: primary.phoneNumber ? [primary.phoneNumber] : [],
        secondaryContactIds: [],
    };
}