// app/login/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocFromServer,
    getDocs,
    limit,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { saveSession, loadSession, SessionRole } from "@/lib/session";
import {
    ArrowRight, Eye, EyeOff, ShieldCheck, QrCode,
    MapPin, WifiOff, Check, Lock, Mail, Ticket,
} from "lucide-react";

const globalStyles = `
  input::-ms-reveal, input::-ms-clear { display: none; }
  input::-webkit-contacts-auto-fill-button, input::-webkit-credentials-auto-fill-button {
    visibility: hidden; display: none !important; pointer-events: none;
  }
  .noise-bg {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.03;
  }
`;

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

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

type DbUser = {
    id: string;
    email: string;
    name: string;
    role: SessionRole;
    assigned_gate: string | null;
};

function redirectByRole(role: SessionRole, router: ReturnType<typeof useRouter>) {
    if (role === "super_admin") router.replace("/dashboard/super-admin");
    else if (role === "admin") router.replace("/dashboard/admin");
    else router.replace("/");
}

function translateAuthError(code?: string): string {
    switch (code) {
        case "auth/invalid-email":
            return "Format email tidak valid";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Email atau password salah";
        case "auth/too-many-requests":
            return "Terlalu banyak percobaan login. Coba lagi nanti.";
        case "auth/network-request-failed":
            return "Gagal terhubung ke server. Periksa koneksi.";
        case "auth/user-disabled":
            return "Akun ini telah dinonaktifkan.";
        default:
            return "Email atau password salah";
    }
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [matchedUser, setMatchedUser] = useState<DbUser | null>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const online = useNetworkStatus();

    useEffect(() => {
        const s = loadSession();
        if (s) {
            redirectByRole(s.role, router);
            return;
        }
        try {
            const saved = localStorage.getItem("checkin:remember_email");
            if (saved) {
                setEmail(saved);
                setRemember(true);
            }
        } catch {}
    }, [router]);

    useEffect(() => {
        const e = email.trim().toLowerCase();
        if (!isValidEmail(e)) {
            setMatchedUser(null);
            return;
        }

        let cancelled = false;

        const t = setTimeout(async () => {
            try {
                const snap = await getDocs(
                    query(collection(db, "users"), where("email", "==", e), limit(1))
                );
                if (cancelled) return;
                if (!snap.empty) {
                    const d = snap.docs[0];
                    setMatchedUser({
                        id: d.id,
                        ...(d.data() as Omit<DbUser, "id">),
                    });
                } else {
                    setMatchedUser(null);
                }
            } catch (err) {
                console.warn("Preview user gagal:", err);
                if (!cancelled) setMatchedUser(null);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [email]);

    const handleLogin = async (ev: React.FormEvent) => {
        ev.preventDefault();
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

        try {
            const cred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            const uid = cred.user.uid;

            const userRef = doc(db, "users", uid);
            let userSnap;

            try {
                userSnap = await getDocFromServer(userRef);
            } catch (e: any) {
                userSnap = await getDoc(userRef);
            }

            if (!userSnap.exists()) {
                const defaultData = {
                    email: cred.user.email || trimmedEmail,
                    name: cred.user.displayName || "Super Admin", 
                    role: "super_admin", 
                    assigned_gate: "",
                };
                await setDoc(userRef, defaultData);
                userSnap = await getDoc(userRef);
            }

            const data = userSnap.data() as Omit<DbUser, "id">;
            const role = data.role;

            try {
                if (remember) {
                    localStorage.setItem("checkin:remember_email", trimmedEmail);
                } else {
                    localStorage.removeItem("checkin:remember_email");
                }
            } catch {}

            saveSession({
                userId: uid,
                name: data.name ?? trimmedEmail,
                email: data.email ?? trimmedEmail,
                role,
                gate: data.assigned_gate ?? "",
                loginAt: new Date().toISOString(),
            });

            setLoading(false);
            setSuccess(true);
            setTimeout(() => redirectByRole(role, router), 1000);
            
        } catch (err: any) {
            console.error("Login Gagal:", err);
            if (err.code && err.code.startsWith("auth/")) {
                setError(translateAuthError(err.code));
            } else {
                setError(`Error Sistem: ${err.message || "Gagal terhubung ke database"}`);
            }
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] flex-col justify-end bg-[#09090b] text-white selection:bg-emerald-500/30 overflow-hidden">
            <style>{globalStyles}</style>
            <div className="noise-bg pointer-events-none fixed inset-0 z-0"></div>

            <div className="relative z-10 flex flex-1 flex-col justify-between p-6 pb-12 sm:p-8">
                <div className="flex items-center justify-between relative z-20">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md border border-white/5">
                            <QrCode size={16} className="text-white" />
                        </div>
                        <span className="text-[15px] font-bold tracking-tight">Check-in</span>
                    </div>
                    {!online && (
                        <div className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-red-400 border border-red-500/20">
                            <WifiOff size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Offline</span>
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[30%] -left-[10%] h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[80px]"></div>
                    <svg className="absolute top-[10%] right-[-20%] h-[400px] w-[400px] opacity-[0.03]" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="none" stroke="white" strokeWidth="1" d="M42.7,-72.3C55.9,-66.1,67.3,-55.8,75.5,-43.1C83.7,-30.4,88.7,-15.2,88.1,-0.3C87.4,14.5,81.1,29,72.8,42.3C64.5,55.5,54.1,67.4,41.2,74.7C28.4,82,14.2,84.7,-0.9,86.2C-15.9,87.8,-31.8,88.2,-45.2,81.5C-58.6,74.8,-69.5,61,-76.3,45.8C-83.1,30.5,-85.7,15.3,-85.6,0C-85.5,-15.2,-82.7,-30.5,-75.1,-43.5C-67.4,-56.5,-54.8,-67.1,-41,-73.1C-27.1,-79.1,-13.6,-80.5,0.8,-81.9C15.2,-83.3,30.4,-84.6,42.7,-72.3Z" transform="translate(100 100) scale(1.1)" />
                    </svg>
                    <div className="absolute top-[20%] right-4 w-32 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 p-3 shadow-2xl transform rotate-12 opacity-60">
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                            <Ticket size={14} className="text-emerald-400" />
                            <span className="text-[8px] font-mono text-zinc-500">#EVT-01</span>
                        </div>
                        <div className="h-1.5 w-12 bg-white/20 rounded-full mb-1.5"></div>
                        <div className="h-1.5 w-8 bg-white/10 rounded-full"></div>
                    </div>
                </div>

                <div className="relative z-10 mt-16 sm:mt-24">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 mb-6 backdrop-blur-sm">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Panitia Access</span>
                    </div>
                    <h1 className="text-[52px] font-black leading-[1.05] tracking-tighter text-white sm:text-[64px]">
                        Selamat<br />Datang<span className="text-emerald-500">.</span>
                    </h1>
                    <p className="mt-5 max-w-[280px] text-[15px] font-medium leading-relaxed text-zinc-400">
                        Masuk ke akun panitia Anda untuk mulai mengelola kehadiran dan jalannya event.
                    </p>
                </div>
            </div>

            <div className="relative z-20 w-full rounded-t-[2.5rem] bg-[#121214]/60 p-6 pt-8 sm:p-10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-white/10 backdrop-blur-3xl overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]"></div>
                <div className="pointer-events-none absolute -top-20 -right-10 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]"></div>

                <div className="relative z-10 mx-auto max-w-[420px]">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <div className="relative flex items-center group">
                                <Mail size={18} className="absolute left-5 text-zinc-400 group-focus-within:text-emerald-400 transition-colors" />
                                <input
                                    ref={emailRef}
                                    id="email"
                                    name="email"
                                    type="text" 
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                                    autoComplete="username"
                                    spellCheck={false}
                                    disabled={loading || success}
                                    placeholder="Alamat Email"
                                    className="h-[56px] w-full rounded-2xl border border-white/10 bg-black/40 pl-12 pr-12 text-[15px] font-medium text-white outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-500/50 focus:bg-black/60 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                                />
                                {matchedUser && (
                                    <div className="absolute right-5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                                        <Check size={12} strokeWidth={3} className="text-emerald-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {matchedUser && (
                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                                    {matchedUser.role === "super_admin" ? <ShieldCheck size={14} /> : <MapPin size={14} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[9.5px] font-bold uppercase tracking-widest text-emerald-500">
                                        {matchedUser.role === "super_admin" ? "Super Admin" : "Admin Gate"}
                                    </p>
                                    <p className="mt-0.5 truncate text-[13px] font-semibold text-zinc-200">
                                        {matchedUser.name}
                                        {matchedUser.assigned_gate && (
                                            <span className="ml-1.5 text-[11px] text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded">
                                                {matchedUser.assigned_gate}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <div className="relative flex items-center group">
                                <Lock size={18} className="absolute left-5 text-zinc-400 group-focus-within:text-emerald-400 transition-colors" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                                    autoComplete="current-password"
                                    disabled={loading || success}
                                    placeholder="Kata Sandi"
                                    className="h-[56px] w-full rounded-2xl border border-white/10 bg-black/40 pl-12 pr-12 text-[15px] font-medium text-white outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-500/50 focus:bg-black/60 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex cursor-pointer select-none items-center gap-2">
                                <div className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${remember ? "border-emerald-500 bg-emerald-500" : "border-zinc-500 bg-transparent"}`}>
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                    {remember && <Check size={10} strokeWidth={3.5} className="text-white" />}
                                </div>
                                <span className="text-[12.5px] font-medium text-zinc-300">Ingat saya</span>
                            </label>
                            <a href="#" className="text-[12.5px] font-semibold text-emerald-500 hover:text-emerald-400">
                                Lupa Sandi?
                            </a>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 animate-in shake duration-300">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">!</span>
                                <p className="text-[12.5px] font-medium text-red-300">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || success || !online}
                            className="group relative mt-2 flex h-[56px] w-full items-center justify-center overflow-hidden rounded-2xl bg-white text-[15px] font-bold tracking-tight text-black transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2.5">
                                    <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                                    <span>Memverifikasi...</span>
                                </span>
                            ) : !online ? (
                                <span className="flex items-center gap-2"><WifiOff size={16} /><span>Offline</span></span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span>Masuk ke Dashboard</span>
                                    <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" />
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-[11px] font-medium leading-relaxed text-zinc-500">
                        Dengan masuk, Anda menyetujui <br />
                        <span className="text-zinc-300 hover:text-white cursor-pointer transition-colors">Syarat & Ketentuan</span> kami.
                    </p>
                </div>
            </div>

            {success && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b]/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                        <Check size={36} strokeWidth={3} className="text-white" />
                    </div>
                    <p className="mt-6 text-[20px] font-bold text-white">Berhasil Masuk</p>
                    <p className="mt-1 text-[13px] font-medium text-zinc-300">Menyiapkan dashboard...</p>
                </div>
            )}
        </div>
    );
}