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

export default pool;