import { useEffect, useState } from "react";
import type React from "react";
import { useAuth } from "@/src/lib/AuthContext";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download,
  Trash2,
  Edit2,
  ExternalLink,
  MailCheck,
  Loader2,
  FileText
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function OutgoingLetters() {
  const { token, user } = useAuth();
  const [letters, setLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<any>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editLetter, setEditLetter] = useState<any>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    letterNumber: "",
    letterDate: "",
    destination: "",
    subject: "",
    signer: "",
  });

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLetter, setDeleteLetter] = useState<any>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    letterNumber: "",
    letterDate: format(new Date(), "yyyy-MM-dd"),
    destination: "",
    subject: "",
    signer: "",
  });

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const res = await fetch("/api/outgoing", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setLetters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("data", JSON.stringify(formData));
      if (file) {
        data.append("file", file);
      }

      const res = await fetch("/api/outgoing", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        body: data
      });
      if (res.ok) {
        setOpen(false);
        fetchLetters();
        setFormData({
          letterNumber: "",
          letterDate: format(new Date(), "yyyy-MM-dd"),
          destination: "",
          subject: "",
          signer: "",
        });
        setFile(null);
        toast.success("Surat keluar berhasil disimpan");
      } else {
        toast.error("Gagal menyimpan data");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLetter) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/outgoing/${editLetter.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });
      if (!res.ok) {
        toast.error("Gagal menyimpan data");
        return;
      }
      setEditOpen(false);
      setEditLetter(null);
      fetchLetters();
      toast.success("Data surat berhasil diperbarui");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan data");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteLetter) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/outgoing/${deleteLetter.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Gagal menyimpan data");
        return;
      }
      setDeleteOpen(false);
      setDeleteLetter(null);
      fetchLetters();
      toast.success("Surat berhasil dihapus");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan data");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openPreview = (letter: any) => {
    setPreviewLetter(letter);
    setPreviewOpen(true);
  };

  const openEdit = (letter: any) => {
    setEditLetter(letter);
    setEditFormData({
      letterNumber: letter.letterNumber || "",
      letterDate: letter.letterDate ? format(new Date(letter.letterDate), "yyyy-MM-dd") : "",
      destination: letter.destination || "",
      subject: letter.subject || "",
      signer: letter.signer || "",
    });
    setEditOpen(true);
  };

  const openDeleteConfirm = (letter: any) => {
    setDeleteLetter(letter);
    setDeleteOpen(true);
  };

  const filteredLetters = letters.filter(l => 
    l.subject?.toLowerCase().includes(search.toLowerCase()) ||
    l.destination?.toLowerCase().includes(search.toLowerCase()) ||
    l.letterNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLetters.length / pageSize);
  const paginatedLetters = filteredLetters.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Surat Keluar</h1>
          <p className="text-sm text-slate-500 mt-1">Registrasi dan dokumentasi surat dinas keluar.</p>
        </div>
        {(user?.role === "ADMIN" || user?.role === "SEKRETARIS") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="bg-primary text-primary-foreground h-9 px-4 text-sm font-medium rounded-md inline-flex items-center justify-center hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4 mr-1.5" />
              Terbitkan Surat
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Registrasi Surat Keluar</DialogTitle>
                  <DialogDescription>Penomoran dan dokumentasi arsip keluar</DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Nomor Surat</Label>
                      <Input required placeholder="W20-A/123/..." className="h-9 rounded-md" value={formData.letterNumber} onChange={(e) => setFormData({...formData, letterNumber: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Tanggal Surat</Label>
                      <Input required type="date" className="h-9 rounded-md" value={formData.letterDate} onChange={(e) => setFormData({...formData, letterDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Tujuan Surat</Label>
                    <Input required placeholder="Instansi atau perorangan..." className="h-9 rounded-md" value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Perihal / Hal</Label>
                    <Input required placeholder="Isi perihal..." className="h-9 rounded-md" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Penandatangan</Label>
                    <Input required placeholder="Nama Pejabat..." className="h-9 rounded-md" value={formData.signer} onChange={(e) => setFormData({...formData, signer: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Unggah Dokumen (PDF/DOCX)</Label>
                    <Input 
                      type="file" 
                      className="h-9 rounded-md" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-9 text-sm font-medium rounded-md">Batal</Button>
                  <Button disabled={submitting} type="submit" className="h-9 px-4 text-sm font-medium rounded-md">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MailCheck className="w-4 h-4 mr-2" />}
                    Simpan & Terbit
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Detail Surat Keluar</DialogTitle>
            <DialogDescription>Informasi lengkap dokumen</DialogDescription>
          </DialogHeader>
          {previewLetter && (
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Nomor Surat</Label>
                <p className="font-mono text-sm text-slate-900">{previewLetter.letterNumber}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Tanggal Surat</Label>
                <p className="text-sm text-slate-700">{format(new Date(previewLetter.letterDate), "dd MMMM yyyy", { locale: id })}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Tujuan</Label>
                <p className="text-sm text-slate-700">{previewLetter.destination}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Perihal</Label>
                <p className="text-sm text-slate-700">{previewLetter.subject}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Penandatangan</Label>
                <p className="text-sm text-slate-700">{previewLetter.signer}</p>
              </div>
              {previewLetter.filePath && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Dokumen Terlampir</Label>
                  <a
                    href={previewLetter.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka File
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="px-6 py-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setPreviewOpen(false)} className="h-9 text-sm font-medium rounded-md">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Registrasi</DialogTitle>
              <DialogDescription>Perbarui data surat keluar</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Nomor Surat</Label>
                  <Input required placeholder="W20-A/123/..." className="h-9 rounded-md" value={editFormData.letterNumber} onChange={(e) => setEditFormData({...editFormData, letterNumber: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Tanggal Surat</Label>
                  <Input required type="date" className="h-9 rounded-md" value={editFormData.letterDate} onChange={(e) => setEditFormData({...editFormData, letterDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Tujuan Surat</Label>
                <Input required placeholder="Instansi atau perorangan..." className="h-9 rounded-md" value={editFormData.destination} onChange={(e) => setEditFormData({...editFormData, destination: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Perihal / Hal</Label>
                <Input required placeholder="Isi perihal..." className="h-9 rounded-md" value={editFormData.subject} onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Penandatangan</Label>
                <Input required placeholder="Nama Pejabat..." className="h-9 rounded-md" value={editFormData.signer} onChange={(e) => setEditFormData({...editFormData, signer: e.target.value})} />
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="h-9 text-sm font-medium rounded-md">Batal</Button>
              <Button disabled={editSubmitting} type="submit" className="h-9 px-4 text-sm font-medium rounded-md">
                {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Hapus Data</DialogTitle>
            <DialogDescription>Konfirmasi penghapusan surat</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-700">
              Apakah Anda yakin ingin menghapus surat ini?
            </p>
            {deleteLetter && (
              <div className="bg-red-50 border border-red-100 rounded-md p-3 space-y-1">
                <p className="font-mono text-xs text-red-700">{deleteLetter.letterNumber}</p>
                <p className="text-xs text-red-600">{deleteLetter.subject}</p>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Tindakan ini tidak dapat dibatalkan. Data surat akan dihapus secara permanen.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} className="h-9 text-sm font-medium rounded-md">Batal</Button>
            <Button disabled={deleteSubmitting} type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 text-sm font-medium rounded-md">
              {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border border-slate-200 shadow-sm rounded-lg bg-white">
        <CardHeader className="border-b border-slate-100 p-4">
           <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Cari nomor surat, tujuan, atau perihal..." 
                  className="pl-9 h-9 text-sm rounded-md" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full lg:w-auto">
                 <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3 text-sm font-medium rounded-md">
                    <Filter className="w-4 h-4" />
                    Filter
                 </Button>
                 <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3 text-sm font-medium rounded-md">
                    <Download className="w-4 h-4" />
                    Export
                 </Button>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100">
                  <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Nomor Surat</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Hal / Perihal</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Tujuan</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Tanggal</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 px-4 py-3">Penandatangan</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 px-4 py-3">Opsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                       <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">Memuat data...</span>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLetters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                       <div className="flex flex-col items-center justify-center gap-2 py-8">
                          <MailCheck className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-700">Belum Ada Surat Keluar</p>
                          <p className="text-xs text-slate-500">Klik tombol terbitkan surat untuk memulai.</p>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLetters.map((letter) => (
                    <TableRow key={letter.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                      <TableCell className="px-4 py-3 text-sm">
                        <span className="font-mono text-sm text-slate-900">
                          {letter.letterNumber}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        <span className="text-slate-800 line-clamp-1">{letter.subject}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">
                        {letter.destination}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-500">
                        {format(new Date(letter.letterDate), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                         <Badge variant="outline" className="text-xs px-2 py-0.5 rounded border-slate-200 text-slate-600">
                            {letter.signer}
                         </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 inline-flex items-center justify-center rounded-md hover:bg-slate-100">
                              <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-md shadow-md border-slate-200 p-1">
                             <DropdownMenuItem className="gap-2 text-sm py-2 rounded-md cursor-pointer" onClick={() => openPreview(letter)}>
                                <ExternalLink className="w-4 h-4" /> Lihat Dokumen
                             </DropdownMenuItem>
                             <DropdownMenuItem className="gap-2 text-sm py-2 rounded-md cursor-pointer" onClick={() => openEdit(letter)}>
                                <Edit2 className="w-4 h-4" /> Edit Registrasi
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="my-1" />
                             <DropdownMenuItem className="gap-2 text-sm py-2 rounded-md text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer" onClick={() => openDeleteConfirm(letter)}>
                                <Trash2 className="w-4 h-4" /> Hapus Data
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-slate-500">
              Menampilkan {filteredLetters.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredLetters.length)} dari {filteredLetters.length} surat
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium rounded-md" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium rounded-md" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
