import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

const dispositionSchema = z.object({
  incomingLetterId: z.string().min(1, "ID surat masuk wajib diisi"),
  toUserId: z.string().min(1, "Tujuan disposisi wajib diisi"),
  instruction: z.string().min(1, "Instruksi wajib diisi"),
  deadline: z.string().optional(),
  status: z.enum(["PENDING", "PROSES", "SELESAI"]).default("PENDING"),
});

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.id;

    let where: any = {};

    if (role === "ADMIN") {
      // Admin lihat semua
      where = {};
    } else if (role === "PIMPINAN") {
      // Pimpinan lihat yang dia kirim ATAU terima
      where = { OR: [{ fromUserId: userId }, { toUserId: userId }] };
    } else {
      // Semua role lain: lihat yang dikirim ke mereka ATAU yang mereka teruskan
      where = { OR: [{ toUserId: userId }, { fromUserId: userId }] };
    }

    const dispositions = await prisma.disposition.findMany({
      where,
      include: {
        incomingLetter: true,
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(dispositions);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parsed = dispositionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Data tidak valid", errors: parsed.error.flatten().fieldErrors });
    }

    const { toUserId, instruction, incomingLetterId, deadline, status } = parsed.data;

    // Validasi hierarki: hanya ADMIN/PIMPINAN yang boleh ke siapa saja
    const fromUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const toUser = await prisma.user.findUnique({ where: { id: toUserId } });

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (!["ADMIN", "PIMPINAN"].includes(fromUser.role) && toUser.supervisorId !== fromUser.id) {
      return res.status(403).json({ message: "Anda tidak memiliki wewenang untuk disposisi ke pengguna ini" });
    }

    const disposition = await prisma.disposition.create({
      data: {
        incomingLetterId,
        fromUserId: req.user!.id,
        toUserId,
        instruction,
        status,
        deadline: deadline ? new Date(deadline) : null,
      }
    });

    // Create Notification for target user
    await prisma.notification.create({
      data: {
        userId: toUserId,
        title: "Disposisi Baru",
        message: `Anda menerima instruksi disposisi baru: ${instruction.substring(0, 50)}...`,
        link: "/disposisi"
      }
    });

    // Create confirmation notification for sender
    const targetUser = await prisma.user.findUnique({ where: { id: toUserId }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        title: "Disposisi Terkirim",
        message: `Disposisi berhasil diteruskan kepada ${targetUser?.name || "staf"}: ${instruction.substring(0, 40)}...`,
        link: "/disposisi"
      }
    });

    res.status(201).json(disposition);
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat disposisi." });
  }
});

router.patch("/:id/status", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, notes, result } = req.body;
    // Combine notes and result into the notes field
    const combinedNotes = result
      ? `${notes}\n\n[Hasil]: ${result}`
      : notes;
    const disposition = await prisma.disposition.update({
      where: { id: req.params.id },
      data: { status, notes: combinedNotes, updatedAt: new Date() },
      include: {
        incomingLetter: { select: { subject: true } },
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      }
    });

    // Notify the sender when task is completed
    if (status === "SELESAI" && disposition.fromUserId) {
      await prisma.notification.create({
        data: {
          userId: disposition.fromUserId,
          title: "Disposisi Selesai",
          message: `${disposition.toUser.name} telah menyelesaikan tugas: ${disposition.incomingLetter.subject.substring(0, 60)}${notes ? ` — "${notes.substring(0, 50)}"` : ""}`,
          link: "/disposisi"
        }
      });
    }

    // Notify the sender when status changes to PROSES
    if (status === "PROSES" && disposition.fromUserId) {
      await prisma.notification.create({
        data: {
          userId: disposition.fromUserId,
          title: "Disposisi Sedang Diproses",
          message: `${disposition.toUser.name} sedang menindaklanjuti: ${disposition.incomingLetter.subject.substring(0, 60)}${notes ? ` — "${notes.substring(0, 50)}"` : ""}`,
          link: "/disposisi"
        }
      });
    }

    res.json(disposition);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui status disposisi." });
  }
});

export default router;