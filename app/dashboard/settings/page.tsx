// app/dashboard/settings/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Save, Upload, QrCode, Building2, CheckCircle2, AlertTriangle, Trash2,
} from "lucide-react";

type Settings = {
    id: number;
    qris_image_url: string | null;
    bank_name: string;
    bank_account_no: string;
    bank_account_name: string;
    transfer_notes: string;
};

export default function SettingsPage() {
    const [form, setForm] = useState<Settings>({
        id: 1,
        qris_image_url: null,
        bank_name: "",
        bank_account_no: "",
        bank_account_name: "",
        transfer_notes: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            const { data, error: err } = await supabase
                .from("payment_settings")
                .select("*")
                .eq("id", 1)
                .maybeSingle();
            if (err) setError(err.message);
            else if (data) setForm(data);
            setLoading(false);
        })();
    }, []);

    const handleUploadQris = async (file: File) => {
        setUploading(true);
        setError(null);

        const ext = file.name.split(".").pop() || "png";
        const fileName = `qris-${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage
            .from("payment-assets")
            .upload(fileName, file, { upsert: true, contentType: file.type });

        if (upErr) {
            setError("Upload gagal: " + upErr.message);
            setUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from("payment-assets")
            .getPublicUrl(fileName);

        setForm((prev) => ({ ...prev, qris_image_url: urlData.publicUrl }));
        setUploading(false);
    };

    const handleDeleteQris = async () => {
        if (!form.qris_image_url) return;
        if (!confirm("Hapus gambar QRIS?")) return;
        setForm((prev) => ({ ...prev, qris_image_url: null }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setSaving(true);

        const { error: err } = await supabase
            .from("payment_settings")
            .update({
                qris_image_url: form.qris_image_url,
                bank_name: form.bank_name.trim(),
                bank_account_no: form.bank_account_no.trim(),
                bank_account_name: form.bank_account_name.trim(),
                transfer_notes: form.transfer_notes.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

        if (err) {
            setError(err.message);
            setSaving(false);
            return;
        }

        setSuccess(true);
        setSaving(false);
        setTimeout(() => setSuccess(false), 3000);
    };

    if (loading) {
        return (
            <div className="p-4 text-[#fafafa] sm:p-6 lg:p-8">
                <p className="text-sm text-[#737373]">Memuat pengaturan...</p>
            </div>
        );
    }

    return (
        <div className="p-4 text-[#fafafa] sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan Pembayaran</h1>
                <p className="mt-1 text-sm text-[#737373]">
                    Atur QRIS dan rekening bank untuk pendaftaran OTS
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[15px]">
                            <QrCode size={18} className="text-[#a78bfa]" />
                            QRIS Merchant
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {form.qris_image_url ? (
                            <div className="flex flex-col items-center gap-4 sm:flex-row">
                                <div className="rounded-xl bg-white p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={form.qris_image_url}
                                        alt="QRIS"
                                        className="h-48 w-48 object-contain"
                                    />
                                </div>
                                <div className="flex-1 space-y-2 text-center sm:text-left">
                                    <p className="text-[13px] text-[#a3a3a3]">
                                        Gambar QRIS sudah di-upload
                                    </p>
                                    <div className="flex justify-center gap-2 sm:justify-start">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileRef.current?.click()}
                                            disabled={uploading}
                                            className="border-[#3a3a3a] text-[#fafafa]"
                                        >
                                            <Upload size={14} className="mr-2" />
                                            Ganti
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleDeleteQris}
                                            className="border-[#3a3a3a] text-[#f87171] hover:bg-[#7f1d1d]/20"
                                        >
                                            <Trash2 size={14} className="mr-2" />
                                            Hapus
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#3a3a3a] transition-colors hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/5"
                            >
                                {uploading ? (
                                    <>
                                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#a78bfa]/30 border-t-[#a78bfa]" />
                                        <p className="mt-3 text-[13px] text-[#a3a3a3]">Meng-upload...</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={32} className="text-[#525252]" />
                                        <p className="mt-3 text-[13px] font-medium text-[#a3a3a3]">
                                            Klik untuk upload gambar QRIS
                                        </p>
                                        <p className="mt-1 text-[11px] text-[#525252]">
                                            Format PNG/JPG, disarankan ukuran 500x500 atau lebih besar
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadQris(file);
                                e.target.value = "";
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[15px]">
                            <Building2 size={18} className="text-[#60a5fa]" />
                            Rekening Bank
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label className="text-[#a3a3a3]">Nama Bank</Label>
                                <Input
                                    value={form.bank_name}
                                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                                    placeholder="BCA / Mandiri / BNI"
                                    disabled={saving}
                                    className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                                />
                            </div>
                            <div>
                                <Label className="text-[#a3a3a3]">Nomor Rekening</Label>
                                <Input
                                    value={form.bank_account_no}
                                    onChange={(e) => setForm({ ...form, bank_account_no: e.target.value.replace(/\D/g, "") })}
                                    placeholder="1234567890"
                                    inputMode="numeric"
                                    disabled={saving}
                                    className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label className="text-[#a3a3a3]">Atas Nama</Label>
                                <Input
                                    value={form.bank_account_name}
                                    onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                                    placeholder="Nama pemilik rekening"
                                    disabled={saving}
                                    className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label className="text-[#a3a3a3]">Catatan Transfer</Label>
                                <textarea
                                    value={form.transfer_notes}
                                    onChange={(e) => setForm({ ...form, transfer_notes: e.target.value })}
                                    placeholder="Contoh: Transfer sesuai nominal, simpan bukti transfer"
                                    disabled={saving}
                                    rows={2}
                                    className="mt-2 w-full resize-none rounded-md border border-[#262626] bg-[#141414] p-3 text-[14px] text-[#fafafa] outline-none placeholder:text-[#525252] focus:border-[#404040]"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#7f1d1d] bg-[#1a0a0a] px-3 py-2.5">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#f87171]" />
                        <p className="text-[12.5px] text-[#fca5a5]">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#22c55e] bg-[#0a1a0f] px-3 py-2.5">
                        <CheckCircle2 size={14} className="shrink-0 text-[#4ade80]" />
                        <p className="text-[12.5px] text-[#4ade80]">Pengaturan berhasil disimpan!</p>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={saving || uploading}
                        className="h-12 bg-[#f59e0b] px-6 text-[14px] font-semibold text-[#0a0a0a] hover:bg-[#fbbf24]"
                    >
                        {saving ? (
                            <>
                                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a]" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save size={16} className="mr-2" />
                                Simpan Pengaturan
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}