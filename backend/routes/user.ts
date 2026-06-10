import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../services/db";
import { authenticateToken, checkRole } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/list", authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /subordinates - MUST be before /:id route
router.get("/subordinates", authenticateToken, async (req: any, res) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.id;

    if (role === "ADMIN" || role === "PIMPINAN") {
      // Return semua user aktif kecuali diri sendiri
      const users = await prisma.user.findMany({
        where: { isActive: true, id: { not: userId } },
        select: { id: true, name: true, role: true, username: true }
      });
      return res.json(users);
    } else {
      // Return hanya bawahan langsung
      const users = await prisma.user.findMany({
        where: { supervisorId: userId, isActive: true },
        select: { id: true, name: true, role: true, username: true }
      });
      return res.json(users);
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role,
        isActive: true
      }
    });
    res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat user baru." });
  }
});

router.put("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui user." });
  }
});

router.delete("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    // Soft delete or deactivate
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: "User dinonaktifkan." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus user." });
  }
});

router.patch("/:id/activate", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: true }
    });
    res.json({ message: "User berhasil diaktifkan." });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengaktifkan user." });
  }
});

export default router;
