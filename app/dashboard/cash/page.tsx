// app/dashboard/cash/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Wallet, Banknote, CreditCard, QrCode, CheckCircle2,
    RefreshCw, Users, Download, Filter, Copy,
} from "lucide-react";

type Payment = {
    id: string;
    participant_id: string;
    amount: number;
    method: "cash" | "transfer" | "qris";
    status: string;
    settle_status: "held" | "settled";
    received_by: string | null;
    receipt_no: string;
    notes: string | null;
    received_at: string;
    settled_at: string | null;
    settled_by: string | null;
    participants: {
        name: string;
        category: string;
        assigned_gate: string;
    } | null;
};

type FilterRange = "today" | "week" | "month" | "all";

export default function CashPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterRange>("all");
    const [settlingBy, setSettlingBy] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const { data: paymentsData, error: payErr } = await supabase
                .from("payments")
                .select("*")
                .order("received_at", { ascending: false });

            if (payErr) {
                console.error("Fetch payments error:", payErr);
                setLoading(false);
                return;
            }

            if (!paymentsData || paymentsData.length === 0) {
                setPayments([]);
                setLoading(false);
                return;
            }

            const participantIds = Array.from(
                new Set(paymentsData.map((p) => p.participant_id).filter(Boolean))
            );

            const { data: participantsData } = await supabase
                .from("participants")
                .select("id, name, category, assigned_gate")
                .in("id", participantIds);

            const participantsMap = new Map(
                (participantsData ?? []).map((p) => [p.id, p])
            );

            const merged = paymentsData.map((p) => ({
                ...p,
                participants: participantsMap.get(p.participant_id) ?? null,
            }));

            setPayments(merged as any);
        } catch (err) {
            console.error("Fetch error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const filtered = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return payments.filter((p) => {
            const d = new Date(p.received_at);
            if (filter === "today") return d >= startOfDay;
            if (filter === "week") {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return d >= weekAgo;
            }
            if (filter === "month") {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return d >= monthAgo;
            }
            return true;
        });
    }, [payments, filter]);

    const stats = useMemo(() => {
        const cash = filtered.filter((p) => p.method === "cash");
        const transfer = filtered.filter((p) => p.method === "transfer");
        const qris = filtered.filter((p) => p.method === "qris");

        const sum = (arr: Payment[]) => arr.reduce((a, p) => a + p.amount, 0);
        const heldCash = cash.filter((p) => p.settle_status === "held");
        const settledCash = cash.filter((p) => p.settle_status === "settled");

        return {
            totalCash: sum(cash),
            totalTransfer: sum(transfer),
            totalQris: sum(qris),
            totalAll: sum(filtered),
            heldCash: sum(heldCash),
            settledCash: sum(settledCash),
            countCash: cash.length,
            countTransfer: transfer.length,
            countQris: qris.length,
            countAll: filtered.length,
        };
    }, [filtered]);

    const adminGroups = useMemo(() => {
        const groups = new Map<string, {
            name: string;
            held: number;
            settled: number;
            total: number;
        }>();

        filtered.filter((p) => p.method === "cash").forEach((p) => {
            const key = p.received_by ?? "Unknown";
            if (!groups.has(key)) {
                groups.set(key, { name: key, held: 0, settled: 0, total: 0 });
            }
            const g = groups.get(key)!;
            g.total += p.amount;
            if (p.settle_status === "held") g.held += p.amount;
            else g.settled += p.amount;
        });

        return Array.from(groups.values()).sort((a, b) => b.held - a.held);
    }, [filtered]);

    const handleSettle = async (adminName: string, amount: number) => {
        if (!confirm(`Konfirmasi terima setoran ${formatRupiah(amount)} dari ${adminName}?`)) return;

        setSettlingBy(adminName);
        const { error } = await supabase
            .from("payments")
            .update({
                settle_status: "settled",
                settled_at: new Date().toISOString(),
                settled_by: "Super Admin",
            })
            .eq("method", "cash")
            .eq("received_by", adminName)
            .eq("settle_status", "held");

        if (error) {
            alert("Gagal: " + error.message);
        } else {
            await fetchPayments();
        }
        setSettlingBy(null);
    };

    // Build CSV dengan SEMICOLON (untuk Excel Indonesia)
    const buildCSV = (): string => {
        const headers = [
            "Kwitansi", "Tanggal", "Nama", "Kategori", "Gate",
            "Metode", "Status", "Jumlah", "Diterima Oleh", "Disetor Oleh"
        ];
        const rows = filtered.map((p) => [
            p.receipt_no,
            formatDateTime(p.received_at),
            p.participants?.name ?? "-",
            p.participants?.category ?? "-",
            p.participants?.assigned_gate ?? "-",
            p.method.toUpperCase(),
            p.settle_status === "held" ? "Belum Setor" : "Sudah Setor",
            p.amount.toString(),
            p.received_by ?? "-",
            p.settled_by ?? "-",
        ]);
        // PENTING: pakai ; bukan ,
        return [headers, ...rows]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
            .join("\r\n");
    };

    const handleExportCSV = () => {
        if (filtered.length === 0) {
            alert("Belum ada transaksi untuk diexport");
            return;
        }
        try {
            const csvContent = buildCSV();
            const BOM = "\uFEFF";
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const filename = `laporan-kas-${new Date().toISOString().slice(0, 10)}.csv`;

            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log("CSV downloaded:", filename, "Rows:", filtered.length);
        } catch (err) {
            console.error("Export error:", err);
            alert("Gagal export: " + (err as Error).message);
        }
    };

    const handleCopyCSV = async () => {
        if (filtered.length === 0) {
            alert("Belum ada transaksi untuk dicopy");
            return;
        }
        try {
            const csvContent = buildCSV();
            await navigator.clipboard.writeText(csvContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy error:", err);
            alert("Gagal copy: " + (err as Error).message);
        }
    };

    return (
        <div className="p-8 text-[#fafafa]">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Laporan Kas</h1>
                    <p className="mt-1 text-sm text-[#737373]">
                        Rekap pembayaran & setoran uang cash dari admin
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleCopyCSV}
                        disabled={filtered.length === 0}
                        variant="outline"
                        className="border-[#3a3a3a] text-[#fafafa] disabled:opacity-50"
                    >
                        <Copy size={16} className="mr-2" />
                        {copied ? "Tersalin!" : "Copy CSV"}
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        disabled={filtered.length === 0}
                        className="bg-[#f59e0b] text-[#0a0a0a] hover:bg-[#fbbf24] disabled:opacity-50"
                    >
                        <Download size={16} className="mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
                <Filter size={16} className="text-[#737373]" />
                {(["today", "week", "month", "all"] as FilterRange[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                            filter === f
                                ? "bg-[#f59e0b] text-[#0a0a0a]"
                                : "border border-[#262626] bg-[#141414] text-[#a3a3a3] hover:border-[#3a3a3a]"
                        }`}
                    >
                        {f === "today" && "Hari Ini"}
                        {f === "week" && "7 Hari"}
                        {f === "month" && "30 Hari"}
                        {f === "all" && "Semua"}
                    </button>
                ))}
                <Button
                    onClick={fetchPayments}
                    variant="outline"
                    size="sm"
                    className="ml-auto border-[#262626] text-[#a3a3a3]"
                >
                    <RefreshCw size={14} className="mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Wallet} label="Total Pendapatan" value={formatRupiah(stats.totalAll)} sub={`${stats.countAll} transaksi`} color="amber" />
                <StatCard icon={Banknote} label="Cash" value={formatRupiah(stats.totalCash)} sub={`${stats.countCash} transaksi`} color="green" />
                <StatCard icon={CreditCard} label="Transfer" value={formatRupiah(stats.totalTransfer)} sub={`${stats.countTransfer} transaksi`} color="blue" />
                <StatCard icon={QrCode} label="QRIS" value={formatRupiah(stats.totalQris)} sub={`${stats.countQris} transaksi`} color="purple" />
            </div>

            {stats.heldCash > 0 && (
                <Card className="mt-6 border-[#f59e0b]/30 bg-[#1a1508]">
                    <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/20">
                            <Wallet size={22} className="text-[#f59e0b]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-bold text-[#f59e0b]">Uang Cash Belum Disetor</p>
                            <p className="mt-0.5 text-[12.5px] text-[#a3a3a3]">
                                Total {formatRupiah(stats.heldCash)} masih dipegang admin
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="mt-6 border-[#1c1c1c] bg-[#0f0f0f]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[15px]">
                        <Users size={18} className="text-[#60a5fa]" />
                        Rekap Cash per Admin
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="py-8 text-center text-sm text-[#737373]">Memuat...</p>
                    ) : adminGroups.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[#737373]">Belum ada transaksi cash.</p>
                    ) : (
                        <div className="space-y-3">
                            {adminGroups.map((g) => (
                                <div key={g.name} className="rounded-xl border border-[#1c1c1c] bg-[#141414] p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[14px] font-semibold">{g.name}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11.5px]">
                                                <span className="text-[#737373]">
                                                    Total: <span className="text-[#fafafa]">{formatRupiah(g.total)}</span>
                                                </span>
                                                {g.settled > 0 && (
                                                    <span className="text-[#737373]">
                                                        Sudah Setor: <span className="text-[#4ade80]">{formatRupiah(g.settled)}</span>
                                                    </span>
                                                )}
                                                {g.held > 0 && (
                                                    <span className="text-[#737373]">
                                                        Belum Setor: <span className="text-[#f59e0b]">{formatRupiah(g.held)}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {g.held > 0 ? (
                                            <Button
                                                onClick={() => handleSettle(g.name, g.held)}
                                                disabled={settlingBy === g.name}
                                                className="shrink-0 bg-[#22c55e] text-white hover:bg-[#16a34a]"
                                            >
                                                <CheckCircle2 size={14} className="mr-2" />
                                                {settlingBy === g.name ? "Memproses..." : "Terima Setoran"}
                                            </Button>
                                        ) : (
                                            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#22c55e]/15 px-3 py-1.5 text-[11.5px] font-semibold text-[#4ade80]">
                                                <CheckCircle2 size={12} />
                                                Lunas
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6 border-[#1c1c1c] bg-[#0f0f0f]">
                <CardHeader>
                    <CardTitle className="text-[15px]">Detail Transaksi ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="py-8 text-center text-sm text-[#737373]">Memuat...</p>
                    ) : filtered.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[#737373]">Belum ada transaksi.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12.5px]">
                                <thead>
                                    <tr className="border-b border-[#1c1c1c] text-left text-[10.5px] uppercase tracking-wider text-[#737373]">
                                        <th className="px-2 py-2">Kwitansi</th>
                                        <th className="px-2 py-2">Nama</th>
                                        <th className="px-2 py-2">Metode</th>
                                        <th className="px-2 py-2">Jumlah</th>
                                        <th className="px-2 py-2">Diterima</th>
                                        <th className="px-2 py-2">Status</th>
                                        <th className="px-2 py-2">Waktu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.slice(0, 50).map((p) => (
                                        <tr key={p.id} className="border-b border-[#1c1c1c]/50">
                                            <td className="px-2 py-2 font-mono text-[11px] text-[#f59e0b]">{p.receipt_no}</td>
                                            <td className="px-2 py-2 text-[#fafafa]">{p.participants?.name ?? "-"}</td>
                                            <td className="px-2 py-2">
                                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                    p.method === "cash" ? "bg-[#22c55e]/15 text-[#4ade80]" :
                                                    p.method === "transfer" ? "bg-[#60a5fa]/15 text-[#60a5fa]" :
                                                    "bg-[#a78bfa]/15 text-[#a78bfa]"
                                                }`}>
                                                    {p.method}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 font-semibold text-[#fafafa]">{formatRupiah(p.amount)}</td>
                                            <td className="px-2 py-2 text-[#a3a3a3]">{p.received_by ?? "-"}</td>
                                            <td className="px-2 py-2">
                                                {p.method === "cash" ? (
                                                    p.settle_status === "settled" ? (
                                                        <span className="text-[#4ade80]">Sudah Setor</span>
                                                    ) : (
                                                        <span className="text-[#f59e0b]">Belum Setor</span>
                                                    )
                                                ) : (
                                                    <span className="text-[#737373]">Auto</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-[#737373]">{formatDateTime(p.received_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length > 50 && (
                                <p className="mt-3 text-center text-[11px] text-[#737373]">
                                    Menampilkan 50 dari {filtered.length} transaksi - gunakan Export CSV untuk semua data
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
    const colors: any = {
        amber: "bg-[#f59e0b]/15 text-[#f59e0b]",
        green: "bg-[#22c55e]/15 text-[#4ade80]",
        blue: "bg-[#3b82f6]/15 text-[#60a5fa]",
        purple: "bg-[#a78bfa]/15 text-[#a78bfa]",
    };
    return (
        <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
            <CardContent className="p-5">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
                    <Icon size={18} />
                </div>
                <p className="text-[11.5px] font-medium text-[#737373]">{label}</p>
                <p className="mt-1 text-[20px] font-bold tracking-tight">{value}</p>
                <p className="mt-0.5 text-[11px] text-[#525252]">{sub}</p>
            </CardContent>
        </Card>
    );
}