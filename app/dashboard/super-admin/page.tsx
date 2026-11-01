// app/dashboard/super-admin/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getCountFromServer,
    documentId,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Users, ShieldCheck, CheckCircle2, ArrowRight,
    Clock, Wifi, ChevronDown, MapPin, Settings, Database,
} from "lucide-react";
import Link from "next/link";

/* ============================================================
   HELPERS
============================================================ */
function toDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val?.toDate === "function") return val.toDate();
    if (typeof val === "string") return new Date(val);
    if (typeof val?.seconds === "number") return new Date(val.seconds * 1000);
    if (typeof val?.nanoseconds === "number") return new Date(val.nanoseconds / 1e6);
    if (typeof val === "number") return new Date(val);
    return new Date();
}

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

function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "Baru saja";
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const AVATAR_TONES = [
    "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    "bg-rose-500/15 text-rose-400 ring-rose-500/30",
    "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30",
    "bg-sky-500/15 text-sky-400 ring-sky-500/30",
];
const avatarTone = (name?: string) => {
    let h = 0;
    for (const ch of name ?? "U") h = (h * 31 + ch.charCodeAt(0)) % 997;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

const METHOD_BADGE: Record<string, string> = {
    scan: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ots: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    manual: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};
const METHOD_BAR: Record<string, string> = {
    scan: "bg-emerald-500",
    ots: "bg-indigo-500",
    manual: "bg-amber-500",
};
const methodKey = (m?: string) => (m ?? "scan").toLowerCase();

/* ============================================================
   FIRESTORE LOADER
============================================================ */
type DashStats = {
    total: number;
    checkedIn: number;
    admins: number;
    superAdmins: number;
};

type RecentItem = {
    id: string;
    participant_id?: string;
    method?: string;
    gate?: string;
    scanned_by?: string;
    scanned_at: string; 
    participants?: { name?: string; phone?: string } | null;
};

async function loadDashboardData(): Promise<{ stats: DashStats; recent: RecentItem[] }> {
    try {
        /* ---------- 1) Hitung agregat secara paralel ---------- */
        const [totalSnap, checkinSnap, adminSnap, superAdminSnap] = await Promise.all([
            getCountFromServer(collection(db, "participants")),
            getCountFromServer(collection(db, "checkins")),
            getCountFromServer(query(collection(db, "users"), where("role", "==", "admin"))),
            getCountFromServer(query(collection(db, "users"), where("role", "==", "super_admin"))),
        ]);

        /* ---------- 2) Ambil 10 check-in terbaru ---------- */
        const recentSnap = await getDocs(
            query(collection(db, "checkins"), orderBy("scanned_at", "desc"), limit(10))
        );

        const checkins = recentSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
        })) as any[];

        /* ---------- 3) Ambil data peserta terkait (lookup batch) ---------- */
        const participantIds = Array.from(
            new Set(checkins.map((c) => c.participant_id).filter(Boolean))
        ) as string[];

        const participantsMap: Record<string, { name?: string; phone?: string }> = {};

        if (participantIds.length > 0) {
            const pSnap = await getDocs(
                query(collection(db, "participants"), where(documentId(), "in", participantIds))
            );
            pSnap.docs.forEach((d) => {
                participantsMap[d.id] = d.data() as any;
            });
        }

        /* ---------- 4) Gabungkan ---------- */
        const recent: RecentItem[] = checkins.map((c) => ({
            id: c.id,
            participant_id: c.participant_id,
            method: c.method,
            gate: c.gate,
            scanned_by: c.scanned_by,
            scanned_at: toDate(c.scanned_at).toISOString(),
            participants: c.participant_id ? participantsMap[c.participant_id] ?? null : null,
        }));

        return {
            stats: {
                total: totalSnap.data().count,
                checkedIn: checkinSnap.data().count,
                admins: adminSnap.data().count,
                superAdmins: superAdminSnap.data().count,
            },
            recent,
        };
    } catch (error) {
        console.error("Gagal memuat dashboard:", error);
        return {
            stats: { total: 0, checkedIn: 0, admins: 0, superAdmins: 0 },
            recent: [],
        };
    }
}

