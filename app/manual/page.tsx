// app/manual/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Search,
    Check,
    AlertCircle,
    MapPin,
    X,
    User as UserIcon,
} from "lucide-react";
import {
    mockParticipants,
    loadCheckins,
    addCheckin,
    Checkin,
    Participant,
} from "@/lib/mockData";
import { loadSession } from "@/lib/session";
import { playBeep, vibrate } from "@/lib/utils";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

.ln-root { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }

@keyframes ln-rise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ln-slide-down {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ln-in { animation: ln-rise .55s cubic-bezier(.16,1,.3,1) both; }

@media (prefers-reduced-motion: reduce) {
  .ln-root *, .ln-root *::before, .ln-root *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

type Toast = {
    kind: "success" | "duplicate";
    message: string;
    name?: string;
} | null;

export default function ManualPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [query, setQuery] = useState("");
    const [gate, setGate] = useState<string>("");
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [toast, setToast] = useState<Toast>(null);

    useEffect(() => {
        const s = loadSession();
        if (!s) {
            window.location.href = "/login";
            return;
        }
        setGate(s.gate);
        setCheckins(loadCheckins());
        setReady(true);
    }, []);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        return mockParticipants
            .filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.phone.toLowerCase().includes(q) ||
                    p.community.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q)
            )
            .slice(0, 30);
    }, [query]);

    const handlePick = (p: Participant) => {
        const existing = checkins.find((c) => c.participant_id === p.id);
        if (existing) {
            playBeep("warning");
            vibrate([80, 40, 80]);
            setToast({
                kind: "duplicate",
                message: `Sudah check-in di ${existing.gate}`,
                name: p.name,
            });
            return;
        }

        const s = loadSession();
        const now = new Date().toISOString();
        const id =
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const newList = addCheckin({
            id,
            participant_id: p.id,
            gate,
            scanned_at: now,
            scanned_by: s?.email,
            method: "manual",
        });

        setCheckins(newList);
        playBeep("success");
        vibrate(100);
        setToast({
            kind: "success",
            message: "Berhasil check-in",
            name: p.name,
        });
    };

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2800);
        return () => clearTimeout(t);
    }, [toast]);

    if (!ready) {
        return (
            <div className="ln-root flex min-h-screen items-center justify-center bg-[#0a0a0b]">
                <style>{STYLES}</style>
                <div className="h-8 w-8 animate-spin rounded-full border-[1.5px] border-white/[0.08] border-t-[#d4a964]" />
            </div>
        );
    }

    return (
        <div className="ln-root relative flex min-h-screen flex-col bg-[#0a0a0b] text-[#fafafa] antialiased">
            <style>{STYLES}</style>

            <div
                aria-hidden
                className="pointer-events-none fixed inset-0"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                    maskImage:
                        "radial-gradient(ellipse 80% 70% at 50% 30%, black, transparent 100%)",
                    WebkitMaskImage:
                        "radial-gradient(ellipse 80% 70% at 50% 30%, black, transparent 100%)",
                }}
            />

            {/* Header */}
            <header className="relative z-30 border-b border-white/[0.06] bg-[#0a0a0b]/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-5">
                    <button
                        onClick={() => router.push("/checkin")}
                        aria-label="Kembali"
                        className="group flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/[0.06] bg-white/[0.02] text-[#71717a] transition-all duration-200 hover:border-[#d4a964]/30 hover:text-[#d4a964]"
                    >
                        <ArrowLeft
                            size={14}
                            strokeWidth={1.7}
                            className="transition-transform duration-200 group-hover:-translate-x-[2px]"
                        />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#52525b]">
                            Pencarian
                        </p>
                        <p className="mt-0.5 text-[13.5px] font-semibold tracking-tight text-[#fafafa]">
                            Input Manual
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full border border-[#d4a964]/20 bg-[#d4a964]/[0.04] px-2.5 py-1">
                        <MapPin size={10} strokeWidth={1.7} className="text-[#d4a964]" />
                        <span className="text-[10.5px] font-medium tracking-wide text-[#d4a964]">
                            {gate}
                        </span>
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-5 sm:py-6">
                {/* Search input */}
                <div className="ln-in relative" style={{ animationDelay: ".04s" }}>
                    <Search
                        size={15}
                        strokeWidth={1.7}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52525b]"
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                        placeholder="Cari nama, nomor HP, atau komunitas…"
                        className="h-12 w-full rounded-[10px] border border-white/[0.08] bg-white/[0.02] pl-10 pr-10 text-[13.5px] text-[#fafafa] placeholder:text-[#52525b] transition-colors duration-200 focus:border-[#d4a964]/50 focus:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-[#d4a964]/15"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Hapus"
                            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#52525b] transition-colors duration-200 hover:bg-white/[0.06] hover:text-[#fafafa]"
                        >
                            <X size={13} strokeWidth={2} />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="mt-4">
                    {query.trim().length < 2 ? (
                        <Empty
                            icon="search"
                            title="Ketik minimal 2 karakter"
                            subtitle="Cari peserta berdasarkan nama, nomor HP, atau komunitas"
                        />
                    ) : results.length === 0 ? (
                        <Empty
                            icon="empty"
                            title="Peserta tidak ditemukan"
                            subtitle={`Tidak ada hasil untuk "${query}"`}
                        />
                    ) : (
                        <ul className="space-y-1.5">
                            {results.map((p, i) => {
                                const existing = checkins.find(
                                    (c) => c.participant_id === p.id
                                );
                                return (
                                    <ResultRow
                                        key={p.id}
                                        participant={p}
                                        existing={existing}
                                        onClick={() => handlePick(p)}
                                        delay={i * 25}
                                    />
                                );
                            })}
                        </ul>
                    )}
                </div>
            </main>

            {/* Toast */}
            {toast && (
                <div
                    className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
                    style={{
                        animation: "ln-slide-down .4s cubic-bezier(.16,1,.3,1) both",
                    }}
                >
                    <div
                        className={`pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-[12px] border bg-[#0f0f11]/95 px-4 py-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
                            toast.kind === "success"
                                ? "border-[#6ee7b7]/25"
                                : "border-[#fbbf24]/25"
                        }`}
                        onClick={() => setToast(null)}
                    >
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                                toast.kind === "success"
                                    ? "border-[#6ee7b7]/25 bg-[#6ee7b7]/[0.08]"
                                    : "border-[#fbbf24]/25 bg-[#fbbf24]/[0.08]"
                            }`}
                        >
                            {toast.kind === "success" ? (
                                <Check
                                    size={14}
                                    strokeWidth={2.6}
                                    className="text-[#6ee7b7]"
                                />
                            ) : (
                                <AlertCircle
                                    size={14}
                                    strokeWidth={2.2}
                                    className="text-[#fbbf24]"
                                />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#fafafa]">
                                {toast.message}
                            </p>
                            {toast.name && (
                                <p className="mt-0.5 truncate text-[11px] text-[#71717a]">
                                    {toast.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Empty({
    icon,
    title,
    subtitle,
}: {
    icon: "search" | "empty";
    title: string;
    subtitle: string;
}) {
    return (
        <div className="ln-in flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]">
                {icon === "search" ? (
                    <Search size={20} strokeWidth={1.5} className="text-[#52525b]" />
                ) : (
                    <UserIcon size={20} strokeWidth={1.5} className="text-[#52525b]" />
                )}
            </div>
            <p className="text-[13.5px] font-medium text-[#a1a1aa]">{title}</p>
            <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-[#52525b]">
                {subtitle}
            </p>
        </div>
    );
}

function ResultRow({
    participant,
    existing,
    onClick,
    delay,
}: {
    participant: Participant;
    existing?: Checkin;
    onClick: () => void;
    delay: number;
}) {
    const initial = participant.name.trim().charAt(0).toUpperCase();
    const disabled = !!existing;

    return (
        <li className="ln-in" style={{ animationDelay: `${delay}ms` }}>
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className={`group flex w-full items-center gap-3.5 rounded-[10px] border bg-[#111113] px-3.5 py-3 text-left transition-colors duration-200 ${
                    disabled
                        ? "cursor-not-allowed border-white/[0.04] opacity-55"
                        : "border-white/[0.06] hover:border-[#d4a964]/25 hover:bg-[#141416]"
                }`}
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]">
                    <span className="text-[13px] font-medium text-[#a1a1aa]">
                        {initial}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium tracking-tight text-[#fafafa]">
                        {participant.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-[#71717a]">
                            {participant.community}
                        </span>
                        <span className="text-[#3f3f46]">·</span>
                        <span className="text-[11px] uppercase tracking-wider text-[#71717a]">
                            {participant.category}
                        </span>
                        <span className="text-[#3f3f46]">·</span>
                        <span className="text-[11px] tabular-nums text-[#71717a]">
                            {participant.phone}
                        </span>
                    </div>
                </div>

                {disabled ? (
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#fbbf24]/25 bg-[#fbbf24]/[0.06] px-2.5 py-1">
                        <AlertCircle
                            size={10}
                            strokeWidth={2}
                            className="text-[#fbbf24]"
                        />
                        <span className="text-[10.5px] font-medium tracking-wide text-[#fbbf24]">
                            {existing?.gate}
                        </span>
                    </div>
                ) : (
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4a964]/25 bg-[#d4a964]/[0.06] px-2.5 py-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Check
                            size={10}
                            strokeWidth={2.4}
                            className="text-[#d4a964]"
                        />
                        <span className="text-[10.5px] font-medium tracking-wide text-[#d4a964]">
                            Check-in
                        </span>
                    </div>
                )}
            </button>
        </li>
    );
}