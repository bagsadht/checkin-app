// app/dashboard/scan/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSession } from "@/lib/session";
import QrScanner from "@/components/QrScanner";
import ScanResult, { ScanStatus } from "@/components/ScanResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Search, User, Phone, MapPin, Tag, Users,
    CheckCircle2, AlertTriangle, XCircle, RefreshCw,
} from "lucide-react";

type Participant = {
    id: string;
    name: string;
    phone: string;
    community: string;
    category: string;
    assigned_gate: string;
    qr_token: string;
};

type Notification = {
    id: number;
    status: ScanStatus;
    participantName?: string;
    community?: string;
    category?: string;
    gate?: string;
    message: string;
};

type ResultState =
    | { type: "idle" }
    | { type: "found"; participant: Participant; alreadyCheckedIn: boolean }
    | { type: "notfound"; message: string }
    | { type: "error"; message: string };

export default function ScanPage() {
    const [qrInput, setQrInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState>({ type: "idle" });
    const [notification, setNotification] = useState<Notification | null>(null);
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

    const handleLookup = async (token: string) => {
        const cleanToken = token.trim().toUpperCase();
        if (!cleanToken) return;

        setLoading(true);
        setResult({ type: "idle" });

        // 1. Cari peserta
        const { data: participant, error: pErr } = await supabase
            .from("participants")
            .select("*")
            .eq("qr_token", cleanToken)
            .maybeSingle();

        if (pErr) {
            setResult({ type: "error", message: pErr.message });
            showNotification({
                status: "invalid",
                message: `Error: ${pErr.message}`,
            });
            setLoading(false);
            return;
        }

        if (!participant) {
            setResult({ type: "notfound", message: `Token "${cleanToken}" tidak ditemukan` });
            showNotification({
                status: "invalid",
                message: `QR token tidak ditemukan`,
            });
            setLoading(false);
            inputRef.current?.focus();
            return;
        }

        // 2. Cek sudah pernah check-in atau belum
        const { data: existing } = await supabase
            .from("checkins")
            .select("id")
            .eq("participant_id", participant.id)
            .maybeSingle();

        const alreadyCheckedIn = !!existing;
        setResult({ type: "found", participant, alreadyCheckedIn });

        // 3. Auto check-in kalau belum pernah
        if (!alreadyCheckedIn) {
            const { error: insertErr } = await supabase.from("checkins").insert({
                participant_id: participant.id,
                gate: participant.assigned_gate,
                scanned_by: session?.name ?? "Unknown",
                method: "scan",
            });

            if (insertErr) {
                setResult({ type: "error", message: insertErr.message });
                showNotification({
                    status: "invalid",
                    message: `Gagal check-in: ${insertErr.message}`,
                });
                setLoading(false);
                return;
            }

            showNotification({
                status: "success",
                participantName: participant.name,
                community: participant.community,
                category: participant.category,
                gate: participant.assigned_gate,
                message: "Berhasil check-in",
            });
        } else {
            showNotification({
                status: "duplicate",
                participantName: participant.name,
                community: participant.community,
                category: participant.category,
                gate: participant.assigned_gate,
                message: "Sudah pernah check-in",
            });
        }

        setLoading(false);
        setQrInput("");
        inputRef.current?.focus();
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleLookup(qrInput);
    };

    const handleScannerScan = (token: string) => {
        handleLookup(token);
    };

    const handleReset = () => {
        setQrInput("");
        setResult({ type: "idle" });
        inputRef.current?.focus();
    };

    return (
        <div className="p-8 text-[#fafafa]">
            {/* NOTIFICATION OVERLAY */}
            {notification && (
                <ScanResult
                    key={notification.id}
                    status={notification.status}
                    participantName={notification.participantName}
                    community={notification.community}
                    category={notification.category}
                    gate={notification.gate}
                    message={notification.message}
                    onDismiss={() => setNotification(null)}
                />
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Scan Tiket</h1>
                <p className="mt-1 text-sm text-[#737373]">
                    Scan QR atau input manual untuk check-in peserta
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* LEFT: SCANNER + MANUAL INPUT */}
                <div className="space-y-6">
                    <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                        <CardHeader>
                            <CardTitle className="text-[15px]">Kamera Scanner</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <QrScanner onScan={handleScannerScan} />
                        </CardContent>
                    </Card>

                    <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                        <CardHeader>
                            <CardTitle className="text-[15px]">Input Manual</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleManualSubmit} className="space-y-3">
                                <Label htmlFor="qr" className="text-[#a3a3a3]">
                                    QR Token (contoh: QR-0001)
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        ref={inputRef}
                                        id="qr"
                                        value={qrInput}
                                        onChange={(e) => setQrInput(e.target.value)}
                                        placeholder="QR-0001"
                                        autoComplete="off"
                                        disabled={loading}
                                        className="border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={loading || !qrInput.trim()}
                                        className="bg-[#f59e0b] text-[#0a0a0a] hover:bg-[#fbbf24]"
                                    >
                                        <Search size={16} />
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: RESULT PANEL */}
                <div className="space-y-6">
                    {result.type === "idle" && (
                        <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                            <CardContent className="flex h-96 items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#262626] bg-[#0a0a0a]">
                                        <Search size={24} className="text-[#525252]" />
                                    </div>
                                    <p className="mt-4 text-[13px] text-[#737373]">
                                        Menunggu scan atau input QR...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {result.type === "notfound" && (
                        <Card className="border-[#7f1d1d] bg-[#1a0a0a]">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <XCircle size={32} className="text-[#ef4444]" />
                                    <div>
                                        <p className="text-[15px] font-semibold text-[#fca5a5]">
                                            Token Tidak Ditemukan
                                        </p>
                                        <p className="mt-1 text-[12px] text-[#f87171]">
                                            {result.message}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleReset}
                                    variant="outline"
                                    className="mt-4 w-full border-[#3a3a3a] text-[#fafafa]"
                                >
                                    <RefreshCw size={14} className="mr-2" />
                                    Coba Lagi
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {result.type === "error" && (
                        <Card className="border-[#7f1d1d] bg-[#1a0a0a]">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <XCircle size={32} className="text-[#ef4444]" />
                                    <div>
                                        <p className="text-[15px] font-semibold text-[#fca5a5]">
                                            Terjadi Kesalahan
                                        </p>
                                        <p className="mt-1 text-[12px] text-[#f87171]">
                                            {result.message}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleReset}
                                    variant="outline"
                                    className="mt-4 w-full border-[#3a3a3a] text-[#fafafa]"
                                >
                                    <RefreshCw size={14} className="mr-2" />
                                    Reset
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {result.type === "found" && (
                        <Card
                            className={`border-[#262626] ${
                                result.alreadyCheckedIn
                                    ? "bg-[#1a1508]"
                                    : "bg-[#0a1a0f]"
                            }`}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-[15px]">
                                    {result.alreadyCheckedIn ? (
                                        <>
                                            <AlertTriangle size={18} className="text-[#f59e0b]" />
                                            Sudah Check-in Sebelumnya
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={18} className="text-[#4ade80]" />
                                            Check-in Berhasil
                                        </>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3 rounded-xl bg-[#0a0a0a] p-4">
                                    <InfoRow icon={User} label="Nama" value={result.participant.name} />
                                    <InfoRow icon={Phone} label="Telepon" value={result.participant.phone} />
                                    <InfoRow icon={Users} label="Komunitas" value={result.participant.community} />
                                    <InfoRow icon={Tag} label="Kategori" value={result.participant.category} />
                                    <InfoRow icon={MapPin} label="Gate" value={result.participant.assigned_gate} />
                                </div>
                                <Button
                                    onClick={handleReset}
                                    variant="outline"
                                    className="w-full border-[#3a3a3a] text-[#fafafa]"
                                >
                                    <RefreshCw size={14} className="mr-2" />
                                    Scan Peserta Lain
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon size={16} className="shrink-0 text-[#737373]" />
            <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-[#525252]">{label}</p>
                <p className="text-[13px] font-medium text-[#fafafa]">{value}</p>
            </div>
        </div>
    );
}