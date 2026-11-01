// app/dashboard/scan/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    limit, 
    addDoc, 
    serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { loadSession } from "@/lib/session";
import QrScanner from "@/components/QrScanner";
import ScanResult, { ScanStatus } from "@/components/ScanResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Search, User, Phone, MapPin, Tag, Users,
    CheckCircle2, AlertTriangle, XCircle, RefreshCw, Camera, ScanLine, Clock,
} from "lucide-react";

type Participant = { id: string; name: string; phone: string; community: string; category: string; assigned_gate: string; qr_token: string; };
type Notification = { id: number; status: ScanStatus; participantName?: string; community?: string; category?: string; gate?: string; message: string; };
type ResultState = { type: "idle" } | { type: "found"; participant: Participant; alreadyCheckedIn: boolean } | { type: "notfound"; message: string } | { type: "error"; message: string };
type HistoryItem = { id: number; name: string; status: "success" | "duplicate" | "invalid"; at: string };

const HISTORY_STYLE = {
    success: { dot: "bg-emerald-500", text: "text-emerald-400", label: "Berhasil" },
    duplicate: { dot: "bg-amber-500", text: "text-amber-400", label: "Sudah check-in" },
    invalid: { dot: "bg-red-500", text: "text-red-400", label: "Tidak valid" },
} as const;

const STYLES = `
.scan-pop { animation: scan-pop .5s ease-out both; }
@keyframes scan-pop {
  0%   { transform: scale(.6); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) { .scan-pop { animation: none; } }
`;

