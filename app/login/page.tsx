// app/login/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSession, loadSession } from "@/lib/session";
import { mockPetugas } from "@/lib/mockData";
import {
    QrCode,
    LogIn,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    AlertCircle,
    ArrowRight,
    MapPin,
    CheckCircle2,
} from "lucide-react";

const DEMO_ACCOUNTS = [
    { email: "andi@event.com", password: "1234", role: "Gate 1" },
    { email: "budi@event.com", password: "1234", role: "Gate 2" },
];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

.ln-root { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
.ln-serif { font-family: 'Cormorant Garamond', 'Iowan Old Style', Georgia, serif; }

@keyframes ln-drift-a {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50%     { transform: translate3d(3%, 4%, 0) scale(1.08); }
}
@keyframes ln-drift-b {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50%     { transform: translate3d(-4%, -3%, 0) scale(1.06); }
}
@keyframes ln-rise {
  from { opacity: 0; transform: translateY(14px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ln-shake {
  10%,90% { transform: translateX(-1px); }
  20%,80% { transform: translateX(2px); }
  30%,50%,70% { transform: translateX(-3px); }
  40%,60% { transform: translateX(3px); }
}
@keyframes ln-pop {
  from { opacity: 0; transform: scale(.97); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes ln-spin { to { transform: rotate(360deg); } }
@keyframes ln-breathe {
  0%,100% { opacity: .4; transform: scale(1); }
  50%     { opacity: 1; transform: scale(1.8); }
}

.ln-in { animation: ln-rise .8s cubic-bezier(.16,1,.3,1) both; }

@media (prefers-reduced-motion: reduce) {
  .ln-root *, .ln-root *::before, .ln-root *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

function LiveClock() {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    if (!now)
        return <span className="text-[12px] tabular-nums text-[#52525b]">--:--:--</span>;
    return (
        <div className="flex items-center gap-4 text-[12px] text-[#71717a]">
            <span className="text-[13px] font-medium tabular-nums tracking-wide text-[#fafafa]">
                {now.toLocaleTimeString("id-ID", { hour12: false })}
            </span>
            <span className="h-3.5 w-px bg-white/10" />
            <span>
                {now.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                })}
            </span>
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("andi@event.com");
    const [password, setPassword] = useState("1234");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const s = loadSession();
        if (s) window.location.href = "/checkin";
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.includes("@")) {
            setError("Email tidak valid");
            return;
        }
        if (password.length < 4) {
            setError("Password minimal 4 karakter");
            return;
        }

        setLoading(true);

        const petugas = mockPetugas.find(
            (p) =>
                p.email.toLowerCase() === email.toLowerCase().trim() &&
                p.password === password.trim()
        );

        if (!petugas) {
            setError("Email atau password salah");
            setLoading(false);
            return;
        }

        saveSession({
            name: petugas.name,
            email: petugas.email,
            gate: petugas.assigned_gate,
            loginAt: new Date().toISOString(),
        });

        setTimeout(() => {
            window.location.href = "/checkin";
        }, 400);
    };

    const fillDemo = (acc: { email: string; password: string }) => {
        setEmail(acc.email);
        setPassword(acc.password);
        setError(null);
    };

    const handleCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
    };

    const fieldClass =
        "h-11 rounded-[10px] border-white/[0.08] bg-white/[0.02] text-[14px] text-[#fafafa] placeholder:text-[#52525b] transition-colors duration-200 hover:border-white/[0.14] focus-visible:border-[#d4a964]/60 focus-visible:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-[#d4a964]/15 focus-visible:ring-offset-0";

    const labelClass = "text-[12px] font-medium text-[#a1a1aa]";

    return (
        <div className="ln-root relative min-h-screen overflow-hidden bg-[#0a0a0b] text-[#fafafa] antialiased">
            <style>{STYLES}</style>

            {/* Background — subtle */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    className="absolute -left-[15%] -top-[25%] h-[65vw] w-[65vw] rounded-full"
                    style={{
                        background:
                            "radial-gradient(closest-side, rgba(212,169,100,0.06), transparent 70%)",
                        animation: "ln-drift-a 40s ease-in-out infinite",
                    }}
                />
                <div
                    className="absolute -bottom-[30%] -right-[10%] h-[60vw] w-[60vw] rounded-full"
                    style={{
                        background:
                            "radial-gradient(closest-side, rgba(60,80,100,0.10), transparent 70%)",
                        animation: "ln-drift-b 46s ease-in-out infinite",
                    }}
                />
            </div>
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
                    backgroundSize: "80px 80px",
                    maskImage:
                        "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 100%)",
                    WebkitMaskImage:
                        "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 100%)",
                }}
            />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
                <div className="grid w-full max-w-[1120px] items-center gap-12 lg:grid-cols-[1fr_minmax(0,400px)] lg:gap-20">
                    {/* KIRI: Branding */}
                    <div className="hidden lg:block">
                        <div className="ln-in flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#d4a964]/25 bg-[#d4a964]/[0.05]">
                                <QrCode size={16} strokeWidth={1.5} className="text-[#d4a964]" />
                            </div>
                            <div className="leading-tight">
                                <p className="text-[13px] font-semibold tracking-tight text-[#fafafa]">
                                    Check-in Event
                                </p>
                                <p className="mt-0.5 text-[11px] text-[#71717a]">
                                    Gate Management
                                </p>
                            </div>
                        </div>

                        <div className="mt-14 max-w-[520px] space-y-8">
                            <div
                                className="ln-in inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11.5px] text-[#a1a1aa]"
                                style={{ animationDelay: ".08s" }}
                            >
                                <span className="relative flex h-1.5 w-1.5">
                                    <span
                                        className="absolute inline-flex h-full w-full rounded-full bg-[#6ee7b7]"
                                        style={{
                                            animation:
                                                "ln-breathe 2.4s ease-in-out infinite",
                                        }}
                                    />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6ee7b7]" />
                                </span>
                                Sistem aktif · 10 gate terhubung
                            </div>

                            <h1
                                className="ln-in ln-serif text-[clamp(40px,4.4vw,56px)] font-medium leading-[1.05] tracking-[-0.015em] text-[#fafafa]"
                                style={{ animationDelay: ".16s" }}
                            >
                                Pendataan peserta
                                <br />
                                dengan presisi.
                            </h1>

                            <p
                                className="ln-in max-w-[440px] text-[15px] leading-[1.7] text-[#71717a]"
                                style={{ animationDelay: ".24s" }}
                            >
                                Platform check-in terintegrasi untuk mengelola
                                kehadiran peserta di seluruh gate secara real-time.
                            </p>

                            <div
                                className="ln-in grid max-w-[460px] grid-cols-3 border-y border-white/[0.06]"
                                style={{ animationDelay: ".32s" }}
                            >
                                {[
                                    { v: "10", l: "Gate" },
                                    { v: "99.9%", l: "Uptime" },
                                    { v: "<1s", l: "Waktu scan" },
                                ].map((s, i) => (
                                    <div
                                        key={s.l}
                                        className={`py-6 ${i < 2 ? "border-r border-white/[0.06] pr-5" : ""} ${i > 0 ? "pl-5" : ""}`}
                                    >
                                        <p className="ln-serif text-[30px] font-medium leading-none tabular-nums text-[#fafafa]">
                                            {s.v}
                                        </p>
                                        <p className="mt-2 text-[11.5px] text-[#71717a]">
                                            {s.l}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div
                                className="ln-in flex max-w-[460px] items-center justify-between"
                                style={{ animationDelay: ".4s" }}
                            >
                                <LiveClock />
                                <span className="text-[11.5px] text-[#52525b]">v1.0.0</span>
                            </div>
                        </div>
                    </div>

                    {/* KANAN: Form */}
                    <div className="mx-auto w-full max-w-[400px] lg:mx-0">
                        {/* Mobile branding */}
                        <div className="mb-8 flex flex-col items-center lg:hidden">
                            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#d4a964]/25 bg-[#d4a964]/[0.05]">
                                <QrCode size={20} strokeWidth={1.5} className="text-[#d4a964]" />
                            </div>
                            <h1 className="ln-serif mt-4 text-[26px] font-medium tracking-tight text-[#fafafa]">
                                Check-in Event
                            </h1>
                            <p className="mt-1 text-[12px] text-[#71717a]">
                                Gate Management
                            </p>
                        </div>

                        <div
                            ref={cardRef}
                            onMouseMove={handleCardMove}
                            className="ln-in relative"
                            style={{ animationDelay: ".2s" }}
                        >
                            <div className="relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-[#111113] p-7 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100"
                                    style={{
                                        background:
                                            "radial-gradient(400px circle at var(--mx,50%) var(--my,50%), rgba(212,169,100,0.04), transparent 60%)",
                                    }}
                                />

                                <div className="relative">
                                    <div className="mb-7">
                                        <h2 className="text-[20px] font-semibold tracking-tight text-[#fafafa]">
                                            Masuk Petugas
                                        </h2>
                                        <p className="mt-1.5 text-[13px] text-[#71717a]">
                                            Gate Anda akan ditetapkan otomatis sesuai penugasan.
                                        </p>
                                    </div>

                                    <form onSubmit={handleLogin} className="space-y-4">
                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="email" className={labelClass}>
                                                Email
                                            </label>
                                            <div className="group/f relative">
                                                <Mail
                                                    size={15}
                                                    strokeWidth={1.5}
                                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52525b] transition-colors duration-200 group-focus-within/f:text-[#d4a964]"
                                                />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    autoComplete="off"
                                                    placeholder="nama@event.com"
                                                    className={`${fieldClass} pl-10 pr-3`}
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="password" className={labelClass}>
                                                Password
                                            </label>
                                            <div className="group/p relative">
                                                <Lock
                                                    size={15}
                                                    strokeWidth={1.5}
                                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52525b] transition-colors duration-200 group-focus-within/p:text-[#d4a964]"
                                                />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    autoComplete="off"
                                                    placeholder="••••••••"
                                                    className={`${fieldClass} pl-10 pr-11`}
                                                />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#52525b] transition-colors duration-200 hover:text-[#fafafa]"
                                                    aria-label="Toggle password"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff size={15} strokeWidth={1.5} />
                                                    ) : (
                                                        <Eye size={15} strokeWidth={1.5} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info penugasan — READ ONLY */}
                                        <div className="rounded-[10px] border border-white/[0.05] bg-white/[0.015] px-3.5 py-3">
                                            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#52525b]">
                                                <MapPin size={11} strokeWidth={1.7} />
                                                Penugasan gate
                                            </div>
                                            <p className="mt-1.5 text-[13px] leading-relaxed text-[#a1a1aa]">
                                                Gate ditentukan otomatis dari akun Anda.
                                                Hubungi supervisor jika salah.
                                            </p>
                                        </div>

                                        {/* Error */}
                                        {error && (
                                            <div
                                                role="alert"
                                                className="flex items-start gap-2 rounded-[10px] border border-[#f87171]/25 bg-[#f87171]/[0.06] px-3.5 py-2.5"
                                                style={{
                                                    animation:
                                                        "ln-shake .4s cubic-bezier(.36,.07,.19,.97) both",
                                                }}
                                            >
                                                <AlertCircle
                                                    size={13}
                                                    strokeWidth={2}
                                                    className="mt-0.5 shrink-0 text-[#f87171]"
                                                />
                                                <p className="text-[12.5px] leading-relaxed text-[#fca5a5]">
                                                    {error}
                                                </p>
                                            </div>
                                        )}

                                        {/* Submit */}
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="relative h-11 w-full rounded-[10px] border border-[#d4a964]/30 bg-[#d4a964] text-[13.5px] font-semibold text-[#1a1305] transition-all duration-200 hover:bg-[#ddb676] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        className="h-3.5 w-3.5 rounded-full border-[1.5px] border-[#1a1305]/25 border-t-[#1a1305]"
                                                        style={{
                                                            animation:
                                                                "ln-spin .7s linear infinite",
                                                        }}
                                                    />
                                                    <span>Memverifikasi…</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <LogIn size={15} strokeWidth={2} />
                                                    Masuk
                                                </span>
                                            )}
                                        </Button>
                                    </form>

                                    {/* Divider */}
                                    <div className="my-6 flex items-center gap-3">
                                        <span className="h-px flex-1 bg-white/[0.06]" />
                                        <span className="text-[11px] text-[#52525b]">
                                            Akun demo
                                        </span>
                                        <span className="h-px flex-1 bg-white/[0.06]" />
                                    </div>

                                    {/* Demo accounts */}
                                    <div className="space-y-1">
                                        {DEMO_ACCOUNTS.map((acc) => (
                                            <button
                                                key={acc.email}
                                                type="button"
                                                onClick={() => fillDemo(acc)}
                                                className="group/demo flex w-full items-center justify-between rounded-[8px] border border-transparent px-3 py-2.5 text-left transition-colors duration-200 hover:border-white/[0.06] hover:bg-white/[0.02]"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-[12.5px] font-medium text-[#a1a1aa] group-hover/demo:text-[#fafafa]">
                                                        {acc.email}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-[#52525b]">
                                                        {acc.role}
                                                    </p>
                                                </div>
                                                <ArrowRight
                                                    size={12}
                                                    strokeWidth={1.7}
                                                    className="shrink-0 text-[#52525b] transition-all duration-200 group-hover/demo:translate-x-[2px] group-hover/demo:text-[#d4a964]"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="ln-in mt-6 flex items-center justify-center gap-3 text-[11.5px] text-[#52525b]"
                            style={{ animationDelay: ".4s" }}
                        >
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck size={12} strokeWidth={1.6} />
                                Sesi terenkripsi
                            </span>
                            <span className="h-3 w-px bg-white/[0.06]" />
                            <span>© 2026 Check-in System</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}