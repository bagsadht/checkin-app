// app/dashboard/cash/page.tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { 
    collection, query, orderBy, getDocs, doc, writeBatch, where, documentId 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
    Wallet, Banknote, CreditCard, QrCode, CheckCircle2,
    RefreshCw, Users, ChevronDown, UserCheck, AlertTriangle
} from "lucide-react";

type Payment = {
    id: string;
    participant_id: string;
    amount: number;
    method: "cash" | "transfer" | "qris";
    settle_status: "held" | "settled";
    received_by: string | null;
    receipt_no: string;
    received_at: string;
    participants: { name: string; category: string; assigned_gate: string; } | null;
};

type FilterRange = "today" | "week" | "month" | "all";

function useCountUp(target: number, duration = 800) {
    const [value, setValue] = useState(0);
    const from = useRef(0);
    useEffect(() => {
        const start = performance.now();
        const startVal = from.current;
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = Math.round(startVal + (target - startVal) * eased);
            setValue(v);
            from.current = v;
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);
    return value;
}

const METHOD_BADGE: Record<string, string> = {
    cash: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    transfer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    qris: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};
const METHOD_BAR: Record<string, string> = {
    cash: "bg-emerald-500",
    transfer: "bg-blue-500",
    qris: "bg-purple-500",
};

export default function CashPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterRange>("today");
    const [settlingBy, setSettlingBy] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const paySnap = await getDocs(query(collection(db, "payments"), orderBy("created_at", "desc")));
            const paymentsData = paySnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    received_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString()
                };
            }) as any[];

            const participantIds = Array.from(new Set(paymentsData.map((p) => p.participant_id).filter(Boolean)));
            const participantsMap = new Map();

            if (participantIds.length > 0) {
                const pSnap = await getDocs(query(collection(db, "participants"), where(documentId(), "in", participantIds)));
                pSnap.docs.forEach(d => participantsMap.set(d.id, d.data()));
            }

            const merged = paymentsData.map(p => ({
                ...p,
                participants: participantsMap.get(p.participant_id) || null
            }));

            setPayments(merged);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPayments(); }, []);

    const filtered = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return payments.filter((p) => {
            const d = new Date(p.received_at);
            if (filter === "today" && d < startOfDay) return false;
            if (filter === "week" && d < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
            if (filter === "month" && d < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) return false;
            return true;
        });
    }, [payments, filter]);

    const stats = useMemo(() => {
        const cash = filtered.filter((p) => p.method === "cash");
        const sum = (arr: Payment[]) => arr.reduce((a, p) => a + p.amount, 0);
        return {
            totalAll: sum(filtered),
            totalCash: sum(cash),
            totalTransfer: sum(filtered.filter((p) => p.method === "transfer")),
            totalQris: sum(filtered.filter((p) => p.method === "qris")),
            heldCash: sum(cash.filter((p) => p.settle_status === "held")),
            countAll: filtered.length,
            countCash: cash.length,
        };
    }, [filtered]);

    const adminGroups = useMemo(() => {
        const groups = new Map<string, { name: string; held: number; settled: number; total: number; }>();
        filtered.filter((p) => p.method === "cash").forEach((p) => {
            const key = p.received_by ?? "Unknown";
            if (!groups.has(key)) groups.set(key, { name: key, held: 0, settled: 0, total: 0 });
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

        try {
            const batch = writeBatch(db);
            const q = query(
                collection(db, "payments"), 
                where("method", "==", "cash"), 
                where("received_by", "==", adminName), 
                where("settle_status", "==", "held")
            );
            const snap = await getDocs(q);
            
            snap.forEach((document) => {
                batch.update(doc(db, "payments", document.id), {
                    settle_status: "settled",
                    settled_at: new Date(),
                    settled_by: "Super Admin"
                });
            });
            await batch.commit();
            await fetchPayments();
        } catch (err) {
            console.error(err);
        } finally {
            setSettlingBy(null);
        }
    };

    const shownTotal = useCountUp(stats.totalAll);
    const shownCash = useCountUp(stats.totalCash);
    const shownTransfer = useCountUp(stats.totalTransfer);
    const shownQris = useCountUp(stats.totalQris);

    return (
        <div className="space-y-6 pb-10 w-full max-w-3xl mx-auto selection:bg-emerald-500/30">
            <header className="px-1 flex flex-col gap-1 mt-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet size={16} className="text-emerald-400" />
                        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Keuangan Event</p>
                    </div>
                    <Button onClick={fetchPayments} variant="outline" size="sm" className="h-8 rounded-full border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white">
                        <RefreshCw size={12} className="mr-1.5" /> Refresh
                    </Button>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
                    Laporan Kas
                </h1>
            </header>

            <section>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {(["today", "week", "month", "all"] as FilterRange[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                                filter === f
                                    ? "border-emerald-500/40 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                    : "border-white/[0.06] bg-[#121214] text-zinc-400 hover:border-white/15 hover:text-white"
                            }`}
                        >
                            {f === "today" ? "Hari Ini" : f === "week" ? "7 Hari" : f === "month" ? "30 Hari" : "Semua"}
                        </button>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
                <div className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121214] p-5 transition-all hover:border-emerald-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl"></div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Wallet size={18} />
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pendapatan</p>
                    <p className="text-xl font-bold text-white mt-1">{formatRupiah(shownTotal)}</p>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121214] p-5 transition-all hover:border-emerald-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl"></div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Banknote size={18} />
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cash</p>
                    <p className="text-xl font-bold text-white mt-1">{formatRupiah(shownCash)}</p>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121214] p-5 transition-all hover:border-blue-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl"></div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <CreditCard size={18} />
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Transfer</p>
                    <p className="text-xl font-bold text-white mt-1">{formatRupiah(shownTransfer)}</p>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121214] p-5 transition-all hover:border-purple-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl"></div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                        <QrCode size={18} />
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">QRIS</p>
                    <p className="text-xl font-bold text-white mt-1">{formatRupiah(shownQris)}</p>
                </div>
            </section>

            {stats.heldCash > 0 && (
                <section className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.05] p-5 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[14px] font-bold text-amber-400">Cash Belum Disetor</p>
                        <p className="text-[12px] text-zinc-400 mt-1">Total <span className="font-bold text-white">{formatRupiah(stats.heldCash)}</span> masih dipegang oleh admin gate.</p>
                    </div>
                </section>
            )}

            <section>
                <div className="flex items-center justify-between px-1 mb-3">
                    <h2 className="text-base font-bold text-white">Rekap Cash Admin</h2>
                </div>

                <div className="rounded-2xl border border-white/[0.05] bg-[#121214]/50 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-zinc-500">Memuat data...</div>
                    ) : adminGroups.length === 0 ? (
                        <div className="p-6 text-center text-sm text-zinc-500">Belum ada transaksi cash.</div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {adminGroups.map((g) => (
                                <div key={g.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-300 border border-white/10">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-white">{g.name}</p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">Total: {formatRupiah(g.total)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                        <div className="text-left sm:text-right">
                                            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Belum Setor</p>
                                            <p className="text-[15px] font-extrabold text-amber-400">{formatRupiah(g.held)}</p>
                                        </div>
                                        {g.held > 0 ? (
                                            <Button
                                                onClick={() => handleSettle(g.name, g.held)}
                                                disabled={settlingBy === g.name}
                                                className="bg-emerald-500 text-white hover:bg-emerald-400 h-9 rounded-xl text-xs px-4"
                                            >
                                                <UserCheck size={14} className="mr-1.5" />
                                                {settlingBy === g.name ? "Proses..." : "Terima"}
                                            </Button>
                                        ) : (
                                            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                                                <CheckCircle2 size={14} /> Lunas
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between px-1 mb-3">
                    <h2 className="text-base font-bold text-white">Riwayat Transaksi</h2>
                    <span className="text-[11px] font-semibold text-zinc-500 bg-white/5 px-2.5 py-1 rounded-full">
                        {filtered.length} Data
                    </span>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-[72px] animate-pulse rounded-2xl border border-white/[0.04] bg-[#121214]/60" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#121214]/40 p-8 text-center text-sm font-medium text-zinc-500">
                        Belum ada transaksi untuk periode ini.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.slice(0, 50).map((p) => {
                            const key = p.method.toLowerCase();
                            const isOpen = openId === p.id;

                            return (
                                <div
                                    key={p.id}
                                    className={`relative overflow-hidden rounded-2xl border bg-[#121214]/70 transition-all duration-300 ${
                                        isOpen ? "border-white/15 bg-[#161618]" : "border-white/[0.05] hover:border-white/10 hover:bg-white/[0.03]"
                                    }`}
                                >
                                    <span className={`absolute left-0 top-0 h-full w-1 ${METHOD_BAR[key] ?? "bg-zinc-600"}`} />

                                    <button
                                        type="button"
                                        onClick={() => setOpenId(isOpen ? null : p.id)}
                                        className="group flex w-full items-center justify-between gap-3 py-3 pl-5 pr-4 text-left transition-transform active:scale-[0.99]"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-300 border border-white/5">
                                                <Wallet size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-bold text-white">
                                                        {p.participants?.name ?? "Peserta"}
                                                    </p>
                                                    <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${METHOD_BADGE[key]}`}>
                                                        {p.method}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] font-medium text-zinc-500 truncate">
                                                    {formatDateTime(p.received_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <p className="text-sm font-extrabold text-white">
                                                {formatRupiah(p.amount)}
                                            </p>
                                            <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                                        </div>
                                    </button>

                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                        <div className="overflow-hidden">
                                            <div className="grid grid-cols-2 gap-3 border-t border-white/[0.05] py-3 pl-5 pr-4">
                                                <div>
                                                    <p className="text-[10px] uppercase text-zinc-500 mb-1">No. Kwitansi</p>
                                                    <p className="font-mono text-xs text-emerald-400">{p.receipt_no}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Petugas</p>
                                                    <p className="text-xs text-white">{p.received_by ?? "-"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Status Setor</p>
                                                    <p className={`text-xs font-bold ${p.settle_status === "settled" ? "text-emerald-400" : "text-amber-400"}`}>
                                                        {p.settle_status === "settled" ? "Lunas / Disetor" : "Dipegang Admin"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Gate</p>
                                                    <p className="text-xs text-white">{p.participants?.assigned_gate ?? "-"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}