import { Router } from "express";
import { prisma } from "../services/db";
import { authenticateToken, checkRole, AuthRequest } from "../middleware/auth";
import type { Response } from "express";

const router = Router();

// GET /api/settings - public (no auth needed for reading)
router.get("/", async (req, res: Response) => {
  try {
    let settings = await prisma.appSetting.findUnique({
      where: { id: "app_settings" },
    });

    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.appSetting.create({
        data: { id: "app_settings" },
      });
    }

    res.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ message: "Gagal memuat pengaturan" });
  }
});

// PUT /api/settings - ADMIN only
router.put(
  "/",
  authenticateToken,
  checkRole(["ADMIN"]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, shortName, address, phone, email, logoUrl } = req.body;

      const settings = await prisma.appSetting.upsert({
        where: { id: "app_settings" },
        update: {
          ...(name !== undefined && { name }),
          ...(shortName !== undefined && { shortName }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(logoUrl !== undefined && { logoUrl }),
        },
        create: {
          id: "app_settings",
          name: name || "Pengadilan Agama Pasarwajo",
          shortName: shortName || "PA Pasarwajo",
          address: address || "Jl. Poros Pasarwajo, Kab. Buton, Sulawesi Tenggara",
          phone: phone || "-",
          email: email || "-",
          logoUrl: logoUrl || null,
        },
      });

      res.json(settings);
    } catch (err) {
      console.error("Error updating settings:", err);
      res.status(500).json({ message: "Gagal menyimpan pengaturan" });
    }
  }
);

export default router;
