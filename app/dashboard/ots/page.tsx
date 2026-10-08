// app/dashboard/ots/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSession } from "@/lib/session";
import { formatRupiah, parseNumberInput, generateReceiptNo, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    UserPlus, CheckCircle2, XCircle, RefreshCw,
    Banknote, CreditCard, Printer, Copy, QrCode, Building2,
} from "lucide-react";

type Participant = {
    name: string;
    phone: string;
    community: string;
    category: string;
    assigned_gate: string;
};

type TicketPrice = {
    category: string;
    price: number;
};

type PaymentSettings = {
    qris_image_url: string | null;
    bank_name: string;
    bank_account_no: string;
    bank_account_name: string;
    transfer_notes: string;
};

type Receipt = {
    receiptNo: string;
    participantName: string;
    category: string;
    gate: string;
    amount: number;
    paid: number;
    change: number;
    method: "cash" | "transfer" | "qris";
    receivedBy: string;
    receivedAt: string;
};

const COMMUNITIES = [
    "Divisi Marketing",
    "Divisi IT",
    "Divisi HR",
    "Divisi Finance",
    "Divisi Operasional",
    "Tamu Umum",
];

const GATES = ["Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5"];

type ResultState =
    | { type: "idle" }
    | { type: "success"; receipt: Receipt }
    | { type: "error"; message: string };

