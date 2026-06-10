import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/db";
import { authenticateToken, checkRole, AuthRequest } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

const incomingLetterSchema = z.object({
  agendaNumber: z.string().min(1, "Nomor agenda wajib diisi"),
  letterNumber: z.string().min(1, "Nomor surat wajib diisi"),
  letterDate: z.string().min(1, "Tanggal surat wajib diisi"),
  receivedDate: z.string().min(1, "Tanggal terima wajib diisi"),
  sender: z.string().min(1, "Pengirim wajib diisi"),
  subject: z.string().min(1, "Perihal wajib diisi"),
  classification: z.enum(["DINAS", "KEUANGAN", "KEPEGAWAIAN", "TEKNIS"]),
  nature: z.enum(["BIASA", "PENTING", "SEGERA", "RAHASIA"]).default("BIASA"),
  description: z.string().optional(),
});

// GET next agenda number
router.get("/next-agenda", authenticateToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `AGD/${currentYear}/`;

    const latest = await prisma.incomingLetter.findFirst({
      where: { agendaNumber: { startsWith: prefix } },
      orderBy: { agendaNumber: "desc" },
    });

    let nextSeq = 1;
    if (latest) {
      const parts = latest.agendaNumber.split("/");
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    const nextAgenda = `${prefix}${String(nextSeq).padStart(3, "0")}`;
    res.json({ agendaNumber: nextAgenda });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET all incoming letters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const letters = await prisma.incomingLetter.findMany({
      orderBy: { createdAt: "desc" },
      include: { dispositions: true }
    });
    res.json(letters);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST new incoming letter with optional file
router.post("/", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const rawData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const parsed = incomingLetterSchema.safeParse(rawData);

    if (!parsed.success) {
      return res.status(400).json({ message: "Data tidak valid", errors: parsed.error.flatten().fieldErrors });
    }

    const letterData = parsed.data;
    const letter = await prisma.incomingLetter.create({
      data: {
        agendaNumber: letterData.agendaNumber,
        letterNumber: letterData.letterNumber,
        letterDate: new Date(letterData.letterDate),
        receivedDate: new Date(letterData.receivedDate),
        sender: letterData.sender,
        subject: letterData.subject,
        classification: letterData.classification,
        nature: letterData.nature,
        description: letterData.description,
        filePath: req.file ? `/uploads/${req.file.filename}` : null
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: "CREATE",
        entity: "INCOMING_LETTER",
        entityId: letter.id,
        details: `Menginput surat masuk: ${letter.letterNumber}`
      }
    });

    res.status(201).json(letter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal menyimpan surat masuk." });
  }
});

router.put("/:id", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), async (req, res) => {
  try {
    const letter = await prisma.incomingLetter.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        letterDate: req.body.letterDate ? new Date(req.body.letterDate) : undefined,
        receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : undefined,
      }
    });
    res.json(letter);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui surat." });
  }
});

router.delete("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    await prisma.incomingLetter.delete({ where: { id: req.params.id } });
    res.json({ message: "Surat berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus surat." });
  }
});

export default router;
