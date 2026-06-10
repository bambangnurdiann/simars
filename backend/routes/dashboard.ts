import { Router } from "express";
import { prisma } from "../services/db";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/stats", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const incomingCount = await prisma.incomingLetter.count();
    const outgoingCount = await prisma.outgoingLetter.count();

    const incomingToday = await prisma.incomingLetter.count({
      where: { createdAt: { gte: today, lt: tomorrow } }
    });
    const outgoingToday = await prisma.outgoingLetter.count({
      where: { createdAt: { gte: today, lt: tomorrow } }
    });

    const pending = await prisma.disposition.count({ where: { status: "PENDING" } });
    const inProcess = await prisma.disposition.count({ where: { status: "PROSES" } });
    const completed = await prisma.disposition.count({ where: { status: "SELESAI" } });

    let userStats: { name: string; completed: number; pending: number }[] | undefined;

    if (req.user && (req.user.role === "PIMPINAN" || req.user.role === "ADMIN")) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          dispositionsTo: {
            select: { status: true }
          }
        }
      });

      userStats = users.map(u => ({
        name: u.name,
        completed: u.dispositionsTo.filter(d => d.status === "SELESAI").length,
        pending: u.dispositionsTo.filter(d => d.status !== "SELESAI").length,
      })).filter(u => u.completed > 0 || u.pending > 0);
    }

    res.json({
      incoming: incomingCount,
      outgoing: outgoingCount,
      incomingToday,
      outgoingToday,
      pending,
      inProcess,
      completed,
      ...(userStats ? { userStats } : {})
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/chart", authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const months: { month: string; year: number; masuk: number; keluar: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const masuk = await prisma.incomingLetter.count({
        where: { createdAt: { gte: start, lt: end } }
      });
      const keluar = await prisma.outgoingLetter.count({
        where: { createdAt: { gte: start, lt: end } }
      });

      months.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        masuk,
        keluar
      });
    }

    res.json(months);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/activity", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, role: true } }
      }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/notifications", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/notifications/read-all", authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/deadline-check", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Find dispositions that are overdue or due today and not completed
    const overdueDispositions = await prisma.disposition.findMany({
      where: {
        status: { not: "SELESAI" },
        deadline: { lte: now },
      },
      include: {
        toUser: { select: { id: true, name: true } },
        incomingLetter: { select: { subject: true, letterNumber: true } },
      },
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let created = 0;

    for (const disp of overdueDispositions) {
      const message = `Disposisi "${disp.incomingLetter.subject}" (${disp.incomingLetter.letterNumber}) telah melewati batas waktu.`;

      // Check if notification already exists in last 24h to avoid duplicates
      const existing = await prisma.notification.findFirst({
        where: {
          userId: disp.toUser.id,
          message: { contains: disp.incomingLetter.letterNumber },
          createdAt: { gte: twentyFourHoursAgo },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: disp.toUser.id,
            title: "Deadline Disposisi Terlewat",
            message,
            link: "/disposisi",
          },
        });
        created++;
      }
    }

    res.json({ checked: overdueDispositions.length, created });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/archives", authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    
    const incomingWhere: any = {};
    const outgoingWhere: any = {};
    
    if (search) {
      const s = search as string;
      incomingWhere.OR = [
        { subject: { contains: s } },
        { letterNumber: { contains: s } },
        { sender: { contains: s } },
        { agendaNumber: { contains: s } },
      ];
      outgoingWhere.OR = [
        { subject: { contains: s } },
        { letterNumber: { contains: s } },
        { destination: { contains: s } },
      ];
    }

    const incoming = await prisma.incomingLetter.findMany({
      where: incomingWhere,
      select: {
        id: true,
        agendaNumber: true,
        letterNumber: true,
        subject: true,
        sender: true,
        filePath: true,
        createdAt: true,
        letterDate: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const outgoing = await prisma.outgoingLetter.findMany({
      where: outgoingWhere,
      select: {
        id: true,
        letterNumber: true,
        subject: true,
        destination: true,
        filePath: true,
        createdAt: true,
        letterDate: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const archives = [
      ...incoming.map((l) => ({ ...l, type: "masuk" as const, origin: l.sender })),
      ...outgoing.map((l) => ({ ...l, type: "keluar" as const, origin: l.destination })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(archives);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/backup", authenticateToken, async (req, res) => {
  try {
    const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
    const backupDir = path.resolve(process.cwd(), "backups");

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ message: "Database file tidak ditemukan." });
    }

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const backupPath = path.join(backupDir, `backup_${timestamp}.db`);

    fs.copyFileSync(dbPath, backupPath);

    res.json({ success: true, filename: `backup_${timestamp}.db` });
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ message: "Gagal membuat backup database." });
  }
});

export default router;