export default function OtsPage() {
    const [prices, setPrices] = useState<TicketPrice[]>([]);
    const [settings, setSettings] = useState<PaymentSettings | null>(null);
    const [form, setForm] = useState<Participant>({
        name: "",
        phone: "",
        community: COMMUNITIES[0],
        category: "umum",
        assigned_gate: GATES[0],
    });
    const [method, setMethod] = useState<"cash" | "transfer" | "qris">("cash");
    const [paidInput, setPaidInput] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState>({ type: "idle" });
    const [session, setSession] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [copiedRek, setCopiedRek] = useState(false);

    useEffect(() => {
        setSession(loadSession());
        (async () => {
            const [pricesRes, settingsRes] = await Promise.all([
                supabase.from("ticket_prices").select("*"),
                supabase.from("payment_settings").select("*").eq("id", 1).maybeSingle(),
            ]);
            console.log("ticket_prices:", pricesRes.data, pricesRes.error);
            console.log("payment_settings:", settingsRes.data, settingsRes.error);
            setPrices(pricesRes.data ?? []);
            setSettings(settingsRes.data as PaymentSettings);
        })();
    }, []);

    const currentPrice = prices.find((p) => p.category === form.category)?.price ?? 0;
    const paidAmount = parseNumberInput(paidInput);
    const change = method === "cash" ? Math.max(0, paidAmount - currentPrice) : 0;
    const isValidPayment =
        method === "cash" ? paidAmount >= currentPrice : true;

    const updateField = (field: keyof Participant, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const generateQrToken = (): string => {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `QR-OTS-${random}`;
    };

    const handleCopyRekening = () => {
        if (!settings) return;
        navigator.clipboard.writeText(settings.bank_account_no);
        setCopiedRek(true);
        setTimeout(() => setCopiedRek(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResult({ type: "idle" });

        if (!form.name.trim()) { setResult({ type: "error", message: "Nama wajib diisi" }); return; }
        if (!form.phone.trim() || form.phone.length < 8) { setResult({ type: "error", message: "Nomor telepon minimal 8 digit" }); return; }
        if (currentPrice === 0) { setResult({ type: "error", message: "Harga tiket belum diatur. Hubungi Super Admin." }); return; }
        if (method === "cash" && paidAmount < currentPrice) {
            setResult({ type: "error", message: `Uang kurang. Butuh ${formatRupiah(currentPrice)}` });
            return;
        }

        setLoading(true);
        const qrToken = generateQrToken();
        const receiptNo = generateReceiptNo();

        const { data: newParticipant, error: pErr } = await supabase
            .from("participants")
            .insert({
                name: form.name.trim(),
                phone: form.phone.trim(),
                community: form.community,
                category: form.category,
                assigned_gate: form.assigned_gate,
                qr_token: qrToken,
                is_ots: true,
            })
            .select()
            .single();

        if (pErr || !newParticipant) {
            setResult({ type: "error", message: pErr?.message ?? "Gagal daftar peserta" });
            setLoading(false);
            return;
        }

        const { data: newPayment, error: payErr } = await supabase
            .from("payments")
            .insert({
                participant_id: newParticipant.id,
                amount: currentPrice,
                method,
                status: "paid",
                received_by: session?.name ?? "OTS",
                receipt_no: receiptNo,
                notes: method === "cash" ? `Dibayar: ${paidAmount}, Kembalian: ${change}` : `Metode ${method}`,
            })
            .select()
            .single();

        if (payErr || !newPayment) {
            setResult({ type: "error", message: `Peserta terdaftar, tapi pembayaran gagal: ${payErr?.message}` });
            setLoading(false);
            return;
        }

        await supabase
            .from("participants")
            .update({ payment_id: newPayment.id })
            .eq("id", newParticipant.id);

        const { error: cErr } = await supabase.from("checkins").insert({
            participant_id: newParticipant.id,
            gate: form.assigned_gate,
            scanned_by: session?.name ?? "OTS",
            method: "ots",
        });

        if (cErr) {
            setResult({ type: "error", message: `Check-in gagal: ${cErr.message}` });
            setLoading(false);
            return;
        }

        setResult({
            type: "success",
            receipt: {
                receiptNo,
                participantName: form.name.trim(),
                category: form.category,
                gate: form.assigned_gate,
                amount: currentPrice,
                paid: method === "cash" ? paidAmount : currentPrice,
                change,
                method,
                receivedBy: session?.name ?? "OTS",
                receivedAt: new Date().toISOString(),
            },
        });

        setForm({
            name: "", phone: "",
            community: COMMUNITIES[0], category: "umum",
            assigned_gate: form.assigned_gate,
        });
        setPaidInput("");
        setLoading(false);
    };

    const handleCopyReceipt = () => {
        if (result.type !== "success") return;
        const r = result.receipt;
        const text = `KWITANSI ${r.receiptNo}\nNama: ${r.participantName}\nKategori: ${r.category.toUpperCase()}\nGate: ${r.gate}\nTotal: ${formatRupiah(r.amount)}\nMetode: ${r.method}\nDiterima oleh: ${r.receivedBy}\nTanggal: ${formatDateTime(r.receivedAt)}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setResult({ type: "idle" });
        setPaidInput("");
    };

    return (
        <div className="p-4 text-[#fafafa] sm:p-6 lg:p-8">
            <div className="mb-8 print:hidden">
                <h1 className="text-3xl font-bold tracking-tight">Pendaftaran OTS</h1>
                <p className="mt-1 text-sm text-[#737373]">
                    Daftarkan peserta on-the-spot, terima pembayaran & auto check-in
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-[#1c1c1c] bg-[#0f0f0f] print:hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-[15px]">
                            <UserPlus size={18} className="text-[#f59e0b]" />
                            Data Peserta Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label className="text-[#a3a3a3]">Nama Lengkap *</Label>
                                <Input value={form.name} onChange={(e) => updateField("name", e.target.value)}
                                    placeholder="Nama peserta" disabled={loading} autoFocus
                                    className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]" />
                            </div>
                            <div>
                                <Label className="text-[#a3a3a3]">Nomor Telepon *</Label>
                                <Input value={form.phone}
                                    onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
                                    placeholder="08123456789" inputMode="numeric" disabled={loading}
                                    className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]" />
                            </div>
                            <div>
                                <Label className="text-[#a3a3a3]">Komunitas / Divisi</Label>
                                <select value={form.community} onChange={(e) => updateField("community", e.target.value)}
                                    disabled={loading}
                                    className="mt-2 h-10 w-full rounded-md border border-[#262626] bg-[#141414] px-3 text-[14px] text-[#fafafa] outline-none focus:border-[#404040]">
                                    {COMMUNITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[#a3a3a3]">Kategori (Harga)</Label>
                                    <select value={form.category} onChange={(e) => updateField("category", e.target.value)}
                                        disabled={loading}
                                        className="mt-2 h-10 w-full rounded-md border border-[#262626] bg-[#141414] px-3 text-[14px] text-[#fafafa] outline-none focus:border-[#404040]">
                                        {prices.length === 0 && (
                                            <option value="">Loading harga...</option>
                                        )}
                                        {prices.map((p) => (
                                            <option key={p.category} value={p.category}>
                                                {p.category.toUpperCase()} - {formatRupiah(p.price)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-[#a3a3a3]">Gate</Label>
                                    <select value={form.assigned_gate} onChange={(e) => updateField("assigned_gate", e.target.value)}
                                        disabled={loading}
                                        className="mt-2 h-10 w-full rounded-md border border-[#262626] bg-[#141414] px-3 text-[14px] text-[#fafafa] outline-none focus:border-[#404040]">
                                        {GATES.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12.5px] text-[#a3a3a3]">Total Tagihan</span>
                                    <span className="text-[20px] font-bold text-[#f59e0b]">{formatRupiah(currentPrice)}</span>
                                </div>

                                <div>
                                    <Label className="text-[#a3a3a3] text-[12px]">Metode Pembayaran</Label>
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        <button type="button" onClick={() => setMethod("cash")}
                                            className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 text-[12px] font-medium transition-colors ${
                                                method === "cash"
                                                    ? "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]"
                                                    : "border-[#262626] bg-[#141414] text-[#737373] hover:border-[#3a3a3a]"
                                            }`}>
                                            <Banknote size={15} /> Cash
                                        </button>
                                        <button type="button" onClick={() => setMethod("transfer")}
                                            className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 text-[12px] font-medium transition-colors ${
                                                method === "transfer"
                                                    ? "border-[#60a5fa] bg-[#60a5fa]/10 text-[#60a5fa]"
                                                    : "border-[#262626] bg-[#141414] text-[#737373] hover:border-[#3a3a3a]"
                                            }`}>
                                            <Building2 size={15} /> Transfer
                                        </button>
                                        <button type="button" onClick={() => setMethod("qris")}
                                            className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 text-[12px] font-medium transition-colors ${
                                                method === "qris"
                                                    ? "border-[#a78bfa] bg-[#a78bfa]/10 text-[#a78bfa]"
                                                    : "border-[#262626] bg-[#141414] text-[#737373] hover:border-[#3a3a3a]"
                                            }`}>
                                            <QrCode size={15} /> QRIS
                                        </button>
                                    </div>
                                </div>

                                {method === "cash" && (
                                    <div>
                                        <Label className="text-[#a3a3a3] text-[12px]">Uang Diterima</Label>
                                        <Input value={paidInput}
                                            onChange={(e) => setPaidInput(e.target.value)}
                                            placeholder="0" inputMode="numeric" disabled={loading}
                                            className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]" />
                                        {paidAmount > 0 && (
                                            <div className="mt-2 flex items-center justify-between text-[12px]">
                                                <span className="text-[#737373]">Kembalian</span>
                                                <span className={change > 0 ? "font-semibold text-[#4ade80]" : "text-[#737373]"}>
                                                    {formatRupiah(change)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {result.type === "error" && (
                                <div className="flex items-start gap-2 rounded-lg border border-[#7f1d1d] bg-[#1a0a0a] px-3 py-2.5">
                                    <XCircle size={14} className="mt-0.5 shrink-0 text-[#f87171]" />
                                    <p className="text-[12.5px] text-[#fca5a5]">{result.message}</p>
                                </div>
                            )}

                            <Button type="submit" disabled={loading || !isValidPayment}
                                className="h-12 w-full bg-[#f59e0b] text-[14px] font-semibold text-[#0a0a0a] hover:bg-[#fbbf24] disabled:opacity-50">
                                {loading ? (
                                    <>
                                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a]" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} className="mr-2" />
                                        Konfirmasi & Check-in
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {method === "transfer" && settings && result.type === "idle" && (
                        <Card className="border-[#60a5fa]/30 bg-[#0a0f1a] print:hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-[15px] text-[#60a5fa]">
                                    <Building2 size={18} />
                                    Info Transfer Bank
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-xl bg-[#0a0a0a] p-4 space-y-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-[#525252]">Bank</p>
                                        <p className="text-[18px] font-bold text-[#60a5fa]">{settings.bank_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-[#525252]">Nomor Rekening</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <p className="font-mono text-[20px] font-bold text-[#fafafa]">
                                                {settings.bank_account_no}
                                            </p>
                                            <button onClick={handleCopyRekening}
                                                className="rounded-lg p-1.5 text-[#737373] hover:bg-[#1c1c1c] hover:text-[#fafafa]">
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                        {copiedRek && (
                                            <p className="mt-1 text-[11px] text-[#4ade80]">Nomor rekening tersalin</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-[#525252]">Atas Nama</p>
                                        <p className="text-[14px] font-semibold text-[#fafafa]">{settings.bank_account_name}</p>
                                    </div>
                                </div>
                                <p className="text-[12px] leading-relaxed text-[#737373]">
                                    {settings.transfer_notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {method === "qris" && settings && result.type === "idle" && (
                        <Card className="border-[#a78bfa]/30 bg-[#0f0a1a] print:hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-[15px] text-[#a78bfa]">
                                    <QrCode size={18} />
                                    Scan QRIS untuk Bayar
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {settings.qris_image_url ? (
                                    <div className="space-y-3">
                                        <div className="mx-auto w-fit rounded-xl bg-white p-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={settings.qris_image_url}
                                                alt="QRIS"
                                                className="h-64 w-64 object-contain"
                                            />
                                        </div>
                                        <p className="text-center text-[12px] text-[#a3a3a3]">
                                            Scan menggunakan aplikasi e-wallet (GoPay, OVO, Dana, dll)
                                        </p>
                                        <div className="rounded-lg border border-[#a78bfa]/20 bg-[#0a0a0a] px-3 py-2 text-center">
                                            <p className="text-[10px] uppercase tracking-wider text-[#525252]">Nominal</p>
                                            <p className="text-[18px] font-bold text-[#a78bfa]">
                                                {formatRupiah(currentPrice)}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#3a3a3a] text-center">
                                        <QrCode size={32} className="text-[#525252]" />
                                        <p className="mt-2 text-[12px] text-[#737373]">
                                            QRIS belum diatur
                                        </p>
                                        <p className="mt-1 text-[11px] text-[#525252]">
                                            Hubungi Super Admin untuk upload gambar QRIS
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {result.type === "idle" && method === "cash" && (
                        <Card className="border-[#1c1c1c] bg-[#0f0f0f] print:hidden">
                            <CardContent className="flex h-64 items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#262626] bg-[#0a0a0a]">
                                        <Printer size={24} className="text-[#525252]" />
                                    </div>
                                    <p className="mt-4 text-[13px] text-[#737373]">Kwitansi akan muncul di sini</p>
                                    <p className="mt-1 text-[11px] text-[#525252]">Setelah pendaftaran berhasil</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {result.type === "success" && (
                        <>
                            <Card className="border-[#22c55e] bg-[#0a1a0f] print:hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                                            <CheckCircle2 size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[15px] font-bold text-[#4ade80]">Pendaftaran Berhasil!</p>
                                            <p className="mt-0.5 text-[12px] text-[#a3a3a3]">Peserta sudah check-in</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-[#262626] bg-[#0a0a0a] print-receipt">
                                <CardHeader className="border-b border-[#1c1c1c] pb-3">
                                    <CardTitle className="flex items-center justify-between text-[13px]">
                                        <span>KWITANSI PEMBAYARAN</span>
                                        <span className="font-mono text-[11px] text-[#f59e0b]">{result.receipt.receiptNo}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-4">
                                    <Row label="Nama" value={result.receipt.participantName} />
                                    <Row label="Kategori" value={result.receipt.category.toUpperCase()} />
                                    <Row label="Gate" value={result.receipt.gate} />
                                    <Row label="Metode" value={result.receipt.method.toUpperCase()} />
                                    <div className="my-3 border-t border-dashed border-[#262626]" />
                                    <Row label="Total" value={formatRupiah(result.receipt.amount)} bold />
                                    {result.receipt.method === "cash" && (
                                        <>
                                            <Row label="Dibayar" value={formatRupiah(result.receipt.paid)} />
                                            <Row label="Kembalian" value={formatRupiah(result.receipt.change)} />
                                        </>
                                    )}
                                    <div className="my-3 border-t border-dashed border-[#262626]" />
                                    <Row label="Diterima oleh" value={result.receipt.receivedBy} />
                                    <Row label="Waktu" value={formatDateTime(result.receipt.receivedAt)} />

                                    <div className="mt-4 flex gap-2 print:hidden">
                                        <Button onClick={handleCopyReceipt} variant="outline"
                                            className="flex-1 border-[#3a3a3a] text-[#fafafa]">
                                            <Copy size={14} className="mr-2" />
                                            {copied ? "Tersalin!" : "Copy"}
                                        </Button>
                                        <Button onClick={() => window.print()} variant="outline"
                                            className="flex-1 border-[#3a3a3a] text-[#fafafa]">
                                            <Printer size={14} className="mr-2" />
                                            Print
                                        </Button>
                                    </div>

                                    <Button onClick={handleReset}
                                        className="mt-2 w-full bg-[#f59e0b] text-[#0a0a0a] hover:bg-[#fbbf24] print:hidden">
                                        <RefreshCw size={14} className="mr-2" />
                                        Daftarkan Peserta Lain
                                    </Button>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#737373]">{label}</span>
            <span className={`text-[13px] ${bold ? "font-bold text-[#f59e0b]" : "text-[#fafafa]"}`}>{value}</span>
        </div>
    );
}