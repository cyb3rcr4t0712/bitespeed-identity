import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

let pool: Pool;

if (isProduction) {
    pool = new Pool({
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "bitespeed",
        host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    });
} else {
    pool = new Pool({
        host: process.env.DB_HOST || "127.0.0.1",
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME || "bitespeed",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "password",
    });
}

export async function initDB(): Promise<void> {
    try {
        const client = await pool.connect();
        console.log("Connected to PostgreSQL.");
        client.release();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                "phoneNumber" TEXT,
                email TEXT,
                "linkedId" INTEGER REFERENCES contacts(id),
                "linkPrecedence" TEXT CHECK ("linkPrecedence" IN ('primary', 'secondary'))
                                 NOT NULL DEFAULT 'primary',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "deletedAt" TIMESTAMP WITH TIME ZONE
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts("phoneNumber")`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_contacts_linked ON contacts("linkedId")`);

        console.log("Tables and indexes ready.");
    } catch (error) {
        console.error("Database initialization failed:", error);
        process.exit(1);
    }
}

export default pool;