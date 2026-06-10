import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Import Routes
import authRoutes from "./backend/routes/auth";
import userRoutes from "./backend/routes/user";
import incomingRoutes from "./backend/routes/incoming";
import outgoingRoutes from "./backend/routes/outgoing";
import dispositionRoutes from "./backend/routes/disposition";
import reportRoutes from "./backend/routes/report";
import dashboardRoutes from "./backend/routes/dashboard";
import settingsRoutes from "./backend/routes/settings";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "80");

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // --- API Routes ---
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/incoming", incomingRoutes);
  app.use("/api/outgoing", outgoingRoutes);
  app.use("/api/dispositions", dispositionRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/settings", settingsRoutes);

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "SIMARS ONLINE", time: new Date().toISOString() });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SIMARS] Server berjalan di http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical Failure:", err);
});
