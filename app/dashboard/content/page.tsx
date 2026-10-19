// app/dashboard/content/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseNumberInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Save, FileText, RefreshCw, AlertTriangle, CheckCircle2, Eye, Banknote,
} from "lucide-react";

type SiteContent = {
    id: number;
    panitia_title: string;
    panitia_description: string;
    admin_title: string;
    admin_description: string;
    updated_at: string;
};

type TicketPrice = {
    category: string;
    price: number;
};

const DEFAULT: SiteContent = {
    id: 1,
    panitia_title: "Halaman Panitia",
    panitia_description: "Selamat datang panitia. Kelola acara Anda di sini.",
    admin_title: "Dashboard Admin",
    admin_description: "Scan tiket dan kelola kehadiran peserta.",
    updated_at: new Date().toISOString(),
};

export default function ContentPage() {
    const [form, setForm] = useState<SiteContent>(DEFAULT);
    const [prices, setPrices] = useState<TicketPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        
        // 1. Fetch Konten
        const { data: contentData, error: contentErr } = await supabase
            .from("site_content")
            .select("*")
            .eq("id", 1)
            .maybeSingle();

        if (contentErr) setError(contentErr.message);
        else if (contentData) setForm(contentData);

        // 2. Fetch Harga Tiket
        const { data: priceData, error: priceErr } = await supabase
            .from("ticket_prices")
            .select("*")
            .order("price", { ascending: true });

        if (priceErr) setError(priceErr.message);
        else setPrices(priceData ?? []);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!form.panitia_title.trim() || !form.admin_title.trim()) {
            setError("Judul tidak boleh kosong");
            return;
        }

        setSaving(true);

        // 1. Simpan Konten
        const { error: contentErr } = await supabase
            .from("site_content")
            .update({
                panitia_title: form.panitia_title.trim(),
                panitia_description: form.panitia_description.trim(),
                admin_title: form.admin_title.trim(),
                admin_description: form.admin_description.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

        if (contentErr) {
            setError(contentErr.message);
            setSaving(false);
            return;
        }

        // 2. Simpan Harga Tiket
        for (const p of prices) {
            const { error: priceErr } = await supabase
                .from("ticket_prices")
                .update({ price: p.price, updated_at: new Date().toISOString() })
                .eq("category", p.category);

            if (priceErr) {
                setError(priceErr.message);
                setSaving(false);
                return;
            }
        }

        setSuccess(true);
        setSaving(false);
        setTimeout(() => setSuccess(false), 3000);
    };

    const handleUpdatePrice = (category: string, value: string) => {
        const numValue = parseNumberInput(value);
        setPrices((prev) =>
            prev.map((p) => (p.category === category ? { ...p, price: numValue } : p))
        );
    };

    if (loading) {
        return (
            <div className="p-4 text-[#fafafa] sm:p-6 lg:p-8">
                <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                    <CardContent className="py-16 text-center">
                        <p className="text-sm text-[#737373]">Memuat data…</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 text-[#fafafa] sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Kelola Konten & Harga</h1>
                    <p className="mt-1 text-sm text-[#737373]">
                        Edit teks halaman dan atur harga tiket per kategori
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline" className="border-[#3a3a3a] text-[#fafafa]">
                    <RefreshCw size={14} className="mr-2" />
                    Refresh Data
                </Button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                
                {/* SECTION 1: HARGA TIKET (FITUR BARU) */}
                <Card className="border-[#f59e0b]/30 bg-[#0f0f0f]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[15px]">
                            <Banknote size={18} className="text-[#f59e0b]" />
                            Daftar Harga Tiket
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {prices.map((p) => (
                                <div key={p.category} className="rounded-xl border border-[#1c1c1c] bg-[#141414] p-4">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-[#a3a3a3]">
                                        Tiket {p.category}
                                    </Label>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[14px] text-[#737373]">Rp</span>
                                        <Input
                                            type="text"
                                            value={p.price === 0 ? "" : p.price.toLocaleString("id-ID")}
                                            onChange={(e) => handleUpdatePrice(p.category, e.target.value)}
                                            placeholder="0"
                                            className="border-[#262626] bg-[#0a0a0a] text-[15px] font-bold text-[#fafafa]"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-[11px] text-[#737373]">
                            *Perubahan harga akan langsung berlaku pada halaman Pendaftaran OTS.
                        </p>
                    </CardContent>
                </Card>

                {/* SECTION 2: HALAMAN PANITIA */}
                <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[15px]">
                            <FileText size={18} className="text-[#60a5fa]" />
                            Halaman Panitia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-[#a3a3a3]">Judul Halaman</Label>
                            <Input
                                value={form.panitia_title}
                                onChange={(e) => setForm({ ...form, panitia_title: e.target.value })}
                                placeholder="Halaman Panitia"
                                disabled={saving}
                                className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                            />
                        </div>
                        <div>
                            <Label className="text-[#a3a3a3]">Deskripsi</Label>
                            <textarea
                                value={form.panitia_description}
                                onChange={(e) => setForm({ ...form, panitia_description: e.target.value })}
                                placeholder="Deskripsi halaman panitia..."
                                disabled={saving}
                                rows={3}
                                className="mt-2 w-full resize-none rounded-md border border-[#262626] bg-[#141414] p-3 text-[14px] text-[#fafafa] outline-none placeholder:text-[#525252] focus:border-[#404040]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* SECTION 3: DASHBOARD ADMIN */}
                <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[15px]">
                            <Eye size={18} className="text-[#f59e0b]" />
                            Dashboard Admin
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-[#a3a3a3]">Judul Halaman</Label>
                            <Input
                                value={form.admin_title}
                                onChange={(e) => setForm({ ...form, admin_title: e.target.value })}
                                placeholder="Dashboard Admin"
                                disabled={saving}
                                className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                            />
                        </div>
                        <div>
                            <Label className="text-[#a3a3a3]">Deskripsi</Label>
                            <textarea
                                value={form.admin_description}
                                onChange={(e) => setForm({ ...form, admin_description: e.target.value })}
                                placeholder="Deskripsi dashboard admin..."
                                disabled={saving}
                                rows={3}
                                className="mt-2 w-full resize-none rounded-md border border-[#262626] bg-[#141414] p-3 text-[14px] text-[#fafafa] outline-none placeholder:text-[#525252] focus:border-[#404040]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* FEEDBACK */}
                {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#7f1d1d] bg-[#1a0a0a] px-3 py-2.5">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#f87171]" />
                        <p className="text-[12.5px] text-[#fca5a5]">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#22c55e] bg-[#0a1a0f] px-3 py-2.5">
                        <CheckCircle2 size={14} className="shrink-0 text-[#4ade80]" />
                        <p className="text-[12.5px] text-[#4ade80]">
                            Konten & Harga berhasil disimpan!
                        </p>
                    </div>
                )}

                {/* SAVE BUTTON */}
                <div className="sticky bottom-4 flex justify-end">
                    <Button
                        type="submit"
                        disabled={saving}
                        className="h-12 bg-[#f59e0b] px-6 text-[14px] font-semibold text-[#0a0a0a] hover:bg-[#fbbf24]"
                    >
                        {saving ? (
                            <>
                                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a]" />
                                Menyimpan…
                            </>
                        ) : (
                            <>
                                <Save size={16} className="mr-2" />
                                Simpan Semua Perubahan
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}