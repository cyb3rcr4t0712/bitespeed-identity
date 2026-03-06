import express from "express";
import cors from "cors";
import { initDB } from "./database";
import identifyRouter from "./routes/identify";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({ message: "Bitespeed Identity Reconciliation Service" });
});

app.use("/identify", identifyRouter);

async function start() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

start().catch(console.error);