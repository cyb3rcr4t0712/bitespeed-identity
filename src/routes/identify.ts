import { Router, Request, Response } from "express";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({
            error: "Missing required fields.",
            message: "You must provide at least one of email or phoneNumber.",
        });
    }

    return res.status(200).json({ message: "ok" });
});

export default router;