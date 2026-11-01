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
        
        const { data: contentData, error: contentErr } = await supabase
            .from("site_content")
            .select("*")
            .eq("id", 1)
            .maybeSingle();

        if (contentErr) setError(contentErr.message);
        else if (contentData) setForm(contentData);

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

        for (const p of prices) {
            await supabase
                .from("ticket_prices")
                .update({ price: p.price, updated_at: new Date().toISOString() })
                .eq("category", p.category);
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
                        <p className="text-sm text-[#737373]">Memuat data...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 text-[#fafafa] sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kelola Konten & Harga</h1>
                    <p className="mt-1 text-[13px] text-[#737373] sm:text-sm">
                        Edit teks halaman dan atur harga tiket
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline" className="w-full border-[#3a3a3a] text-[#fafafa] sm:w-auto">
                    <RefreshCw size={14} className="mr-2" />
                    Refresh
                </Button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 pb-20 sm:pb-0">
                
                {/* HARGA TIKET */}
                <Card className="border-[#f59e0b]/30 bg-[#0f0f0f]">
                    <CardHeader className="p-4 sm:p-6 sm:pb-4">
                        <CardTitle className="flex items-center gap-2 text-[14px] sm:text-[15px]">
                            <Banknote size={16} className="text-[#f59e0b]" />
                            Daftar Harga Tiket
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                            {prices.map((p) => (
                                <div key={p.category} className="rounded-xl border border-[#1c1c1c] bg-[#141414] p-3 sm:p-4">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#a3a3a3] sm:text-[11px]">
                                        Tiket {p.category}
                                    </Label>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[13px] text-[#737373] sm:text-[14px]">Rp</span>
                                        <Input
                                            type="text"
                                            value={p.price === 0 ? "" : p.price.toLocaleString("id-ID")}
                                            onChange={(e) => handleUpdatePrice(p.category, e.target.value)}
                                            placeholder="0"
                                            className="h-9 border-[#262626] bg-[#0a0a0a] text-[14px] font-bold text-[#fafafa] sm:h-10 sm:text-[15px]"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* HALAMAN PANITIA */}
                <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                    <CardHeader className="p-4 sm:p-6 sm:pb-4">
                        <CardTitle className="flex items-center gap-2 text-[14px] sm:text-[15px]">
                            <FileText size={16} className="text-[#60a5fa]" />
                            Halaman Panitia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <div>
                            <Label className="text-[12px] text-[#a3a3a3] sm:text-[13px]">Judul</Label>
                            <Input
                                value={form.panitia_title}
                                onChange={(e) => setForm({ ...form, panitia_title: e.target.value })}
                                disabled={saving}
                                className="mt-1.5 border-[#262626] bg-[#141414] text-[14px]"
                            />
                        </div>
                        <div>
                            <Label className="text-[12px] text-[#a3a3a3] sm:text-[13px]">Deskripsi</Label>
                            <textarea
                                value={form.panitia_description}
                                onChange={(e) => setForm({ ...form, panitia_description: e.target.value })}
                                disabled={saving}
                                rows={3}
                                className="mt-1.5 w-full resize-none rounded-md border border-[#262626] bg-[#141414] p-3 text-[13px] text-[#fafafa] sm:text-[14px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* DASHBOARD ADMIN */}
                <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                    <CardHeader className="p-4 sm:p-6 sm:pb-4">
                        <CardTitle className="flex items-center gap-2 text-[14px] sm:text-[15px]">
                            <Eye size={16} className="text-[#f59e0b]" />
                            Dashboard Admin
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <div>
                            <Label className="text-[12px] text-[#a3a3a3] sm:text-[13px]">Judul</Label>
                            <Input
                                value={form.admin_title}
                                onChange={(e) => setForm({ ...form, admin_title: e.target.value })}
                                disabled={saving}
                                className="mt-1.5 border-[#262626] bg-[#141414] text-[14px]"
                            />
                        </div>
                        <div>
                            <Label className="text-[12px] text-[#a3a3a3] sm:text-[13px]">Deskripsi</Label>
                            <textarea
                                value={form.admin_description}
                                onChange={(e) => setForm({ ...form, admin_description: e.target.value })}
                                disabled={saving}
                                rows={3}
                                className="mt-1.5 w-full resize-none rounded-md border border-[#262626] bg-[#141414] p-3 text-[13px] text-[#fafafa] sm:text-[14px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#7f1d1d] bg-[#1a0a0a] px-3 py-2.5">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#f87171]" />
                        <p className="text-[12px] text-[#fca5a5]">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#22c55e] bg-[#0a1a0f] px-3 py-2.5">
                        <CheckCircle2 size={14} className="shrink-0 text-[#4ade80]" />
                        <p className="text-[12px] text-[#4ade80]">Berhasil disimpan!</p>
                    </div>
                )}

                {/* TOMBOL SIMPAN (Sticky di HP) */}
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1c1c1c] bg-[#0a0a0a]/90 p-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                    <Button
                        type="submit"
                        disabled={saving}
                        className="h-11 w-full bg-[#f59e0b] text-[14px] font-semibold text-[#0a0a0a] sm:float-right sm:h-12 sm:w-auto"
                    >
                        {saving ? "Menyimpan..." : "Simpan Semua Perubahan"}
                    </Button>
                </div>
            </form>
        </div>
    );
}