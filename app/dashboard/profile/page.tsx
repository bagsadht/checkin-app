// app/dashboard/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { loadSession, clearSession, Session } from "@/lib/session";
import { User, Mail, Shield, MapPin, LogOut, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<Session | null>(null);
    const [copied, setCopied] = useState(false);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        const s = loadSession();
        if (s) setUser(s);
    }, []);

    const handleLogout = () => {
        clearSession();
        router.replace("/login");
    };

    const handleCopyEmail = () => {
        if (!user) return;
        navigator.clipboard.writeText(user.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-md space-y-4">
                <div className="h-56 animate-pulse rounded-[2rem] bg-white/5" />
                <div className="h-64 animate-pulse rounded-[2rem] bg-white/5" />
            </div>
        );
    }

    const roleLabel = user.role.replace("_", " ");

    const rows = [
        { icon: User, label: "Nama lengkap", value: user.name, tone: "bg-indigo-500/15 text-indigo-400" },
        { icon: Mail, label: "Email", value: user.email, tone: "bg-sky-500/15 text-sky-400", copy: true },
        { icon: Shield, label: "Role", value: roleLabel, tone: "bg-emerald-500/15 text-emerald-400", capitalize: true },
        { icon: MapPin, label: "Gate tugas", value: user.gate || "Semua Gate", tone: "bg-amber-500/15 text-amber-400" },
    ];

    return (
        <div className="mx-auto w-full max-w-md space-y-5 pb-6">

            {/* HERO */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
                <div className="h-24 bg-gradient-to-br from-emerald-500/40 via-teal-500/25 to-transparent" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" />

                <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#0B1120] bg-gradient-to-tr from-emerald-600 to-teal-400 text-[36px] font-black text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                        {user.name.charAt(0).toUpperCase()}
                        <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[#0B1120] bg-emerald-500" />
                    </div>

                    <h2 className="mt-4 text-xl font-bold text-white">{user.name}</h2>
                    <p className="mt-1 text-[13px] font-medium text-slate-400">{user.email}</p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            {roleLabel}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400">
                            <MapPin size={11} /> {user.gate || "Semua Gate"}
                        </span>
                    </div>
                </div>
            </div>

            {/* INFO AKUN */}
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-xl">
                {rows.map((r, i) => {
                    const Icon = r.icon;
                    return (
                        <div
                            key={r.label}
                            className={`group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.04] ${i !== rows.length - 1 ? "" : ""}`}
                        >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.tone}`}>
                                <Icon size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold text-slate-500">{r.label}</p>
                                <p className={`truncate text-[14px] font-medium text-white ${r.capitalize ? "capitalize" : ""}`}>{r.value}</p>
                            </div>
                            {r.copy && (
                                <button
                                    type="button"
                                    onClick={handleCopyEmail}
                                    aria-label="Salin email"
                                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-all active:scale-95 ${
                                        copied
                                            ? "bg-emerald-500/15 text-emerald-400"
                                            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    {copied ? <Check size={13} /> : <Copy size={13} />}
                                    {copied ? "Tersalin" : "Salin"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* KELUAR (dua langkah) */}
            {!confirming ? (
                <button
                    onClick={() => setConfirming(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-[2rem] border border-red-500/20 bg-red-500/10 py-4 text-[15px] font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.98]"
                >
                    <LogOut size={18} /> Keluar dari Akun
                </button>
            ) : (
                <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-4">
                    <p className="mb-3 text-center text-[14px] font-semibold text-red-300">Yakin ingin keluar?</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setConfirming(false)}
                            className="rounded-2xl bg-white/5 py-3 text-[14px] font-semibold text-slate-300 transition-all hover:bg-white/10 active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-[14px] font-bold text-white transition-all hover:bg-red-400 active:scale-95"
                        >
                            <LogOut size={16} /> Keluar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}