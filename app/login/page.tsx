// app/login/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, loadSession } from "@/lib/session";
import { mockPetugas } from "@/lib/mockData";
import {
    QrCode,
    ArrowRight,
    Eye,
    EyeOff,
    ShieldCheck,
    MapPin,
    Wifi,
    WifiOff,
    Check,
} from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.ln-root {
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-feature-settings: 'cv02','cv03','cv04','cv11';
}

@keyframes ln-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ln-shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-4px); }
  75%     { transform: translateX(4px); }
}
@keyframes pulse-ring {
  0%   { transform: scale(1); opacity: .6; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes ln-spin {
  to { transform: rotate(360deg); }
}
@keyframes success-ring {
  0%   { transform: scale(.8); opacity: 1; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes success-scale {
  0%   { transform: scale(.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes progress-fill {
  from { width: 0%; }
  to   { width: 100%; }
}
@keyframes chip-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes check-pop {
  0%   { transform: scale(0); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.ln-in { animation: ln-in .6s cubic-bezier(.16,1,.3,1) both; }

@media (prefers-reduced-motion: reduce) {
  .ln-root *, .ln-root *::before, .ln-root *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

/* ---------- Constants ---------- */

const BUILD_VERSION = "1.2.4";
const BUILD_DATE = "Okt 2026";
const STORAGE_REMEMBER = "checkin:remember_email";

/* ---------- Helpers ---------- */

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 4) return "Selamat malam";
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 19) return "Selamat sore";
    return "Selamat malam";
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/* ---------- Network Status Hook ---------- */

function useNetworkStatus() {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        if (typeof window === "undefined") return;
        setOnline(navigator.onLine);

        const on = () => setOnline(true);
        const off = () => setOnline(false);

        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);

    return online;
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [greeting, setGreeting] = useState("Selamat datang");

    const emailRef = useRef<HTMLInputElement>(null);
    const online = useNetworkStatus();

    /* ---------- Auto-fill from remember ---------- */
    useEffect(() => {
        setGreeting(getGreeting());

        const s = loadSession();
        if (s) {
            window.location.href = "/checkin";
            return;
        }

        // Load remembered email
        try {
            const saved = localStorage.getItem(STORAGE_REMEMBER);
            if (saved) {
                setEmail(saved);
                setRemember(true);
            }
        } catch {}

        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            setTimeout(() => emailRef.current?.focus(), 100);
        }
    }, []);

    /* ---------- Detect assigned gate saat email valid ---------- */
    const matchedPetugas = (() => {
        const e = email.trim().toLowerCase();
        if (!isValidEmail(e)) return null;
        return (
            mockPetugas.find((p) => p.email.toLowerCase() === e) ?? null
        );
    })();

    /* ---------- Login ---------- */
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!online) {
            setError("Tidak ada koneksi internet");
            return;
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!isValidEmail(trimmedEmail)) {
            setError("Format email tidak valid");
            return;
        }
        if (trimmedPassword.length < 4) {
            setError("Password minimal 4 karakter");
            return;
        }

        setLoading(true);

        setTimeout(() => {
            const petugas = mockPetugas.find(
                (p) =>
                    p.email.toLowerCase() === trimmedEmail &&
                    p.password === trimmedPassword
            );

            if (!petugas) {
                setError("Email atau password salah");
                setLoading(false);
                return;
            }

            // Save remember preference
            try {
                if (remember) {
                    localStorage.setItem(STORAGE_REMEMBER, trimmedEmail);
                } else {
                    localStorage.removeItem(STORAGE_REMEMBER);
                }
            } catch {}

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
            }, 900);
        }, 500);
    };

    return (
        <div className="ln-root relative min-h-screen bg-[#0a0a0a] text-[#fafafa] antialiased">
            <style>{STYLES}</style>

            {/* ============ CONTENT ============ */}
            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pb-8 pt-7 sm:px-7">
                {/* ---------- TOP BAR ---------- */}
                <header className="ln-in flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1c1c1c]">
                            <QrCode
                                size={16}
                                strokeWidth={2}
                                className="text-[#fafafa]"
                            />
                        </div>
                        <div className="leading-none">
                            <p className="text-[13px] font-semibold tracking-tight text-[#fafafa]">
                                Check-in
                            </p>
                            <p className="mt-1 text-[10.5px] text-[#737373]">
                                Gate Management
                            </p>
                        </div>
                    </div>

                    {/* Network status — real-time, berubah otomatis */}
                    <div
                        className={`flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3 transition-colors duration-300 ${
                            online
                                ? "border-[#262626] bg-[#141414]"
                                : "border-[#7f1d1d]/60 bg-[#7f1d1d]/15"
                        }`}
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            {online ? (
                                <>
                                    <span
                                        className="absolute inline-flex h-full w-full rounded-full bg-[#737373]"
                                        style={{
                                            animation:
                                                "pulse-ring 2.4s cubic-bezier(.4,0,.6,1) infinite",
                                        }}
                                    />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#a3a3a3]" />
                                </>
                            ) : (
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                            )}
                        </span>
                        <span
                            className={`text-[11px] font-medium ${
                                online ? "text-[#a3a3a3]" : "text-[#fca5a5]"
                            }`}
                        >
                            {online ? "Online" : "Offline"}
                        </span>
                    </div>
                </header>

                {/* ---------- HERO ---------- */}
                <div className="flex-1 pt-14 sm:pt-16">
                    <div className="ln-in" style={{ animationDelay: ".08s" }}>
                        <p className="text-[13.5px] font-medium text-[#f59e0b]">
                            {greeting}
                        </p>
                        <h1 className="mt-3 text-[42px] font-bold leading-[1.03] tracking-[-0.04em] text-[#fafafa] sm:text-[46px]">
                            Masuk ke
                            <br />
                            <span className="text-[#525252]">gate Anda.</span>
                        </h1>
                        <p className="mt-5 max-w-[320px] text-[15px] leading-[1.6] text-[#737373]">
                            Gunakan kredensial petugas untuk memulai sesi
                            check-in.
                        </p>
                    </div>

                    {/* ---------- FORM ---------- */}
                    <form
                        onSubmit={handleLogin}
                        className="ln-in mt-10 space-y-4"
                        style={{ animationDelay: ".16s" }}
                    >
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-[12.5px] font-medium text-[#a3a3a3]"
                            >
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    ref={emailRef}
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    autoComplete="email"
                                    inputMode="email"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    disabled={loading || success}
                                    placeholder="nama@event.com"
                                    className="h-14 w-full rounded-2xl border border-[#262626] bg-[#141414] px-4 pr-12 text-[15px] text-[#fafafa] outline-none transition-all duration-200 placeholder:text-[#525252] hover:border-[#3a3a3a] focus:border-[#404040] focus:bg-[#181818] focus:ring-2 focus:ring-white/[0.04] disabled:opacity-60"
                                />
                                {/* Check mark kalau email cocok */}
                                {matchedPetugas && (
                                    <span
                                        className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#1c1c1c]"
                                        style={{
                                            animation:
                                                "check-pop .3s cubic-bezier(.34,1.56,.64,1) both",
                                        }}
                                    >
                                        <Check
                                            size={11}
                                            strokeWidth={3}
                                            className="text-[#f59e0b]"
                                        />
                                    </span>
                                )}
                            </div>

                            {/* ============ FEATURE: GATE PREVIEW ============ */}
                            {matchedPetugas && (
                                <div
                                    className="mt-3 flex items-center gap-2.5 rounded-2xl border border-[#262626] bg-[#0a0a0a] px-3.5 py-2.5"
                                    style={{
                                        animation:
                                            "chip-in .35s cubic-bezier(.16,1,.3,1) both",
                                    }}
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1c1c1c]">
                                        <MapPin
                                            size={13}
                                            strokeWidth={2.2}
                                            className="text-[#a3a3a3]"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#737373]">
                                            Akan ditugaskan
                                        </p>
                                        <p className="mt-0.5 truncate text-[13px] font-semibold text-[#fafafa]">
                                            {matchedPetugas.assigned_gate}
                                            <span className="ml-2 font-normal text-[#737373]">
                                                · {matchedPetugas.name}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-[12.5px] font-medium text-[#a3a3a3]"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={
                                        showPassword ? "text" : "password"
                                    }
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    autoComplete="current-password"
                                    disabled={loading || success}
                                    placeholder="••••••••"
                                    className="h-14 w-full rounded-2xl border border-[#262626] bg-[#141414] pl-4 pr-12 text-[15px] text-[#fafafa] outline-none transition-all duration-200 placeholder:text-[#525252] hover:border-[#3a3a3a] focus:border-[#404040] focus:bg-[#181818] focus:ring-2 focus:ring-white/[0.04] disabled:opacity-60"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#737373] transition-colors duration-200 hover:bg-[#1c1c1c] hover:text-[#fafafa]"
                                    aria-label={
                                        showPassword
                                            ? "Sembunyikan password"
                                            : "Tampilkan password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff
                                            size={16}
                                            strokeWidth={1.9}
                                        />
                                    ) : (
                                        <Eye
                                            size={16}
                                            strokeWidth={1.9}
                                        />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ============ FEATURE: REMEMBER ME ============ */}
                        <label className="flex cursor-pointer select-none items-center gap-2.5 py-1">
                            <span
                                className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                                    remember
                                        ? "border-[#f59e0b] bg-[#f59e0b]"
                                        : "border-[#3a3a3a] bg-transparent"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) =>
                                        setRemember(e.target.checked)
                                    }
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                />
                                {remember && (
                                    <Check
                                        size={12}
                                        strokeWidth={3.2}
                                        className="text-[#0a0a0a]"
                                    />
                                )}
                            </span>
                            <span className="text-[13px] text-[#a3a3a3]">
                                Ingat email saya di perangkat ini
                            </span>
                        </label>

                        {/* Error */}
                        {error && (
                            <div
                                role="alert"
                                className="flex items-center gap-2.5 rounded-2xl border border-[#3a3a3a] bg-[#1a1a1a] px-4 py-3"
                                style={{
                                    animation:
                                        "ln-shake .35s cubic-bezier(.36,.07,.19,.97) both",
                                }}
                            >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#262626]">
                                    <span className="text-[12px] font-bold text-[#fafafa]">
                                        !
                                    </span>
                                </span>
                                <p className="text-[13px] font-medium text-[#d4d4d4]">
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* CTA — satu-satunya amber */}
                        <button
                            type="submit"
                            disabled={loading || success || !online}
                            className="group relative mt-2 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#f59e0b] text-[15.5px] font-bold tracking-tight text-[#0a0a0a] transition-all duration-200 hover:bg-[#fbbf24] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading && (
                                <span
                                    className="absolute inset-y-0 left-0 bg-[#d97706]/40"
                                    style={{
                                        animation:
                                            "progress-fill 1.5s cubic-bezier(.4,0,.2,1) infinite",
                                    }}
                                />
                            )}

                            {loading ? (
                                <span className="relative flex items-center gap-2.5">
                                    <span
                                        className="h-4 w-4 rounded-full border-[2px] border-[#0a0a0a]/30 border-t-[#0a0a0a]"
                                        style={{
                                            animation:
                                                "ln-spin .65s linear infinite",
                                        }}
                                    />
                                    <span>Memverifikasi…</span>
                                </span>
                            ) : !online ? (
                                <span className="relative flex items-center gap-2">
                                    <WifiOff size={17} strokeWidth={2.4} />
                                    <span>Tidak ada koneksi</span>
                                </span>
                            ) : (
                                <span className="relative flex items-center gap-2">
                                    <span>Masuk</span>
                                    <ArrowRight
                                        size={17}
                                        strokeWidth={2.6}
                                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                                    />
                                </span>
                            )}
                        </button>
                    </form>

                    {/* ---------- SECURITY NOTE ---------- */}
                    <div
                        className="ln-in mt-8 flex items-center gap-2.5"
                        style={{ animationDelay: ".24s" }}
                    >
                        <ShieldCheck
                            size={14}
                            strokeWidth={1.7}
                            className="shrink-0 text-[#525252]"
                        />
                        <p className="text-[12px] leading-relaxed text-[#737373]">
                            Gate tugas Anda ditetapkan otomatis dari akun
                            petugas.
                        </p>
                    </div>
                </div>

                {/* ---------- FOOTER dengan info build ---------- */}
                <footer
                    className="ln-in mt-10 flex items-center justify-between text-[11px] text-[#525252]"
                    style={{ animationDelay: ".3s" }}
                >
                    <span>© 2026 Check-in System</span>
                    <span className="flex items-center gap-2 tabular-nums">
                        <span>v{BUILD_VERSION}</span>
                        <span className="h-2.5 w-px bg-[#262626]" />
                        <span>{BUILD_DATE}</span>
                    </span>
                </footer>
            </div>

            {/* ============ SUCCESS OVERLAY ============ */}
            {success && (
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]/98"
                    style={{
                        animation:
                            "success-scale .5s cubic-bezier(.16,1,.3,1) both",
                    }}
                >
                    <div className="relative flex h-24 w-24 items-center justify-center">
                        <span
                            className="absolute inset-0 rounded-full bg-[#262626]"
                            style={{
                                animation:
                                    "success-ring 1.6s ease-out infinite",
                            }}
                        />
                        <span
                            className="absolute inset-0 rounded-full bg-[#262626]"
                            style={{
                                animation:
                                    "success-ring 1.6s ease-out .35s infinite",
                            }}
                        />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#f59e0b]">
                            <svg
                                width="34"
                                height="34"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0a0a0a"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M5 12.5l4.5 4.5L19 7" />
                            </svg>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-[19px] font-semibold tracking-tight text-[#fafafa]">
                            Berhasil masuk
                        </p>
                        <p className="mt-2 text-[13px] text-[#737373]">
                            Menyiapkan dashboard…
                        </p>
                    </div>

                    <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-[#1c1c1c]">
                        <div
                            className="h-full rounded-full bg-[#f59e0b]"
                            style={{
                                animation:
                                    "progress-fill 1s cubic-bezier(.4,0,.2,1) forwards",
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}