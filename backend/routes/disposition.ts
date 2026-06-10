import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/db";
import { authenticateToken, checkRole, AuthRequest } from "../middleware/auth";

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
    const where: any = {};
    if (req.user!.role === "STAFF") {
      where.toUserId = req.user!.id;
    } else if (req.user!.role === "PIMPINAN") {
      // Pimpinan sees what they sent
      where.fromUserId = req.user!.id;
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

router.post("/", authenticateToken, checkRole(["PIMPINAN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const parsed = dispositionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Data tidak valid", errors: parsed.error.flatten().fieldErrors });
    }

    const { toUserId, instruction, incomingLetterId, deadline, status } = parsed.data;

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

    // Notify the receiver when status changes to PROSES
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
