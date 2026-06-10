var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express9 = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_cors = __toESM(require("cors"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);

// backend/routes/auth.ts
var import_express = require("express");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);

// backend/services/db.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// backend/routes/auth.ts
var router = (0, import_express.Router)();
var JWT_SECRET = process.env.JWT_SECRET;
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
    const isPasswordValid = await import_bcryptjs.default.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password salah." });
    }
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
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
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/logout", async (req, res) => {
  res.json({ message: "Berhasil keluar." });
});
var auth_default = router;

// backend/routes/user.ts
var import_express2 = require("express");
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);

// backend/middleware/auth.ts
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
var JWT_SECRET2 = process.env.JWT_SECRET;
if (!JWT_SECRET2) {
  throw new Error("JWT_SECRET environment variable is required. Set it in your .env file.");
}
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Sesi anda telah berakhir, silahkan login kembali." });
  import_jsonwebtoken2.default.verify(token, JWT_SECRET2, (err, user) => {
    if (err) return res.status(403).json({ message: "Akses ditolak atau token kadaluarsa." });
    req.user = user;
    next();
  });
};
var checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk melakukan aksi ini." });
    }
    next();
  };
};

// backend/routes/user.ts
var router2 = (0, import_express2.Router)();
router2.get("/", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router2.get("/list", authenticateToken, async (req, res) => {
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
router2.post("/", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    const hashedPassword = await import_bcryptjs2.default.hash(password, 10);
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
router2.put("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    if (password) {
      data.password = await import_bcryptjs2.default.hash(password, 10);
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
router2.delete("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: "User dinonaktifkan." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus user." });
  }
});
router2.patch("/:id/activate", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
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
var user_default = router2;

// backend/routes/incoming.ts
var import_express3 = require("express");
var import_zod = require("zod");

// backend/middleware/upload.ts
var import_multer = __toESM(require("multer"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var uploadDir = import_path.default.join(process.cwd(), "uploads");
if (!import_fs.default.existsSync(uploadDir)) {
  import_fs.default.mkdirSync(uploadDir, { recursive: true });
}
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + import_path.default.extname(file.originalname));
  }
});
var fileFilter = (req, file, cb) => {
  const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Gunakan PDF, DOCX, atau Gambar."), false);
  }
};
var upload = (0, import_multer.default)({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB
});

