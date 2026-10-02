// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
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
    Sparkles,
} from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

.ln-root {
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.ln-serif { font-family: 'Cormorant Garamond', 'Iowan Old Style', Georgia, serif; }

@keyframes bloom-float-a {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  33%     { transform: translate3d(6%, 8%, 0) scale(1.15); }
  66%     { transform: translate3d(-4%, 4%, 0) scale(1.08); }
}
@keyframes bloom-float-b {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50%     { transform: translate3d(-8%, -6%, 0) scale(1.2); }
}
@keyframes bloom-float-c {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50%     { transform: translate3d(5%, -8%, 0) scale(1.1); }
}
@keyframes bloom-rise {
  from { opacity: 0; transform: translateY(20px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes bloom-shake {
  10%,90% { transform: translateX(-2px); }
  20%,80% { transform: translateX(3px); }
  30%,50%,70% { transform: translateX(-4px); }
  40%,60% { transform: translateX(4px); }
}
@keyframes bloom-pop {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes bloom-spin { to { transform: rotate(360deg); } }
@keyframes bloom-pulse {
  0%,100% { opacity: .5; transform: scale(1); }
  50%     { opacity: 1; transform: scale(1.5); }
}
@keyframes bloom-check {
  to { stroke-dashoffset: 0; }
}
@keyframes bloom-glow {
  0%,100% { opacity: .4; }
  50%     { opacity: .8; }
}

.ln-in { animation: bloom-rise .9s cubic-bezier(.16,1,.3,1) both; }

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
        return <span className="text-[12px] tabular-nums text-[#6b6376]">--:--:--</span>;
    return (
        <div className="flex items-center gap-3 text-[12px] text-[#a39aae]">
            <span className="text-[13px] font-medium tabular-nums tracking-wide text-[#faf6f0]">
                {now.toLocaleTimeString("id-ID", { hour12: false })}
            </span>
            <span className="h-3 w-px bg-white/[0.08]" />
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
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

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

        setLoading(false);
        setSuccess(true);

        setTimeout(() => {
            window.location.href = "/checkin";
        }, 1200);
    };

    const inputClass =
        "h-[52px] rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[15px] text-[#faf6f0] placeholder:text-[#5c5568] transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.04] focus-visible:border-[#ff7a59]/60 focus-visible:bg-white/[0.05] focus-visible:ring-4 focus-visible:ring-[#ff7a59]/15 focus-visible:ring-offset-0";

    const labelClass = "block text-[13px] font-medium text-[#a39aae]";

    return (
        <div className="ln-root relative flex min-h-screen flex-col bg-[#0d0a0f] text-[#faf6f0] antialiased">
            <style>{STYLES}</style>

            {/* ============ BACKGROUND: 3 warm colored orbs ============ */}
            <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
                {/* Coral */}
                <div
                    className="absolute -left-[20%] -top-[20%] h-[75vw] w-[75vw] rounded-full"
                    style={{
                        background:
                            "radial-gradient(closest-side, rgba(255,122,89,0.14), transparent 65%)",
                        animation: "bloom-float-a 24s ease-in-out infinite",
                        filter: "blur(40px)",
                    }}
                />
                {/* Gold */}
                <div
                    className="absolute -bottom-[25%] -right-[15%] h-[70vw] w-[70vw] rounded-full"
                    style={{
                        background:
                            "radial-gradient(closest-side, rgba(255,209,102,0.10), transparent 65%)",
                        animation: "bloom-float-b 30s ease-in-out infinite",
                        filter: "blur(50px)",
                    }}
                />
                {/* Mint */}
                <div
                    className="absolute left-[40%] top-[50%] h-[50vw] w-[50vw] rounded-full"
                    style={{
                        background:
                            "radial-gradient(closest-side, rgba(125,211,168,0.06), transparent 65%)",
                        animation: "bloom-float-c 36s ease-in-out infinite",
                        filter: "blur(60px)",
                    }}
                />
            </div>

            {/* Grain overlay */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 opacity-[0.15] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
                }}
            />

            {/* ============ MOBILE HEADER ============ */}
            <header className="relative z-20 flex items-center gap-3 px-6 pb-2 pt-6 lg:hidden">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ff7a59]/25"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(255,122,89,0.15), rgba(255,209,102,0.08))",
                    }}
                >
                    <QrCode size={17} strokeWidth={1.7} className="text-[#ff9a78]" />
                </div>
                <div className="leading-tight">
                    <p className="text-[14px] font-semibold tracking-tight text-[#faf6f0]">
                        Check-in Event
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#a39aae]">
                        Gate Management
                    </p>
                </div>
            </header>

            {/* ============ MAIN ============ */}
            <main className="relative z-10 flex flex-1 items-start px-5 pt-8 lg:items-center lg:px-6 lg:py-10">
                <div className="mx-auto w-full max-w-[1180px]">
                    <div className="lg:grid lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center lg:gap-24">
                        {/* ===== DESKTOP BRANDING ===== */}
                        <div className="hidden lg:block">
                            <div className="ln-in flex items-center gap-3">
                                <div
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ff7a59]/25"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, rgba(255,122,89,0.15), rgba(255,209,102,0.08))",
                                    }}
                                >
                                    <QrCode size={19} strokeWidth={1.7} className="text-[#ff9a78]" />
                                </div>
                                <div className="leading-tight">
                                    <p className="text-[15px] font-semibold tracking-tight text-[#faf6f0]">
                                        Check-in Event
                                    </p>
                                    <p className="mt-0.5 text-[12px] text-[#a39aae]">
                                        Gate Management
                                    </p>
                                </div>
                            </div>

                            <div className="mt-16 max-w-[540px] space-y-8">
                                <div
                                    className="ln-in inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[12px] text-[#c5bcc9] backdrop-blur-sm"
                                    style={{ animationDelay: ".08s" }}
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span
                                            className="absolute inline-flex h-full w-full rounded-full bg-[#7dd3a8]"
                                            style={{
                                                animation:
                                                    "bloom-pulse 2.4s ease-in-out infinite",
                                            }}
                                        />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7dd3a8]" />
                                    </span>
                                    Sistem aktif · 10 gate terhubung
                                </div>

                                <h1
                                    className="ln-in ln-serif text-[clamp(44px,4.6vw,62px)] font-medium leading-[1.03] tracking-[-0.02em] text-[#faf6f0]"
                                    style={{ animationDelay: ".16s" }}
                                >
                                    Pendataan peserta
                                    <br />
                                    <span
                                        style={{
                                            background:
                                                "linear-gradient(135deg, #ff9a78 0%, #ffd166 100%)",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                            backgroundClip: "text",
                                        }}
                                    >
                                        dengan presisi.
                                    </span>
                                </h1>

                                <p
                                    className="ln-in max-w-[460px] text-[15.5px] leading-[1.75] text-[#a39aae]"
                                    style={{ animationDelay: ".24s" }}
                                >
                                    Platform check-in terintegrasi untuk mengelola
                                    kehadiran peserta di seluruh gate secara real-time.
                                </p>

                                <div
                                    className="ln-in grid max-w-[480px] grid-cols-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
                                    style={{ animationDelay: ".32s" }}
                                >
                                    {[
                                        { v: "10", l: "Gate" },
                                        { v: "99.9%", l: "Uptime" },
                                        { v: "<1s", l: "Waktu scan" },
                                    ].map((s, i) => (
                                        <div
                                            key={s.l}
                                            className={`px-6 py-6 ${i < 2 ? "border-r border-white/[0.06]" : ""}`}
                                        >
                                            <p className="ln-serif text-[32px] font-medium leading-none tabular-nums text-[#faf6f0]">
                                                {s.v}
                                            </p>
                                            <p className="mt-2 text-[11.5px] text-[#a39aae]">
                                                {s.l}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="ln-in flex max-w-[480px] items-center justify-between"
                                    style={{ animationDelay: ".4s" }}
                                >
                                    <LiveClock />
                                    <span className="text-[12px] text-[#5c5568]">v1.0.0</span>
                                </div>
                            </div>
                        </div>

                        {/* ===== FORM ===== */}
                        <div className="ln-in" style={{ animationDelay: ".1s" }}>
                            <div
                                className="relative overflow-hidden rounded-[24px] border border-white/[0.08] p-6 backdrop-blur-xl lg:p-8"
                                style={{
                                    background:
                                        "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                                    boxShadow:
                                        "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 40px 80px -40px rgba(0,0,0,0.6), 0 20px 40px -20px rgba(255,122,89,0.08)",
                                }}
                            >
                                {/* Top edge highlight */}
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-8 top-0 h-px"
                                    style={{
                                        background:
                                            "linear-gradient(90deg, transparent, rgba(255,154,120,0.5), transparent)",
                                    }}
                                />

                                {/* Success overlay */}
                                {success && (
                                    <div
                                        className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 rounded-[24px] backdrop-blur-2xl"
                                        style={{
                                            background:
                                                "linear-gradient(180deg, rgba(13,10,15,0.96), rgba(13,10,15,0.98))",
                                            animation:
                                                "bloom-pop .4s cubic-bezier(.16,1,.3,1) both",
                                        }}
                                    >
                                        <div
                                            className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#7dd3a8]/30"
                                            style={{
                                                background:
                                                    "radial-gradient(circle, rgba(125,211,168,0.15), rgba(125,211,168,0.04))",
                                                boxShadow:
                                                    "0 0 40px rgba(125,211,168,0.35), inset 0 0 20px rgba(125,211,168,0.15)",
                                            }}
                                        >
                                            <span
                                                className="absolute inset-0 rounded-full"
                                                style={{
                                                    background:
                                                        "radial-gradient(circle, rgba(125,211,168,0.3), transparent 70%)",
                                                    animation:
                                                        "bloom-glow 1.6s ease-in-out infinite",
                                                }}
                                            />
                                            <svg
                                                width="34"
                                                height="34"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="relative text-[#7dd3a8]"
                                            >
                                                <path
                                                    d="M4 12.5l5 5L20 6.5"
                                                    style={{
                                                        strokeDasharray: 30,
                                                        strokeDashoffset: 30,
                                                        animation:
                                                            "bloom-check .5s cubic-bezier(.16,1,.3,1) .1s forwards",
                                                    }}
                                                />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[19px] font-semibold tracking-tight text-[#faf6f0]">
                                                Login berhasil
                                            </p>
                                            <p className="mt-1.5 text-[13px] text-[#a39aae]">
                                                Mengalihkan ke dashboard…
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="relative">
                                    {/* Heading */}
                                    <div className="mb-8">
                                        <div className="mb-4 flex items-center gap-2">
                                            <Sparkles
                                                size={13}
                                                strokeWidth={1.7}
                                                className="text-[#ff9a78]"
                                            />
                                            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a39aae]">
                                                Masuk Petugas
                                            </span>
                                        </div>
                                        <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] text-[#faf6f0] lg:text-[24px]">
                                            Selamat datang kembali
                                        </h2>
                                        <p className="mt-2 text-[13.5px] leading-relaxed text-[#a39aae]">
                                            Silakan masuk untuk memulai sesi shift Anda.
                                        </p>
                                    </div>

                                    <form onSubmit={handleLogin} className="space-y-5">
                                        {/* Email */}
                                        <div className="space-y-2.5">
                                            <label htmlFor="email" className={labelClass}>
                                                Email
                                            </label>
                                            <div className="group/f relative">
                                                <Mail
                                                    size={17}
                                                    strokeWidth={1.6}
                                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5c5568] transition-colors duration-300 group-focus-within/f:text-[#ff9a78]"
                                                />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    autoComplete="off"
                                                    inputMode="email"
                                                    placeholder="nama@event.com"
                                                    className={`${inputClass} pl-12 pr-4`}
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-2.5">
                                            <label htmlFor="password" className={labelClass}>
                                                Password
                                            </label>
                                            <div className="group/p relative">
                                                <Lock
                                                    size={17}
                                                    strokeWidth={1.6}
                                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5c5568] transition-colors duration-300 group-focus-within/p:text-[#ff9a78]"
                                                />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    autoComplete="off"
                                                    placeholder="••••••••"
                                                    className={`${inputClass} pl-12 pr-12`}
                                                />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() =>
                                                        setShowPassword(!showPassword)
                                                    }
                                                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#5c5568] transition-all duration-300 hover:bg-white/[0.06] hover:text-[#faf6f0]"
                                                    aria-label="Toggle password"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff size={16} strokeWidth={1.6} />
                                                    ) : (
                                                        <Eye size={16} strokeWidth={1.6} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div
                                            className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] px-3.5 py-3"
                                            style={{
                                                background:
                                                    "linear-gradient(135deg, rgba(255,122,89,0.04), rgba(255,209,102,0.02))",
                                            }}
                                        >
                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ff7a59]/15">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#ff9a78]" />
                                            </span>
                                            <p className="text-[12.5px] leading-relaxed text-[#a39aae]">
                                                Gate Anda ditetapkan otomatis sesuai penugasan.
                                            </p>
                                        </div>

                                        {/* Error */}
                                        {error && (
                                            <div
                                                role="alert"
                                                className="flex items-start gap-2.5 rounded-2xl border border-[#fb7185]/25 bg-[#fb7185]/[0.07] px-3.5 py-3"
                                                style={{
                                                    animation:
                                                        "bloom-shake .45s cubic-bezier(.36,.07,.19,.97) both",
                                                }}
                                            >
                                                <AlertCircle
                                                    size={15}
                                                    strokeWidth={2}
                                                    className="mt-0.5 shrink-0 text-[#fb7185]"
                                                />
                                                <p className="text-[13px] leading-relaxed text-[#fecaca]">
                                                    {error}
                                                </p>
                                            </div>
                                        )}

                                        {/* Submit */}
                                        <Button
                                            type="submit"
                                            disabled={loading || success}
                                            className="group/btn relative h-[52px] w-full overflow-hidden rounded-2xl border-0 text-[14.5px] font-semibold text-[#1a0e08] transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                                            style={{
                                                background:
                                                    "linear-gradient(135deg, #ffb088 0%, #ff9a78 45%, #ff8a6a 100%)",
                                                boxShadow:
                                                    "0 1px 0 0 rgba(255,255,255,0.4) inset, 0 12px 32px -10px rgba(255,122,89,0.5), 0 4px 12px -4px rgba(255,122,89,0.3)",
                                            }}
                                        >
                                            <span
                                                aria-hidden
                                                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full"
                                            />
                                            {loading ? (
                                                <span className="relative flex items-center gap-2.5">
                                                    <span
                                                        className="h-4 w-4 rounded-full border-[1.8px] border-[#1a0e08]/25 border-t-[#1a0e08]"
                                                        style={{
                                                            animation:
                                                                "bloom-spin .7s linear infinite",
                                                        }}
                                                    />
                                                    <span>Memverifikasi…</span>
                                                </span>
                                            ) : (
                                                <span className="relative flex items-center gap-2">
                                                    <LogIn size={16} strokeWidth={2.2} />
                                                    Masuk
                                                </span>
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            </div>

                            {/* Footer desktop */}
                            <div className="mt-6 hidden items-center justify-center gap-3 text-[11.5px] text-[#5c5568] lg:flex">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck size={12} strokeWidth={1.6} />
                                    Sesi terenkripsi
                                </span>
                                <span className="h-3 w-px bg-white/[0.08]" />
                                <span>© 2026 Check-in System</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer mobile */}
            <footer className="relative z-10 flex items-center justify-center gap-3 pb-7 pt-8 text-[11px] text-[#5c5568] lg:hidden">
                <span className="flex items-center gap-1.5">
                    <ShieldCheck size={11} strokeWidth={1.6} />
                    Sesi terenkripsi
                </span>
                <span className="h-3 w-px bg-white/[0.08]" />
                <span>© 2026</span>
            </footer>
        </div>
    );
}