export default function ScanPage() {
    const [qrInput, setQrInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState>({ type: "idle" });
    const [notification, setNotification] = useState<Notification | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [session, setSession] = useState<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const notifyIdRef = useRef(0);

    useEffect(() => {
        setSession(loadSession());
        setTimeout(() => inputRef.current?.focus(), 200);
    }, []);

    const showNotification = (n: Omit<Notification, "id">) => {
        notifyIdRef.current += 1;
        setNotification({ ...n, id: notifyIdRef.current });
    };

    const pushHistory = (name: string, status: HistoryItem["status"]) => {
        setHistory((prev) =>
            [{ id: Date.now() + Math.random(), name, status, at: new Date().toISOString() }, ...prev].slice(0, 5)
        );
    };

    const handleLookup = async (token: string) => {
        const cleanToken = token.trim().toUpperCase();
        if (!cleanToken) return;

        setLoading(true);
        setResult({ type: "idle" });

        try {
            /* 1) Cari peserta berdasarkan qr_token */
            const pQuery = query(
                collection(db, "participants"),
                where("qr_token", "==", cleanToken),
                limit(1)
            );
            const pSnap = await getDocs(pQuery);

            if (pSnap.empty) {
                setResult({ type: "notfound", message: `Token "${cleanToken}" tidak ditemukan` });
                showNotification({ status: "invalid", message: `QR token tidak ditemukan` });
                pushHistory(cleanToken, "invalid");
                setLoading(false); 
                inputRef.current?.focus(); 
                return;
            }

            const pDoc = pSnap.docs[0];
            const participant = { id: pDoc.id, ...pDoc.data() } as Participant;

            /* 2) Cek apakah peserta sudah pernah check-in */
            const cQuery = query(
                collection(db, "checkins"),
                where("participant_id", "==", participant.id),
                limit(1)
            );
            const cSnap = await getDocs(cQuery);
            const alreadyCheckedIn = !cSnap.empty;

            setResult({ type: "found", participant, alreadyCheckedIn });

            /* 3) Jika belum check-in, simpan data ke collection checkins */
            if (!alreadyCheckedIn) {
                try {
                    await addDoc(collection(db, "checkins"), {
                        participant_id: participant.id,
                        gate: participant.assigned_gate,
                        scanned_by: session?.name ?? "Unknown",
                        method: "scan",
                        scanned_at: serverTimestamp(), // Menggunakan format waktu Firebase
                    });
                    
                    showNotification({ 
                        status: "success", 
                        participantName: participant.name, 
                        gate: participant.assigned_gate, 
                        message: "Berhasil check-in" 
                    });
                    pushHistory(participant.name, "success");
                } catch (insertErr: any) {
                    setResult({ type: "error", message: insertErr.message });
                    setLoading(false);
                    return;
                }
            } else {
                showNotification({ 
                    status: "duplicate", 
                    participantName: participant.name, 
                    gate: participant.assigned_gate, 
                    message: "Sudah check-in" 
                });
                pushHistory(participant.name, "duplicate");
            }
        } catch (err: any) {
            console.error("Scan error:", err);
            setResult({ type: "error", message: err.message || "Terjadi kesalahan sistem." });
        } finally {
            setLoading(false); 
            setQrInput(""); 
            inputRef.current?.focus();
        }
    };

    const reset = () => setResult({ type: "idle" });
    const hasResult = loading || result.type !== "idle";

    return (
        <div className="space-y-6 pb-10 w-full">
            <style>{STYLES}</style>

            {notification && (
                <ScanResult key={notification.id} status={notification.status} participantName={notification.participantName} gate={notification.gate} message={notification.message} onDismiss={() => setNotification(null)} />
            )}

            <div className="flex items-center gap-3 px-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <ScanLine size={22} />
                </div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Scan Tiket</h1>
                    <p className="mt-0.5 text-[13px] font-medium text-slate-400">Scan QR atau input manual untuk check-in.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* KIRI: KAMERA + INPUT MANUAL */}
                <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                        <div className="mb-4 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                                <Camera size={16} />
                            </div>
                            <h2 className="text-[15px] font-bold text-white">Kamera scanner</h2>
                        </div>
                        <QrScanner onScan={handleLookup} />
                    </div>

                    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                        <div className="mb-4 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                                <Search size={16} />
                            </div>
                            <h2 className="text-[15px] font-bold text-white">Input manual</h2>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleLookup(qrInput); }} className="space-y-2">
                            <Label className="text-[12px] text-slate-400">QR token</Label>
                            <div className="flex gap-2">
                                <Input
                                    ref={inputRef}
                                    value={qrInput}
                                    onChange={(e) => setQrInput(e.target.value.toUpperCase())}
                                    placeholder="QR-0001"
                                    autoCapitalize="characters"
                                    autoComplete="off"
                                    className="h-12 border-white/10 bg-black/20 font-mono text-[15px] tracking-wider text-white placeholder:text-slate-500 focus:border-emerald-500"
                                />
                                <Button type="submit" disabled={loading || !qrInput.trim()} className="h-12 w-14 shrink-0 rounded-xl bg-emerald-500 text-white transition-transform hover:bg-emerald-600 active:scale-95">
                                    {loading ? (
                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    ) : (
                                        <Search size={18} />
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* KANAN: HASIL (naik ke atas di HP saat ada hasil) */}
                <div className={`space-y-6 ${hasResult ? "order-first lg:order-none" : ""}`}>

                    {loading && (
                        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                            <span className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-500/20 border-t-emerald-400" />
                            <p className="mt-4 text-[14px] font-medium text-slate-300">Memeriksa tiket...</p>
                        </div>
                    )}

                    {!loading && result.type === "idle" && (
                        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
                            <div className="relative flex h-16 w-16 items-center justify-center">
                                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
                                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                    <ScanLine size={26} className="text-slate-400" />
                                </span>
                            </div>
                            <p className="mt-5 text-[14px] font-semibold text-slate-200">Menunggu scan...</p>
                            <p className="mt-1 max-w-[240px] text-[12px] leading-relaxed text-slate-500">
                                Hasil check-in peserta akan muncul di sini.
                            </p>
                        </div>
                    )}

                    {!loading && result.type === "notfound" && (
                        <div className="relative overflow-hidden rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 shadow-2xl backdrop-blur-xl">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="scan-pop flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                                    <XCircle size={28} className="text-red-400" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[16px] font-bold text-red-400">Token tidak ditemukan</h3>
                                    <p className="mt-0.5 break-all font-mono text-[12px] text-red-300">{result.message}</p>
                                </div>
                            </div>
                            <Button onClick={reset} variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/20">
                                <RefreshCw size={14} className="mr-2" /> Coba Lagi
                            </Button>
                        </div>
                    )}

                    {!loading && result.type === "error" && (
                        <div className="relative overflow-hidden rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 shadow-2xl backdrop-blur-xl">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="scan-pop flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                                    <AlertTriangle size={26} className="text-red-400" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[16px] font-bold text-red-400">Terjadi kesalahan</h3>
                                    <p className="mt-0.5 text-[12px] text-red-300">{result.message}</p>
                                </div>
                            </div>
                            <Button onClick={reset} variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/20">
                                <RefreshCw size={14} className="mr-2" /> Coba Lagi
                            </Button>
                        </div>
                    )}

                    {!loading && result.type === "found" && (
                        <div className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-2xl backdrop-blur-xl ${result.alreadyCheckedIn ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                            <div className="mb-5 flex items-center gap-3">
                                <div className={`scan-pop flex h-12 w-12 items-center justify-center rounded-full ${result.alreadyCheckedIn ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>
                                    {result.alreadyCheckedIn
                                        ? <AlertTriangle size={28} className="text-amber-400" />
                                        : <CheckCircle2 size={28} className="text-emerald-400" />}
                                </div>
                                <div>
                                    <h3 className={`text-[16px] font-bold ${result.alreadyCheckedIn ? "text-amber-400" : "text-emerald-400"}`}>
                                        {result.alreadyCheckedIn ? "Sudah Check-in" : "Check-in Berhasil"}
                                    </h3>
                                    <p className="mt-0.5 text-[12px] text-slate-300">Gate: {result.participant.assigned_gate}</p>
                                </div>
                            </div>

                            {/* Identitas peserta */}
                            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-lg font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                                        {result.participant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[16px] font-bold text-white">{result.participant.name}</p>
                                        <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                            {result.participant.category}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-white/5 pt-4 sm:grid-cols-2">
                                    <div className="flex items-center gap-2.5 text-[13px] text-slate-300">
                                        <Phone size={15} className="shrink-0 text-indigo-400" />
                                        <span className="truncate">{result.participant.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-[13px] text-slate-300">
                                        <Users size={15} className="shrink-0 text-sky-400" />
                                        <span className="truncate">{result.participant.community}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-[13px] text-slate-300">
                                        <MapPin size={15} className="shrink-0 text-rose-400" />
                                        <span className="truncate">{result.participant.assigned_gate}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-[13px] text-slate-300">
                                        <Tag size={15} className="shrink-0 text-amber-400" />
                                        <span className="truncate font-mono">{result.participant.qr_token}</span>
                                    </div>
                                </div>
                            </div>

                            <Button onClick={reset} className="mt-5 w-full rounded-xl bg-white/10 text-white transition-transform hover:bg-white/20 active:scale-[0.98]">
                                <User size={14} className="mr-2" /> Scan Peserta Lain
                            </Button>
                        </div>
                    )}

                    {/* Riwayat sesi */}
                    {history.length > 0 && (
                        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-[15px] font-bold text-white">Riwayat scan</h2>
                                <span className="text-[11px] font-medium text-slate-500">Sesi ini</span>
                            </div>
                            <ul className="space-y-1">
                                {history.map((h) => {
                                    const st = HISTORY_STYLE[h.status];
                                    return (
                                        <li key={h.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                                                <div className="min-w-0">
                                                    <p className="truncate text-[13px] font-semibold text-white">{h.name}</p>
                                                    <p className={`text-[11px] font-medium ${st.text}`}>{st.label}</p>
                                                </div>
                                            </div>
                                            <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                                                <Clock size={11} />
                                                {new Date(h.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}