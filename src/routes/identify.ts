import { Router, Request, Response } from "express";
import { identify } from "../services/contactService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({
            error: "Missing required fields.",
            message: "You must provide at least one of email or phoneNumber.",
        });
    }

    try {
        const result = await identify({ email, phoneNumber });
        return res.status(200).json({ contact: result });
    } catch (error) {
        console.error("Error in /identify:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});

export default router;