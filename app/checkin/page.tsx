// app/checkin/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "@/components/QrScanner";
import ScanResult, { ScanStatus } from "@/components/ScanResult";
import { Button } from "@/components/ui/button";
import {
    LogOut,
    Search,
    QrCode,
    MapPin,
    History,
} from "lucide-react";
import {
    findParticipantByQr,
    findParticipantById,
    loadCheckins,
    addCheckin,
    Checkin,
    Participant,
} from "@/lib/mockData";
import { loadSession, clearSession } from "@/lib/session";
import { useCountUp } from "@/lib/useCountUp";

type ResultState = {
    status: ScanStatus;
    participant?: Participant;
    message: string;
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

.ln-root { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }

@keyframes ln-drift-a {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50%     { transform: translate3d(3%, 4%, 0) scale(1.08); }
}
@keyframes ln-breathe {
  0%,100% { opacity: .4; transform: scale(1); }
  50%     { opacity: 1; transform: scale(1.8); }
}
@keyframes ln-rise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ln-slide-item {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ln-flash {
  0%   { background-color: rgba(212,169,100,0.10); }
  100% { background-color: transparent; }
}

.ln-in { animation: ln-rise .6s cubic-bezier(.16,1,.3,1) both; }
.ln-item { animation: ln-slide-item .45s cubic-bezier(.16,1,.3,1) both; }

@media (prefers-reduced-motion: reduce) {
  .ln-root *, .ln-root *::before, .ln-root *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

function fmtTime(iso?: string | null) {
    if (!iso) return "--:--";
    try {
        return new Date(iso).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    } catch {
        return "--:--";
    }
}

export default function CheckinPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [gate, setGate] = useState<string>("");
    const [result, setResult] = useState<ResultState | null>(null);
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [sessionCount, setSessionCount] = useState(0);
    const [lastScanAt, setLastScanAt] = useState<string | null>(null);
    const [petugasName, setPetugasName] = useState<string>("");

    const totalToday = useCountUp(checkins.length, 600);
    const sessionAnim = useCountUp(sessionCount, 400);

    useEffect(() => {
        const s = loadSession();
        if (!s) {
            window.location.href = "/login";
            return;
        }
        setGate(s.gate);
        setPetugasName(s.name);
        setCheckins(loadCheckins());
        setReady(true);
    }, []);

    const gateCount = useMemo(
        () => checkins.filter((c) => c.gate === gate).length,
        [checkins, gate]
    );
    const gateCountAnim = useCountUp(gateCount, 400);

    const recent = useMemo(
        () =>
            [...checkins]
                .sort(
                    (a, b) =>
                        new Date(b.scanned_at).getTime() -
                        new Date(a.scanned_at).getTime()
                )
                .slice(0, 6),
        [checkins]
    );

    const handleScan = (qrToken: string) => {
        const p = findParticipantByQr(qrToken);
        if (!p) {
            setResult({ status: "invalid", message: "QR tidak dikenali" });
            return;
        }

        const existing = checkins.find((c) => c.participant_id === p.id);
        if (existing) {
            setResult({
                status: "duplicate",
                participant: p,
                message: `Sudah check-in di ${existing.gate}`,
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
            method: "scan",
        });

        setCheckins(newList);
        setSessionCount((n) => n + 1);
        setLastScanAt(now);
        setResult({
            status: "success",
            participant: p,
            message: "Berhasil check-in",
        });
    };

    const handleLogout = () => {
        clearSession();
        window.location.href = "/login";
    };

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

            {/* Background */}
            <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
                <div
                    className="absolute -left-[20%] -top-[25%] h-[70vw] w-[70vw] rounded-full"
                    style={{
                        background:
                            "radial-gradient(closest-side, rgba(212,169,100,0.05), transparent 70%)",
                        animation: "ln-drift-a 40s ease-in-out infinite",
                    }}
                />
            </div>
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

            {/* ============ HEADER ============ */}
            <header className="relative z-30 border-b border-white/[0.06] bg-[#0a0a0b]/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#d4a964]/25 bg-[#d4a964]/[0.05]">
                            <QrCode size={14} strokeWidth={1.5} className="text-[#d4a964]" />
                        </div>
                        <div className="leading-tight">
                            <p className="text-[12.5px] font-semibold tracking-tight text-[#fafafa]">
                                Check-in Event
                            </p>
                            <p className="mt-0.5 hidden text-[10.5px] text-[#71717a] sm:block">
                                Gate Management
                            </p>
                        </div>
                    </div>

                    {/* Right: officer + logout */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] py-1 pl-1 pr-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d4a964]/30 bg-[#d4a964]/[0.1]">
                                <span className="text-[11px] font-semibold text-[#d4a964]">
                                    {petugasName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="hidden leading-tight sm:block">
                                <p className="text-[11.5px] font-medium text-[#fafafa]">
                                    {petugasName}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            aria-label="Keluar"
                            className="group flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/[0.06] bg-white/[0.02] text-[#71717a] transition-all duration-200 hover:border-[#f87171]/30 hover:bg-[#f87171]/[0.06] hover:text-[#f87171]"
                        >
                            <LogOut
                                size={13}
                                strokeWidth={1.7}
                                className="transition-transform duration-200 group-hover:translate-x-[1px]"
                            />
                        </button>
                    </div>
                </div>
            </header>

            {/* ============ MAIN ============ */}
            <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-5 sm:py-6 lg:py-8">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:gap-8">
                    {/* ===== KIRI: Info bar + Kamera ===== */}
                    <div className="mx-auto w-full max-w-[520px] space-y-4 lg:mx-0 lg:max-w-none">
                        {/* Info bar - Gate (READ-ONLY) */}
                        <div
                            className="ln-in flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.06] bg-[#111113] px-3.5 py-2.5"
                            style={{ animationDelay: ".04s" }}
                        >
                            <div className="flex items-center gap-2.5">
                                <MapPin
                                    size={13}
                                    strokeWidth={1.7}
                                    className="text-[#d4a964]"
                                />
                                <div className="leading-tight">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#52525b]">
                                        Penugasan
                                    </p>
                                    <p className="mt-0.5 text-[13px] font-medium text-[#fafafa]">
                                        {gate}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-right">
                                <div className="leading-tight">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#52525b]">
                                        Gate ini
                                    </p>
                                    <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[#fafafa]">
                                        {gateCountAnim}
                                    </p>
                                </div>
                                <span className="h-6 w-px bg-white/[0.06]" />
                                <div className="leading-tight">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#52525b]">
                                        Sesi
                                    </p>
                                    <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[#d4a964]">
                                        {sessionAnim}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Kamera */}
                        <div
                            className="ln-in mx-auto w-full max-w-[440px] lg:mx-0"
                            style={{ animationDelay: ".1s" }}
                        >
                            <QrScanner onScan={handleScan} />
                        </div>
                    </div>

                    {/* ===== KANAN: Sidebar ===== */}
                    <aside className="ln-in mx-auto w-full max-w-[520px] space-y-4 lg:mx-0 lg:max-w-none lg:sticky lg:top-20 lg:self-start">
                        {/* Recent */}
                        <div
                            className="ln-in overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#111113]"
                            style={{ animationDelay: ".16s" }}
                        >
                            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <History
                                        size={12}
                                        strokeWidth={1.7}
                                        className="text-[#52525b]"
                                    />
                                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717a]">
                                        Check-in terbaru
                                    </p>
                                </div>
                                <span className="text-[11px] tabular-nums text-[#52525b]">
                                    {lastScanAt ? fmtTime(lastScanAt) : "—"}
                                </span>
                            </div>

                            {recent.length === 0 ? (
                                <div className="px-4 py-10 text-center">
                                    <p className="text-[12.5px] text-[#52525b]">
                                        Belum ada check-in
                                    </p>
                                    <p className="mt-1 text-[11px] text-[#3f3f46]">
                                        Data akan muncul di sini setelah scan berhasil
                                    </p>
                                </div>
                            ) : (
                                <ul>
                                    {recent.map((c, i) => (
                                        <RecentItem
                                            key={c.id}
                                            checkin={c}
                                            delay={i * 40}
                                            isNew={i === 0}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Total hari ini */}
                        <div
                            className="ln-in grid grid-cols-2 gap-3"
                            style={{ animationDelay: ".22s" }}
                        >
                            <MiniStat label="Total hari ini" value={totalToday} />
                            <MiniStat
                                label="Sesi ini"
                                value={sessionAnim}
                                highlight
                            />
                        </div>

                        {/* Cari manual */}
                        <div
                            className="ln-in"
                            style={{ animationDelay: ".28s" }}
                        >
                            <Button
                                variant="outline"
                                onClick={() => router.push("/manual")}
                                className="group h-11 w-full rounded-[10px] border-white/[0.06] bg-white/[0.02] text-[12.5px] font-medium text-[#a1a1aa] transition-all duration-200 hover:border-[#d4a964]/30 hover:bg-[#d4a964]/[0.04] hover:text-[#d4a964]"
                            >
                                <Search
                                    size={13}
                                    strokeWidth={1.7}
                                    className="mr-2 transition-transform duration-200 group-hover:scale-110"
                                />
                                Cari Peserta Manual
                            </Button>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Result notification */}
            {result && (
                <ScanResult
                    status={result.status}
                    participantName={result.participant?.name}
                    community={result.participant?.community}
                    category={result.participant?.category}
                    gate={gate}
                    message={result.message}
                    onDismiss={() => setResult(null)}
                />
            )}
        </div>
    );
}

function RecentItem({
    checkin,
    delay,
    isNew,
}: {
    checkin: Checkin;
    delay: number;
    isNew: boolean;
}) {
    const participant = findParticipantById(checkin.participant_id);
    const name = participant?.name ?? `ID ${checkin.participant_id}`;
    const initial = name.trim().charAt(0).toUpperCase();

    return (
        <li
            className="ln-item flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0"
            style={{
                animationDelay: `${delay}ms`,
                animation: isNew
                    ? "ln-slide-item .45s cubic-bezier(.16,1,.3,1) both, ln-flash 2s ease-out"
                    : undefined,
            }}
        >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02]">
                <span className="text-[11px] font-medium text-[#a1a1aa]">
                    {initial}
                </span>
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-[#fafafa]">
                    {name}
                </p>
                <p className="mt-0.5 text-[10.5px] text-[#52525b]">
                    {checkin.gate} · {checkin.method ?? "scan"}
                </p>
            </div>
            <span className="shrink-0 text-[10.5px] tabular-nums text-[#71717a]">
                {fmtTime(checkin.scanned_at)}
            </span>
        </li>
    );
}

function MiniStat({
    label,
    value,
    highlight,
}: {
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-[10px] border px-3.5 py-3 transition-colors duration-200 ${
                highlight
                    ? "border-[#d4a964]/20 bg-[#d4a964]/[0.03]"
                    : "border-white/[0.06] bg-[#111113]"
            }`}
        >
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#52525b]">
                {label}
            </p>
            <p
                className={`mt-1.5 text-[22px] font-semibold leading-none tabular-nums ${
                    highlight ? "text-[#d4a964]" : "text-[#fafafa]"
                }`}
            >
                {value}
            </p>
        </div>
    );
}