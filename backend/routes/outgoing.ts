import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/db";
import { authenticateToken, checkRole, AuthRequest } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

const outgoingLetterSchema = z.object({
  letterNumber: z.string().min(1, "Nomor surat wajib diisi"),
  letterDate: z.string().min(1, "Tanggal surat wajib diisi"),
  destination: z.string().min(1, "Tujuan wajib diisi"),
  subject: z.string().min(1, "Perihal wajib diisi"),
  signer: z.string().min(1, "Penandatangan wajib diisi"),
  description: z.string().optional(),
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    const letters = await prisma.outgoingLetter.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(letters);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const rawData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const parsed = outgoingLetterSchema.safeParse(rawData);

    if (!parsed.success) {
      return res.status(400).json({ message: "Data tidak valid", errors: parsed.error.flatten().fieldErrors });
    }

    const letterData = parsed.data;
    const letter = await prisma.outgoingLetter.create({
      data: {
        letterNumber: letterData.letterNumber,
        letterDate: new Date(letterData.letterDate),
        destination: letterData.destination,
        subject: letterData.subject,
        signer: letterData.signer,
        description: letterData.description,
        filePath: req.file ? `/uploads/${req.file.filename}` : null
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: "CREATE",
        entity: "OUTGOING_LETTER",
        entityId: letter.id,
        details: `Menginput surat keluar: ${letter.letterNumber}`
      }
    });

    res.status(201).json(letter);
  } catch (error) {
    res.status(500).json({ message: "Gagal menyimpan surat keluar." });
  }
});

router.put("/:id", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), async (req, res) => {
  try {
    const letter = await prisma.outgoingLetter.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        letterDate: req.body.letterDate ? new Date(req.body.letterDate) : undefined,
      }
    });
    res.json(letter);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui surat." });
  }
});

router.delete("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    await prisma.outgoingLetter.delete({ where: { id: req.params.id } });
    res.json({ message: "Surat berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus surat." });
  }
});

export default router;
