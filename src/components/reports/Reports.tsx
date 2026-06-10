import { useEffect, useState } from "react";
import { useAuth } from "@/src/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MailQuestion,
  MailCheck,
  GitPullRequest,
  Search,
  Loader2,
  Printer,
  FileSpreadsheet,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function exportToCSV(data: any[], filename: string, columns: { key: string; label: string }[]) {
  const header = columns.map(c => c.label).join(",");
  const rows = data.map(item =>
    columns.map(c => {
      let val = c.key.split(".").reduce((obj, k) => obj?.[k], item) ?? "";
      if (typeof val === "string" && val.includes(",")) val = `"${val}"`;
      return val;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${format(new Date(), "yyyyMMdd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printAsPDF(title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const tableEls = document.querySelectorAll('[data-slot="tabs-content"] table');
  const visibleTable = Array.from(tableEls).find(el => {
    const panel = el.closest('[data-slot="tabs-content"]');
    return panel && !panel.hasAttribute('hidden');
  });
  if (!visibleTable) return;
  const printDate = format(new Date(), "dd MMMM yyyy HH:mm", { locale: id });
  printWindow.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: 'Times New Roman', serif; padding: 30px 40px; font-size: 12px; color: #000; }
      .kop { text-align: center; padding-bottom: 10px; margin-bottom: 0; }
      .kop h2 { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
      .kop h3 { margin: 4px 0 0; font-size: 14px; font-weight: normal; }
      .kop p { margin: 4px 0 0; font-size: 11px; color: #333; }
      .kop-line { border: none; border-top: 3px double #000; margin: 10px 0 20px; }
      .report-title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0 20px; text-decoration: underline; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
      th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
      th { background: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 10px; }
      .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; color: #666; }
      @media print { .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; } }
    </style></head><body>
    <div class="kop">
      <h2>PENGADILAN AGAMA PASARWAJO</h2>
      <h3>Kelas II</h3>
      <p>Jl. Laiworu No. 1, Pasarwajo, Kab. Buton, Sulawesi Tenggara 93754</p>
    </div>
    <hr class="kop-line" />
    <div class="report-title">${title}</div>
    ${visibleTable.outerHTML}
    <div class="footer">
      <span>Dicetak: ${printDate}</span>
      <span>SIMARS - Sistem Informasi Manajemen Arsip Surat</span>
    </div>
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}

export default function Reports() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("incoming");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async (type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedUserId) params.append("userId", selectedUserId);

      const res = await fetch(`/api/reports/${type}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]);

  const handleFilter = () => {
    fetchReport(activeTab);
  };

  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(format(firstDay, "yyyy-MM-dd"));
    setEndDate(format(lastDay, "yyyy-MM-dd"));
  };

  const setThisYear = () => {
    const now = new Date();
    setStartDate(`${now.getFullYear()}-01-01`);
    setEndDate(`${now.getFullYear()}-12-31`);
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    if (activeTab === "incoming") {
      exportToCSV(data, "laporan_surat_masuk", [
        { key: "agendaNumber", label: "No. Agenda" },
        { key: "letterNumber", label: "No. Surat" },
        { key: "subject", label: "Perihal" },
        { key: "sender", label: "Pengirim" },
        { key: "letterDate", label: "Tanggal" },
        { key: "classification", label: "Klasifikasi" },
        { key: "nature", label: "Sifat" },
      ]);
    } else if (activeTab === "outgoing") {
      exportToCSV(data, "laporan_surat_keluar", [
        { key: "letterNumber", label: "No. Surat" },
        { key: "subject", label: "Perihal" },
        { key: "destination", label: "Tujuan" },
        { key: "signer", label: "Penandatangan" },
        { key: "letterDate", label: "Tanggal" },
      ]);
    } else {
      exportToCSV(data, "laporan_disposisi", [
        { key: "incomingLetter.subject", label: "Surat" },
        { key: "toUser.name", label: "Kepada" },
        { key: "instruction", label: "Instruksi" },
        { key: "deadline", label: "Deadline" },
        { key: "status", label: "Status" },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Laporan</h1>
          <p className="text-sm text-slate-500 mt-1">Rekap data surat masuk, keluar, dan disposisi.</p>
        </div>
      </div>

      {/* Filter */}
      <Card className="border border-slate-200 shadow-sm rounded-lg bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium rounded-md" onClick={setThisMonth}>
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Bulan Ini
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium rounded-md" onClick={setThisYear}>
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Tahun Ini
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-1.5 flex-1">
                <Label className="text-sm font-medium text-slate-700">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-sm font-medium text-slate-700">Tanggal Akhir</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-sm font-medium text-slate-700">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-9 rounded-md">
                    <SelectValue placeholder="Semua user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua User</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleFilter}
                className="h-9 px-4 text-sm font-medium rounded-md"
              >
                <Search className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="h-9 px-4 text-sm font-medium rounded-md border-slate-200"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                Excel
              </Button>
              <Button
                onClick={() => printAsPDF(`Laporan ${activeTab === "incoming" ? "Surat Masuk" : activeTab === "outgoing" ? "Surat Keluar" : "Disposisi"}`)}
                variant="outline"
                className="h-9 px-4 text-sm font-medium rounded-md border-slate-200"
              >
                <Printer className="w-4 h-4 mr-2 text-blue-600" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="incoming" className="text-sm font-medium">
            <MailQuestion className="w-4 h-4 mr-2" />
            Surat Masuk
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="text-sm font-medium">
            <MailCheck className="w-4 h-4 mr-2" />
            Surat Keluar
          </TabsTrigger>
          <TabsTrigger value="dispositions" className="text-sm font-medium">
            <GitPullRequest className="w-4 h-4 mr-2" />
            Disposisi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <Card className="border border-slate-200 shadow-sm rounded-lg bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-4 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MailQuestion className="w-4 h-4 text-slate-500" />
                Laporan Surat Masuk
              </CardTitle>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{data.length} Data</span>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <LoadingState /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">No. Agenda</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">No. Surat</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Perihal</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Pengirim</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Tanggal</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-slate-400">Tidak ada data untuk periode ini.</TableCell></TableRow>
                    ) : data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-4 py-3 text-sm font-medium text-slate-900">{item.agendaNumber}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">{item.letterNumber}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate">{item.subject}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">{item.sender}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-500">{format(new Date(item.letterDate), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className={item.dispositions?.length > 0
                            ? "text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border-none"
                            : "text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border-none"
                          }>
                            {item.dispositions?.length > 0 ? "Disposisi" : "Menunggu"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing">
          <Card className="border border-slate-200 shadow-sm rounded-lg bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-4 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MailCheck className="w-4 h-4 text-slate-500" />
                Laporan Surat Keluar
              </CardTitle>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{data.length} Data</span>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <LoadingState /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">No. Surat</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Perihal</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Tujuan</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Penandatangan</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-sm text-slate-400">Tidak ada data untuk periode ini.</TableCell></TableRow>
                    ) : data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-4 py-3 text-sm font-medium text-slate-900">{item.letterNumber}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate">{item.subject}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">{item.destination}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">{item.signer}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-500">{format(new Date(item.letterDate), 'dd/MM/yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispositions">
          <Card className="border border-slate-200 shadow-sm rounded-lg bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-4 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-slate-500" />
                Laporan Disposisi
              </CardTitle>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{data.length} Data</span>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <LoadingState /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Surat</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Kepada</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Instruksi</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Deadline</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-sm text-slate-400">Tidak ada data untuk periode ini.</TableCell></TableRow>
                    ) : data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-4 py-3 text-sm text-slate-700 max-w-[150px] truncate">{item.incomingLetter?.subject || "-"}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">{item.toUser?.name || "-"}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{item.instruction || "-"}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-500">{item.deadline ? format(new Date(item.deadline), 'dd/MM/yyyy') : "-"}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className={
                            item.status === "SELESAI" ? "text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border-none" :
                            item.status === "PROSES" ? "text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border-none" :
                            "text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border-none"
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-16">
      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      <span className="text-sm text-slate-500">Memuat data laporan...</span>
    </div>
  );
}
