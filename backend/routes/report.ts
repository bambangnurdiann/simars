import { Router } from "express";
import { prisma } from "../services/db";
import { authenticateToken, checkRole } from "../middleware/auth";

const router = Router();

router.get("/incoming", authenticateToken, checkRole(["ADMIN", "PIMPINAN", "SEKRETARIS"]), async (req, res) => {
  const { startDate, endDate, userId } = req.query;
  try {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (userId && userId !== "all") {
      where.dispositions = { some: { toUserId: userId as string } };
    }
    const letters = await prisma.incomingLetter.findMany({
      where,
      include: { dispositions: true }
    });
    res.json(letters);
  } catch (error) {
    res.status(500).json({ message: "Gagal memproses laporan." });
  }
});

router.get("/outgoing", authenticateToken, checkRole(["ADMIN", "PIMPINAN", "SEKRETARIS"]), async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    const letters = await prisma.outgoingLetter.findMany({ where });
    res.json(letters);
  } catch (error) {
    res.status(500).json({ message: "Gagal memproses laporan." });
  }
});

router.get("/dispositions", authenticateToken, checkRole(["ADMIN", "PIMPINAN", "SEKRETARIS"]), async (req, res) => {
  const { startDate, endDate, userId } = req.query;
  try {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (userId && userId !== "all") {
      where.toUserId = userId as string;
    }
    const data = await prisma.disposition.findMany({
      where,
      include: {
        incomingLetter: true,
        toUser: { select: { name: true } }
      }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Gagal memproses laporan." });
  }
});

export default router;