// backend/routes/incoming.ts
var router3 = (0, import_express3.Router)();
var incomingLetterSchema = import_zod.z.object({
  agendaNumber: import_zod.z.string().min(1, "Nomor agenda wajib diisi"),
  letterNumber: import_zod.z.string().min(1, "Nomor surat wajib diisi"),
  letterDate: import_zod.z.string().min(1, "Tanggal surat wajib diisi"),
  receivedDate: import_zod.z.string().min(1, "Tanggal terima wajib diisi"),
  sender: import_zod.z.string().min(1, "Pengirim wajib diisi"),
  subject: import_zod.z.string().min(1, "Perihal wajib diisi"),
  classification: import_zod.z.enum(["DINAS", "KEUANGAN", "KEPEGAWAIAN", "TEKNIS"]),
  nature: import_zod.z.enum(["BIASA", "PENTING", "SEGERA", "RAHASIA"]).default("BIASA"),
  description: import_zod.z.string().optional()
});
router3.get("/next-agenda", authenticateToken, async (req, res) => {
  try {
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const prefix = `AGD/${currentYear}/`;
    const latest = await prisma.incomingLetter.findFirst({
      where: { agendaNumber: { startsWith: prefix } },
      orderBy: { agendaNumber: "desc" }
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
router3.get("/", authenticateToken, async (req, res) => {
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
router3.post("/", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), upload.single("file"), async (req, res) => {
  try {
    const rawData = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;
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
        userId: req.user.id,
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
router3.put("/:id", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), async (req, res) => {
  try {
    const letter = await prisma.incomingLetter.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        letterDate: req.body.letterDate ? new Date(req.body.letterDate) : void 0,
        receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : void 0
      }
    });
    res.json(letter);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui surat." });
  }
});
router3.delete("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    await prisma.incomingLetter.delete({ where: { id: req.params.id } });
    res.json({ message: "Surat berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus surat." });
  }
});
var incoming_default = router3;

// backend/routes/outgoing.ts
var import_express4 = require("express");
var import_zod2 = require("zod");
var router4 = (0, import_express4.Router)();
var outgoingLetterSchema = import_zod2.z.object({
  letterNumber: import_zod2.z.string().min(1, "Nomor surat wajib diisi"),
  letterDate: import_zod2.z.string().min(1, "Tanggal surat wajib diisi"),
  destination: import_zod2.z.string().min(1, "Tujuan wajib diisi"),
  subject: import_zod2.z.string().min(1, "Perihal wajib diisi"),
  signer: import_zod2.z.string().min(1, "Penandatangan wajib diisi"),
  description: import_zod2.z.string().optional()
});
router4.get("/", authenticateToken, async (req, res) => {
  try {
    const letters = await prisma.outgoingLetter.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(letters);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router4.post("/", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), upload.single("file"), async (req, res) => {
  try {
    const rawData = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;
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
        userId: req.user.id,
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
router4.put("/:id", authenticateToken, checkRole(["ADMIN", "SEKRETARIS"]), async (req, res) => {
  try {
    const letter = await prisma.outgoingLetter.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        letterDate: req.body.letterDate ? new Date(req.body.letterDate) : void 0
      }
    });
    res.json(letter);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui surat." });
  }
});
router4.delete("/:id", authenticateToken, checkRole(["ADMIN"]), async (req, res) => {
  try {
    await prisma.outgoingLetter.delete({ where: { id: req.params.id } });
    res.json({ message: "Surat berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus surat." });
  }
});
var outgoing_default = router4;

// backend/routes/disposition.ts
var import_express5 = require("express");
var import_zod3 = require("zod");
var router5 = (0, import_express5.Router)();
var dispositionSchema = import_zod3.z.object({
  incomingLetterId: import_zod3.z.string().min(1, "ID surat masuk wajib diisi"),
  toUserId: import_zod3.z.string().min(1, "Tujuan disposisi wajib diisi"),
  instruction: import_zod3.z.string().min(1, "Instruksi wajib diisi"),
  deadline: import_zod3.z.string().optional(),
  status: import_zod3.z.enum(["PENDING", "PROSES", "SELESAI"]).default("PENDING")
});
router5.get("/", authenticateToken, async (req, res) => {
  try {
    const where = {};
    if (req.user.role === "STAFF") {
      where.toUserId = req.user.id;
    } else if (req.user.role === "PIMPINAN") {
      where.fromUserId = req.user.id;
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
router5.post("/", authenticateToken, checkRole(["PIMPINAN", "ADMIN"]), async (req, res) => {
  try {
    const parsed = dispositionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Data tidak valid", errors: parsed.error.flatten().fieldErrors });
    }
    const { toUserId, instruction, incomingLetterId, deadline, status } = parsed.data;
    const disposition = await prisma.disposition.create({
      data: {
        incomingLetterId,
        fromUserId: req.user.id,
        toUserId,
        instruction,
        status,
        deadline: deadline ? new Date(deadline) : null
      }
    });
    await prisma.notification.create({
      data: {
        userId: toUserId,
        title: "Disposisi Baru",
        message: `Anda menerima instruksi disposisi baru: ${instruction.substring(0, 50)}...`,
        link: "/disposisi"
      }
    });
    const targetUser = await prisma.user.findUnique({ where: { id: toUserId }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: req.user.id,
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
router5.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status, notes, result } = req.body;
    const combinedNotes = result ? `${notes}

[Hasil]: ${result}` : notes;
    const disposition = await prisma.disposition.update({
      where: { id: req.params.id },
      data: { status, notes: combinedNotes, updatedAt: /* @__PURE__ */ new Date() },
      include: {
        incomingLetter: { select: { subject: true } },
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } }
      }
    });
    if (status === "SELESAI" && disposition.fromUserId) {
      await prisma.notification.create({
        data: {
          userId: disposition.fromUserId,
          title: "Disposisi Selesai",
          message: `${disposition.toUser.name} telah menyelesaikan tugas: ${disposition.incomingLetter.subject.substring(0, 60)}${notes ? ` \u2014 "${notes.substring(0, 50)}"` : ""}`,
          link: "/disposisi"
        }
      });
    }
    if (status === "PROSES" && disposition.fromUserId) {
      await prisma.notification.create({
        data: {
          userId: disposition.fromUserId,
          title: "Disposisi Sedang Diproses",
          message: `${disposition.toUser.name} sedang menindaklanjuti: ${disposition.incomingLetter.subject.substring(0, 60)}${notes ? ` \u2014 "${notes.substring(0, 50)}"` : ""}`,
          link: "/disposisi"
        }
      });
    }
    res.json(disposition);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui status disposisi." });
  }
});
var disposition_default = router5;

// backend/routes/report.ts
var import_express6 = require("express");
var router6 = (0, import_express6.Router)();
router6.get("/incoming", authenticateToken, checkRole(["ADMIN", "PIMPINAN", "SEKRETARIS"]), async (req, res) => {
  const { startDate, endDate, userId } = req.query;
  try {
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (userId && userId !== "all") {
      where.dispositions = { some: { toUserId: userId } };
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
router6.get("/outgoing", authenticateToken, checkRole(["ADMIN", "PIMPINAN", "SEKRETARIS"]), async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const letters = await prisma.outgoingLetter.findMany({ where });
    res.json(letters);
  } catch (error) {
    res.status(500).json({ message: "Gagal memproses laporan." });
  }
});
router6.get("/dispositions", authenticateToken, checkRole(["ADMIN", "PIMPINAN", "SEKRETARIS"]), async (req, res) => {
  const { startDate, endDate, userId } = req.query;
  try {
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (userId && userId !== "all") {
      where.toUserId = userId;
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
var report_default = router6;

// backend/routes/dashboard.ts
var import_express7 = require("express");
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var router7 = (0, import_express7.Router)();
router7.get("/stats", authenticateToken, async (req, res) => {
  try {
    const today = /* @__PURE__ */ new Date();
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
    let userStats;
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
      userStats = users.map((u) => ({
        name: u.name,
        completed: u.dispositionsTo.filter((d) => d.status === "SELESAI").length,
        pending: u.dispositionsTo.filter((d) => d.status !== "SELESAI").length
      })).filter((u) => u.completed > 0 || u.pending > 0);
    }
    res.json({
      incoming: incomingCount,
      outgoing: outgoingCount,
      incomingToday,
      outgoingToday,
      pending,
      inProcess,
      completed,
      ...userStats ? { userStats } : {}
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router7.get("/chart", authenticateToken, async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const months = [];
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
router7.get("/activity", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
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
router7.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router7.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router7.patch("/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router7.get("/deadline-check", authenticateToken, async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    now.setHours(23, 59, 59, 999);
    const overdueDispositions = await prisma.disposition.findMany({
      where: {
        status: { not: "SELESAI" },
        deadline: { lte: now }
      },
      include: {
        toUser: { select: { id: true, name: true } },
        incomingLetter: { select: { subject: true, letterNumber: true } }
      }
    });
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    let created = 0;
    for (const disp of overdueDispositions) {
      const message = `Disposisi "${disp.incomingLetter.subject}" (${disp.incomingLetter.letterNumber}) telah melewati batas waktu.`;
      const existing = await prisma.notification.findFirst({
        where: {
          userId: disp.toUser.id,
          message: { contains: disp.incomingLetter.letterNumber },
          createdAt: { gte: twentyFourHoursAgo }
        }
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: disp.toUser.id,
            title: "Deadline Disposisi Terlewat",
            message,
            link: "/disposisi"
          }
        });
        created++;
      }
    }
    res.json({ checked: overdueDispositions.length, created });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router7.get("/archives", authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    const incomingWhere = {};
    const outgoingWhere = {};
    if (search) {
      const s = search;
      incomingWhere.OR = [
        { subject: { contains: s } },
        { letterNumber: { contains: s } },
        { sender: { contains: s } },
        { agendaNumber: { contains: s } }
      ];
      outgoingWhere.OR = [
        { subject: { contains: s } },
        { letterNumber: { contains: s } },
        { destination: { contains: s } }
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
        letterDate: true
      },
      orderBy: { createdAt: "desc" }
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
        letterDate: true
      },
      orderBy: { createdAt: "desc" }
    });
    const archives = [
      ...incoming.map((l) => ({ ...l, type: "masuk", origin: l.sender })),
      ...outgoing.map((l) => ({ ...l, type: "keluar", origin: l.destination }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(archives);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router7.post("/backup", authenticateToken, async (req, res) => {
  try {
    const dbPath = import_path2.default.resolve(process.cwd(), "prisma/dev.db");
    const backupDir = import_path2.default.resolve(process.cwd(), "backups");
    if (!import_fs2.default.existsSync(dbPath)) {
      return res.status(404).json({ message: "Database file tidak ditemukan." });
    }
    if (!import_fs2.default.existsSync(backupDir)) {
      import_fs2.default.mkdirSync(backupDir, { recursive: true });
    }
    const now = /* @__PURE__ */ new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const backupPath = import_path2.default.join(backupDir, `backup_${timestamp}.db`);
    import_fs2.default.copyFileSync(dbPath, backupPath);
    res.json({ success: true, filename: `backup_${timestamp}.db` });
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ message: "Gagal membuat backup database." });
  }
});
var dashboard_default = router7;

// backend/routes/settings.ts
var import_express8 = require("express");
var router8 = (0, import_express8.Router)();
router8.get("/", async (req, res) => {
  try {
    let settings = await prisma.appSetting.findUnique({
      where: { id: "app_settings" }
    });
    if (!settings) {
      settings = await prisma.appSetting.create({
        data: { id: "app_settings" }
      });
    }
    res.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ message: "Gagal memuat pengaturan" });
  }
});
router8.put(
  "/",
  authenticateToken,
  checkRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { name, shortName, address, phone, email, logoUrl } = req.body;
      const settings = await prisma.appSetting.upsert({
        where: { id: "app_settings" },
        update: {
          ...name !== void 0 && { name },
          ...shortName !== void 0 && { shortName },
          ...address !== void 0 && { address },
          ...phone !== void 0 && { phone },
          ...email !== void 0 && { email },
          ...logoUrl !== void 0 && { logoUrl }
        },
        create: {
          id: "app_settings",
          name: name || "Pengadilan Agama Pasarwajo",
          shortName: shortName || "PA Pasarwajo",
          address: address || "Jl. Poros Pasarwajo, Kab. Buton, Sulawesi Tenggara",
          phone: phone || "-",
          email: email || "-",
          logoUrl: logoUrl || null
        }
      });
      res.json(settings);
    } catch (err) {
      console.error("Error updating settings:", err);
      res.status(500).json({ message: "Gagal menyimpan pengaturan" });
    }
  }
);
var settings_default = router8;

// server.ts
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express9.default)();
  const PORT = parseInt(process.env.PORT || "80");
  app.use((0, import_cors.default)());
  app.use(import_express9.default.json());
  app.use(import_express9.default.urlencoded({ extended: true }));
  app.use("/uploads", import_express9.default.static(import_path3.default.join(process.cwd(), "uploads")));
  app.use("/api/auth", auth_default);
  app.use("/api/users", user_default);
  app.use("/api/incoming", incoming_default);
  app.use("/api/outgoing", outgoing_default);
  app.use("/api/dispositions", disposition_default);
  app.use("/api/reports", report_default);
  app.use("/api/dashboard", dashboard_default);
  app.use("/api/settings", settings_default);
  app.get("/api/health", (req, res) => {
    res.json({ status: "SIMARS ONLINE", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path3.default.join(process.cwd(), "dist");
    app.use(import_express9.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path3.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SIMARS] Server berjalan di http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Critical Failure:", err);
});
//# sourceMappingURL=server.cjs.map
