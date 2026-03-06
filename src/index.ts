import express from "express";
import cors from "cors";
import { initDB } from "./database";
import identifyRouter from "./routes/identify";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bitespeed Identity Reconciliation</title>
            <style>
                body {
                    font-family: monospace;
                    max-width: 700px;
                    margin: 60px auto;
                    padding: 0 20px;
                    background: #0a0a0a;
                    color: #e0e0e0;
                    line-height: 1.7;
                }
                h1 { color: #ffffff; }
                h2 { color: #ffffff; margin-top: 30px; }
                code {
                    background: #1a1a2e;
                    padding: 2px 8px;
                    border-radius: 4px;
                    color: #00d4aa;
                }
                pre {
                    background: #1a1a2e;
                    padding: 16px;
                    border-radius: 8px;
                    overflow-x: auto;
                    color: #00d4aa;
                }
                a { color: #6eb5ff; }
                .status {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #00d4aa;
                    border-radius: 50%;
                    margin-right: 6px;
                }
                .meta {
                    color: #888;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <h1>Bitespeed Identity Reconciliation Service</h1>
            <p class="meta">Version 1.0.0 | Built by Shreyash</p>
            <p><span class="status"></span> Service is running</p>

            <h2>What is this?</h2>
            <p>A service that links customer identities across multiple purchases. Because customers use different emails and phone numbers, and we need to keep track of who is who.</p>

            <h2>How it works</h2>
            <p>Send an email or phone number (or both), and I will find all linked contacts and return them as one consolidated identity.</p>

            <h2>Endpoints</h2>
            <p><code>GET /</code> - You are here. Welcome!</p>
            <p><code>GET /health</code> - Check if the service and database are alive.</p>
            <p><code>POST /identify</code> - The main endpoint. Send contact info, get back consolidated identity.</p>

            <h2>Request Body</h2>
<pre>{
  "email": "string (optional)",
  "phoneNumber": "string or number (optional)"
}</pre>
            <p>Rule: At least one of email or phoneNumber must be provided.</p>

            <h2>Example Response</h2>
<pre>{
  "contact": {
    "primaryContactId": 1,
    "emails": ["tony@stark.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}</pre>

            <h2>Try it</h2>
<pre>curl -X POST https://bitespeed-identity-130433035304.us-central1.run.app/identify \\
  -H "Content-Type: application/json" \\
  -d '{"email": "tony@stark.com", "phoneNumber": "1234567890"}'</pre>

            <h2>Links</h2>
            <p><a href="/health">Health Check</a></p>
            <p><a href="https://github.com/cyb3rcr4t0712/bitespeed-identity
">GitHub Repository</a></p>
        </body>
        </html>
    `);
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