/* ============================================================
   STYLE KARTU STATISTIK
============================================================ */
const STAT = {
    total: {
        bg: "from-indigo-500/[0.12] to-[#121214]",
        hover: "hover:border-indigo-500/40 hover:shadow-[0_12px_40px_rgba(99,102,241,0.18)]",
        active: "border-indigo-500/50",
        icon: "bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white",
        label: "text-indigo-300/80",
    },
    admin: {
        bg: "from-amber-500/[0.14] to-[#121214]",
        hover: "hover:border-amber-500/40 hover:shadow-[0_12px_40px_rgba(245,158,11,0.18)]",
        active: "border-amber-500/60 shadow-[0_12px_40px_rgba(245,158,11,0.18)]",
        icon: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
        label: "text-amber-300/80",
    },
    super: {
        bg: "from-rose-500/[0.12] to-[#121214]",
        hover: "hover:border-rose-500/40 hover:shadow-[0_12px_40px_rgba(244,63,94,0.18)]",
        active: "border-rose-500/50",
        icon: "bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
        label: "text-rose-300/80",
    },
} as const;

function StatTile({
    tone, icon: Icon, label, value, onClick, active, hint,
}: {
    tone: keyof typeof STAT;
    icon: any;
    label: string;
    value: number;
    onClick?: () => void;
    active?: boolean;
    hint?: string;
}) {
    const t = STAT[tone];
    const shown = useCountUp(value);
    const Wrapper: any = onClick ? "button" : "div";

    return (
        <Wrapper
            type={onClick ? "button" : undefined}
            onClick={onClick}
            className={`group relative w-full text-left rounded-2xl border bg-gradient-to-br ${t.bg} p-4 transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] ${t.hover} ${active ? t.active : "border-white/[0.06]"} ${onClick ? "cursor-pointer" : "cursor-default"}`}
        >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-300 ${t.icon}`}>
                <Icon size={17} strokeWidth={2.25} />
            </div>
            <p className="mt-4 text-3xl font-extrabold leading-none tabular-nums text-white">{shown}</p>
            <p className={`mt-1.5 text-xs font-semibold ${t.label}`}>{label}</p>
            {hint && (
                <p className="mt-2 text-[10px] font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
                    {active ? "Ketuk untuk reset" : hint}
                </p>
            )}
        </Wrapper>
    );
}

function Ring({ ratio, label }: { ratio: number; label: string }) {
    const r = 30;
    const c = 2 * Math.PI * r;
    const safe = Math.max(0, Math.min(1, ratio));
    const shown = safe > 0 ? Math.max(safe, 0.02) : 0;

    return (
        <div className="relative h-[76px] w-[76px] shrink-0">
            <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
                <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-white/[0.06]" />
                <circle
                    cx="38" cy="38" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
                    className="stroke-emerald-500"
                    style={{ strokeDasharray: c, strokeDashoffset: c * (1 - shown) }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-base font-extrabold text-emerald-400">
                {label}
            </span>
        </div>
    );
}

/* ============================================================
   HALAMAN
============================================================ */
type Filter = "all" | "scan" | "ots" | "manual";

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState<DashStats>({
        total: 0,
        checkedIn: 0,
        admins: 0,
        superAdmins: 0,
    });
    const [recent, setRecent] = useState<RecentItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [filter, setFilter] = useState<Filter>("all");
    const [openId, setOpenId] = useState<string | number | null>(null);
    const [showAll, setShowAll] = useState(false);
    const recentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const { stats: s, recent: r } = await loadDashboardData();
                if (cancelled) return;
                setStats(s);
                setRecent(r);
            } catch (err) {
                console.error("Gagal memuat dashboard:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const checkedShown = useCountUp(stats.checkedIn, 900);
    const rawPercent = stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0;
    const percentLabel =
        stats.checkedIn > 0 && rawPercent < 1 ? "<1%" : `${Math.min(100, Math.round(rawPercent))}%`;
    const ringRatio = stats.total > 0 ? checkedShown / stats.total : 0;

    const matches = (c: RecentItem, f: Filter) => {
        if (f === "all") return true;
        return methodKey(c.method) === f;
    };

    const filtered = recent.filter((c) => matches(c, filter));
    const visible = showAll ? filtered : filtered.slice(0, 5);

    const filters: { id: Filter; label: string }[] = [
        { id: "all", label: "Semua" },
        { id: "scan", label: "Scan" },
        { id: "ots", label: "OTS" },
        { id: "manual", label: "Manual" },
    ];

    const pickFilter = (f: Filter) => {
        setFilter(f);
        setOpenId(null);
        setShowAll(false);
    };

    return (
        <div className="space-y-8 pb-10 w-full max-w-3xl mx-auto selection:bg-emerald-500/30">
            <header className="px-1 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Super Administrator</p>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
                    Dashboard Utama
                </h1>
            </header>

            <section className="space-y-3">
                <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.16] via-[#121214] to-[#121214] p-6 sm:p-7 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_16px_50px_rgba(16,185,129,0.15)]">
                    <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-70" />
                    <div className="relative flex items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 size={18} strokeWidth={2.25} />
                                <p className="text-sm font-semibold">Total Kehadiran</p>
                            </div>
                            <p className="mt-3 text-6xl font-extrabold leading-none tracking-tight tabular-nums text-white sm:text-7xl">
                                {checkedShown}
                            </p>
                            <p className="mt-2 text-sm font-medium text-zinc-400">
                                dari <span className="font-bold text-zinc-200">{stats.total}</span> peserta terdaftar
                            </p>
                        </div>
                        <Ring ratio={ringRatio} label={percentLabel} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <StatTile tone="total" icon={Users} label="Peserta" value={stats.total} />
                    <StatTile tone="admin" icon={ShieldCheck} label="Admin" value={stats.admins} />
                    <StatTile tone="super" icon={Users} label="Super Admin" value={stats.superAdmins} />
                </div>
            </section>

            <section className="grid grid-cols-5 gap-3">
                <Link href="/dashboard/users" className="col-span-5 sm:col-span-3 block">
                    <div className="group flex h-full items-center justify-between gap-4 rounded-3xl bg-emerald-500 p-5 transition-all duration-300 hover:bg-emerald-400 hover:-translate-y-0.5 active:scale-[0.98] shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/10 text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                                <Users size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-base font-bold text-white tracking-tight">Kelola Users</p>
                                <p className="text-xs font-medium text-emerald-900 mt-0.5">Tambah & atur akun admin</p>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-white/80 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                </Link>

                <Link href="/dashboard/content" className="col-span-5 sm:col-span-2 block">
                    <div className="group flex h-full items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-amber-500/[0.14] to-[#18181b] p-5 border border-amber-500/15 transition-all duration-300 hover:border-amber-500/40 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(245,158,11,0.18)] active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 transition-all duration-300 group-hover:bg-amber-500 group-hover:text-white group-hover:-rotate-3 group-hover:scale-110">
                                <Database size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-base font-bold text-white tracking-tight">Konten & Harga</p>
                                <p className="text-xs font-medium text-zinc-500 mt-0.5">Atur harga tiket</p>
                            </div>
                        </div>
                        <ArrowRight size={18} className="text-zinc-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                    </div>
                </Link>

                <Link href="/dashboard/settings" className="col-span-5 block">
                    <div className="group flex items-center justify-between rounded-3xl bg-[#121214] p-4 pl-5 border border-white/[0.05] transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10 active:scale-[0.99]">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-400 transition-colors group-hover:text-white">
                                <Settings size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Pengaturan Pembayaran</p>
                                <p className="text-xs font-medium text-zinc-500 mt-0.5">QRIS & Rekening Bank</p>
                            </div>
                        </div>
                        <ArrowRight size={18} className="text-zinc-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                    </div>
                </Link>
            </section>

            <section ref={recentRef} className="scroll-mt-4">
                <div className="flex items-center justify-between px-1 mb-3">
                    <h2 className="text-base font-bold text-white">Aktivitas Kehadiran</h2>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <Wifi size={11} /> Live Update
                    </span>
                </div>

                <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {filters.map((f) => {
                        const count = recent.filter((c) => matches(c, f.id)).length;
                        const on = filter === f.id;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => pickFilter(f.id)}
                                className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                                    on
                                        ? "border-emerald-500/40 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                        : "border-white/[0.06] bg-[#121214] text-zinc-400 hover:border-white/15 hover:text-white"
                                }`}
                            >
                                {f.label}
                                <span className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-black/15 text-white" : "bg-white/5 text-zinc-500"}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-[68px] animate-pulse rounded-2xl border border-white/[0.04] bg-[#121214]/60" />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#121214]/40 p-8 text-center text-sm font-medium text-zinc-500">
                        {recent.length === 0 ? "Belum ada kehadiran." : "Tidak ada kehadiran untuk filter ini."}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {visible.map((c) => {
                            const key = methodKey(c.method);
                            const open = openId === c.id;
                            const isNew = Date.now() - new Date(c.scanned_at).getTime() < 5 * 60 * 1000;

                            return (
                                <div
                                    key={c.id}
                                    className={`relative overflow-hidden rounded-2xl border bg-[#121214]/70 transition-all duration-300 ${
                                        open ? "border-white/15 bg-[#161618]" : "border-white/[0.05] hover:border-white/10 hover:bg-white/[0.03]"
                                    }`}
                                >
                                    <span className={`absolute left-0 top-0 h-full w-1 ${METHOD_BAR[key] ?? "bg-zinc-600"}`} />
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(open ? null : c.id)}
                                        aria-expanded={open}
                                        className="group flex w-full items-center justify-between gap-3 py-3 pl-5 pr-4 text-left active:scale-[0.99] transition-transform"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 transition-transform duration-300 group-hover:scale-105 ${avatarTone(c.participants?.name)}`}>
                                                {c.participants?.name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-emerald-400">
                                                        {c.participants?.name ?? "-"}
                                                    </p>
                                                    {isNew && (
                                                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                                                            Baru
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
                                                    {c.gate} · {timeAgo(c.scanned_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2.5">
                                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${METHOD_BADGE[key] ?? "bg-white/5 text-zinc-400 border-white/5"}`}>
                                                {c.method ?? "scan"}
                                            </span>
                                            <ChevronDown
                                                size={16}
                                                className={`text-zinc-500 transition-transform duration-300 group-hover:text-white ${open ? "rotate-180" : ""}`}
                                            />
                                        </div>
                                    </button>

                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                        <div className="overflow-hidden">
                                            <div className="grid grid-cols-1 gap-2 border-t border-white/[0.05] py-3 pl-5 pr-4 sm:grid-cols-3">
                                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                    <Clock size={13} className="text-amber-400" />
                                                    {new Date(c.scanned_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                    <MapPin size={13} className="text-rose-400" />
                                                    {c.gate ?? "-"}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                    <Wifi size={13} className="text-indigo-400" />
                                                    {c.scanned_by ?? "Sistem"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filtered.length > 5 && (
                            <button
                                type="button"
                                onClick={() => setShowAll((v) => !v)}
                                className="w-full rounded-2xl border border-white/[0.05] bg-[#121214]/50 py-2.5 text-xs font-semibold text-zinc-400 transition-all hover:border-white/10 hover:text-white active:scale-[0.98]"
                            >
                                {showAll ? "Tampilkan lebih sedikit" : `Lihat ${filtered.length - 5} lainnya`}
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}