import express from "express";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/", (_req, res) => {
    res.json({ message: "Bitespeed Identity Reconciliation Service" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});