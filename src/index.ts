import express from "express";
import cors from "cors";
import { initDB } from "./database";
import identifyRouter from "./routes/identify";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        name: "Bitespeed Identity Reconciliation Service",
        version: "1.0.0",
        description: "A service that links customer identities across multiple purchases.",
        howItWorks: "Send an email or phone number (or both), and the service finds all linked contacts and returns them as one consolidated identity.",
        endpoints: {
            "GET /": "You are here. Welcome!",
            "GET /health": "Check if the service and database are alive.",
            "POST /identify": {
                description: "The main endpoint. Send contact info, get back consolidated identity.",
                body: {
                    email: "string (optional)",
                    phoneNumber: "string or number (optional)",
                },
                rule: "At least one of email or phoneNumber must be provided.",
            },
        },
        repository: "https://github.com/cyb3rcr4t0712/bitespeed-identity",
    });
});

app.use("/identify", identifyRouter);

app.get("/health", async (_req, res) => {
    try {
        const { default: pool } = await import("./database");
        const result = await pool.query("SELECT NOW()");
        res.json({
            status: "healthy",
            database: "connected",
            serverTime: result.rows[0].now,
            message: "All systems operational.",
        });
    } catch {
        res.status(503).json({
            status: "unhealthy",
            database: "disconnected",
            message: "Database connection failed. Please try again later.",
        });
    }
});

app.use((_req, res) => {
    res.status(404).json({
        error: "This route does not exist.",
        suggestion: "Try POST /identify or GET /health",
        home: "Visit GET / for full documentation.",
    });
});

async function start() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`
    =====================================================

      Bitespeed Identity Reconciliation Service

      Status:  Running
      Port:    ${PORT}
      Time:    ${new Date().toISOString()}

      Ready to consolidate customer identities.

    =====================================================
        `);
    });
}

start().catch(console.error);