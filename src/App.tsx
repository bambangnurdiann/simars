import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import type React from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import { Toaster } from "sonner";
import { Lock, User as UserIcon, Loader2, FileBarChart, MailOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import DashboardOverview from "./components/dashboard/DashboardOverview";
import { useSettings } from "./lib/useSettings";
import IncomingLetters from "./components/letters/IncomingLetters";
import OutgoingLetters from "./components/letters/OutgoingLetters";
import Dispositions from "./components/disposition/Dispositions";
import UserManagement from "./components/users/UserManagement";
import Reports from "./components/reports/Reports";
import DigitalArchive from "./components/archive/DigitalArchive";
import AuditLog from "./components/audit/AuditLog";
import Settings from "./components/settings/Settings";

const LoginPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-background">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border dark:border-slate-700 p-8">
          <div className="text-center mb-8">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl mx-auto mb-4 object-contain" />
            ) : (
              <div className="w-14 h-14 bg-[#1B5E20] rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-[#C9A84C] font-bold text-xl">S</span>
              </div>
            )}
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">SIMARS</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistem Informasi Manajemen Arsip Surat</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{settings.name}</p>
          </div>
          <LoginForm />
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          &copy; {new Date().getFullYear()} {settings.shortName} Kelas II
        </p>
      </div>
    </div>
  );
};

function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login gagal");
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Username</label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            className="pl-9 h-10" 
            placeholder="Masukkan username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            type="password" 
            className="pl-9 h-10" 
            placeholder="Masukkan password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-lg">
          {error}
        </div>
      )}
      <Button 
        type="submit" 
        className="w-full h-10 font-medium" 
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Masuk
      </Button>
    </form>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Ringkasan data surat dan disposisi.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/laporan")}>
            <FileBarChart className="w-4 h-4 mr-1.5" />
            Laporan
          </Button>
          <Button size="sm" onClick={() => navigate("/surat-masuk")}>
            <MailOpen className="w-4 h-4 mr-1.5" />
            Input Surat
          </Button>
        </div>
      </div>
      <DashboardOverview />
    </div>
  );
};


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/surat-masuk" element={<ProtectedRoute><IncomingLetters /></ProtectedRoute>} />
          <Route path="/surat-keluar" element={<ProtectedRoute><OutgoingLetters /></ProtectedRoute>} />
          <Route path="/disposisi" element={<ProtectedRoute><Dispositions /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/laporan" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/arsip" element={<ProtectedRoute><DigitalArchive /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
          <Route path="/pengaturan" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
