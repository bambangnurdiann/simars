import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../services/db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Set it in your .env file.");
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Akun tidak ditemukan atau tidak aktif." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password salah." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Update Activity Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "AUTH",
        details: `User ${username} login ke sistem`,
        ipAddress: req.ip
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/logout", async (req, res) => {
  // Client handles token removal, but we can log it if we have the user info
  res.json({ message: "Berhasil keluar." });
});

export default router;
