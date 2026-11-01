// app/dashboard/ots/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { loadSession } from "@/lib/session";
import { formatRupiah, parseNumberInput, generateReceiptNo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    UserPlus, CheckCircle2, XCircle, RefreshCw,
    Banknote, Copy, Check, QrCode, Building2, Wallet,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */
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

type ResultState =
    | { type: "idle" }
    | { type: "success"; receipt: Receipt }
    | { type: "error"; message: string };

/* ============================================================
   CONSTANTS
============================================================ */
const COMMUNITIES = [
    "Divisi Marketing",
    "Divisi IT",
    "Divisi HR",
    "Divisi Finance",
    "Divisi Operasional",
    "Tamu Umum",
];

const GATES = ["Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5"];

const QUICK_CASH = [50000, 100000, 200000];

const METHODS = [
    {
        id: "cash",
        label: "Cash",
        icon: Banknote,
        on: "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    },
    {
        id: "transfer",
        label: "Transfer",
        icon: Building2,
        on: "border-blue-500 bg-blue-500/15 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    },
    {
        id: "qris",
        label: "QRIS",
        icon: QrCode,
        on: "border-purple-500 bg-purple-500/15 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]",
    },
] as const;

const METHOD_LABEL = {
    cash: "Cash",
    transfer: "Transfer",
    qris: "QRIS",
} as const;

/* ============================================================
   STYLES
============================================================ */
const STYLES = `
.ots-pop { animation: ots-pop .5s ease-out both; }
@keyframes ots-pop {
  0%   { transform: scale(.6); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) { .ots-pop { animation: none; } }
`;

const fieldCls =
    "mt-1.5 h-11 border-white/10 bg-black/20 text-[14px] text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20";

const selectCls =
    "mt-1.5 h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-[14px] text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none";

/* ============================================================
   SMALL COMPONENTS
============================================================ */
function SectionTitle({ step, title }: { step: number; title: string }) {
    return (
        <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-400">
                {step}
            </span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
    );
}

function Row({
    label,
    value,
    mono,
    strong,
    tone,
}: {
    label: string;
    value: string;
    mono?: boolean;
    strong?: boolean;
    tone?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 text-[12px]">
            <span className="shrink-0 text-slate-400">{label}</span>
            <span
                className={`text-right ${mono ? "font-mono" : ""} ${
                    strong ? "font-bold" : "font-medium"
                } ${tone ?? "text-white"}`}
            >
                {value}
            </span>
        </div>
    );
}

/* ============================================================
   FIRESTORE HELPERS
============================================================ */
async function fetchTicketPrices(): Promise<TicketPrice[]> {
    const snap = await getDocs(collection(db, "ticket_prices"));
    return snap.docs.map((d) => {
        const data = d.data() as any;
        return {
            category: String(data.category ?? d.id),
            price: Number(data.price) || 0,
        };
    });
}

async function fetchPaymentSettings(): Promise<PaymentSettings | null> {
    const snap = await getDoc(doc(db, "payment_settings", "default"));
    return snap.exists() ? (snap.data() as PaymentSettings) : null;
}

/* ============================================================
   MAIN PAGE
============================================================ */
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
    const [copiedRek, setCopiedRek] = useState(false);

    /* -------------------- INIT -------------------- */
    useEffect(() => {
        setSession(loadSession());

        (async () => {
            try {
                const [priceList, paymentSettings] = await Promise.all([
                    fetchTicketPrices(),
                    fetchPaymentSettings(),
                ]);
                setPrices(priceList);
                setSettings(paymentSettings);

                if (priceList.length > 0) {
                    setForm((prev) => ({ ...prev, category: priceList[0].category }));
                }
            } catch (err) {
                console.error("Gagal memuat data:", err);
            }
        })();
    }, []);

    /* -------------------- DERIVED -------------------- */
    const currentPrice = prices.find((p) => p.category === form.category)?.price ?? 0;
    const paidAmount = parseNumberInput(paidInput);
    const change = method === "cash" ? Math.max(0, paidAmount - currentPrice) : 0;
    const isValidPayment = method === "cash" ? paidAmount >= currentPrice : true;
    const shortfall =
        method === "cash" && paidAmount > 0
            ? Math.max(0, currentPrice - paidAmount)
            : 0;
    const phoneHint = form.phone.length > 0 && form.phone.length < 8;
    const receipt = result.type === "success" ? result.receipt : null;

    /* -------------------- HANDLERS -------------------- */
    const updateField = (field: keyof Participant, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleCopyRekening = () => {
        if (!settings) return;
        navigator.clipboard.writeText(settings.bank_account_no);
        setCopiedRek(true);
        setTimeout(() => setCopiedRek(false), 2000);
    };

    const resetForm = () => {
        setForm({
            name: "",
            phone: "",
            community: COMMUNITIES[0],
            category: form.category,
            assigned_gate: form.assigned_gate,
        });
        setPaidInput("");
        setResult({ type: "idle" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResult({ type: "idle" });

        // Validasi
        if (!form.name.trim()) {
            setResult({ type: "error", message: "Nama wajib diisi" });
            return;
        }
        if (!form.phone.trim() || form.phone.length < 8) {
            setResult({ type: "error", message: "Nomor telepon minimal 8 digit" });
            return;
        }
        if (currentPrice === 0) {
            setResult({ type: "error", message: "Harga tiket belum diatur." });
            return;
        }
        if (method === "cash" && paidAmount < currentPrice) {
            setResult({
                type: "error",
                message: `Uang kurang. Butuh ${formatRupiah(currentPrice)}`,
            });
            return;
        }

        setLoading(true);
        const qrToken = `QR-OTS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const receiptNo = generateReceiptNo();
        const receivedBy = session?.name ?? "OTS";
        const receivedAt = new Date().toISOString();

        try {
            /* 1) Buat participant */
            const participantRef = await addDoc(collection(db, "participants"), {
                name: form.name.trim(),
                phone: form.phone.trim(),
                community: form.community,
                category: form.category,
                assigned_gate: form.assigned_gate,
                qr_token: qrToken,
                is_ots: true,
                payment_id: null,
                created_at: serverTimestamp(),
            });

            /* 2) Buat payment */
            const paymentRef = await addDoc(collection(db, "payments"), {
                participant_id: participantRef.id,
                amount: currentPrice,
                method,
                status: "paid",
                received_by: receivedBy,
                receipt_no: receiptNo,
                notes:
                    method === "cash"
                        ? `Dibayar: ${paidAmount}`
                        : `Metode ${method}`,
                created_at: serverTimestamp(),
            });

            /* 3) Hubungkan payment ke participant */
            await updateDoc(participantRef, { payment_id: paymentRef.id });

            /* 4) Auto check-in */
            await addDoc(collection(db, "checkins"), {
                participant_id: participantRef.id,
                gate: form.assigned_gate,
                scanned_by: receivedBy,
                method: "ots",
                created_at: serverTimestamp(),
            });

            /* 5) Sukses → tampilkan kwitansi */
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
                    receivedBy,
                    receivedAt,
                },
            });

            // Reset data form (simpan pilihan gate & kategori terakhir)
            setForm({
                name: "",
                phone: "",
                community: COMMUNITIES[0],
                category: form.category,
                assigned_gate: form.assigned_gate,
            });
            setPaidInput("");
        } catch (err: any) {
            console.error("Submit error:", err);
            setResult({
                type: "error",
                message: err?.message ?? "Gagal memproses pendaftaran.",
            });
        } finally {
            setLoading(false);
        }
    };

    /* -------------------- RENDER -------------------- */
    return (
        <div className="w-full space-y-6 pb-10">
            <style>{STYLES}</style>

            {/* HEADER */}
            <div className="flex items-center gap-3 px-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <UserPlus size={22} />
                </div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Pendaftaran OTS
                    </h1>
                    <p className="mt-0.5 text-[13px] font-medium text-slate-400">
                        Daftarkan peserta on-the-spot & auto check-in.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* ==================== KIRI: FORM ==================== */}
                <form
                    onSubmit={handleSubmit}
                    className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl sm:p-6 lg:col-span-3"
                >
                    {/* 1. Data peserta */}
                    <section>
                        <SectionTitle step={1} title="Data peserta" />
                        <div className="space-y-4">
                            <div>
                                <Label className="text-[12px] text-slate-400">
                                    Nama lengkap *
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder="Nama peserta"
                                    disabled={loading}
                                    className={fieldCls}
                                />
                            </div>
                            <div>
                                <Label className="text-[12px] text-slate-400">
                                    Nomor telepon *
                                </Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) =>
                                        updateField("phone", e.target.value.replace(/\D/g, ""))
                                    }
                                    placeholder="08123456789"
                                    inputMode="numeric"
                                    disabled={loading}
                                    className={fieldCls}
                                />
                                {phoneHint && (
                                    <p className="mt-1.5 text-[11px] font-medium text-amber-400">
                                        Minimal 8 digit
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label className="text-[12px] text-slate-400">Komunitas</Label>
                                <select
                                    value={form.community}
                                    onChange={(e) => updateField("community", e.target.value)}
                                    disabled={loading}
                                    className={selectCls}
                                >
                                    {COMMUNITIES.map((c) => (
                                        <option key={c} value={c} className="bg-slate-800">
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* 2. Tiket & Gate */}
                    <section>
                        <SectionTitle step={2} title="Tiket & gate" />
                        <Label className="text-[12px] text-slate-400">Kategori</Label>
                        {prices.length === 0 ? (
                            <div className="mt-2 h-16 animate-pulse rounded-xl bg-white/5" />
                        ) : (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {prices.map((p) => {
                                    const on = form.category === p.category;
                                    return (
                                        <button
                                            key={p.category}
                                            type="button"
                                            disabled={loading}
                                            onClick={() => updateField("category", p.category)}
                                            className={`rounded-xl border p-3 text-left transition-all active:scale-[0.97] ${
                                                on
                                                    ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                                                    : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`text-xs font-bold uppercase ${
                                                        on ? "text-emerald-400" : "text-slate-300"
                                                    }`}
                                                >
                                                    {p.category}
                                                </span>
                                                {on && (
                                                    <CheckCircle2
                                                        size={15}
                                                        className="text-emerald-400"
                                                    />
                                                )}
                                            </div>
                                            <p className="mt-1 text-base font-extrabold text-white">
                                                {formatRupiah(p.price)}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <Label className="mt-4 block text-[12px] text-slate-400">
                            Gate
                        </Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {GATES.map((g) => {
                                const on = form.assigned_gate === g;
                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => updateField("assigned_gate", g)}
                                        className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                                            on
                                                ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20 hover:text-white"
                                        }`}
                                    >
                                        {g}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* 3. Pembayaran */}
                    <section>
                        <SectionTitle step={3} title="Pembayaran" />
                        <div className="grid grid-cols-3 gap-2">
                            {METHODS.map((m) => {
                                const Icon = m.icon;
                                const on = method === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setMethod(m.id)}
                                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-[11px] font-bold uppercase transition-all active:scale-95 ${
                                            on
                                                ? m.on
                                                : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                                        }`}
                                    >
                                        <Icon size={18} /> {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {method === "cash" && (
                            <div className="mt-4 space-y-2.5">
                                <Label className="text-[12px] text-slate-400">
                                    Uang diterima
                                </Label>
                                <Input
                                    value={paidInput}
                                    onChange={(e) => setPaidInput(e.target.value)}
                                    placeholder="0"
                                    inputMode="numeric"
                                    disabled={loading}
                                    className="h-12 border-white/10 bg-black/30 text-[16px] font-bold text-white focus:border-emerald-500"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {currentPrice > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setPaidInput(String(currentPrice))}
                                            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-95"
                                        >
                                            Uang pas
                                        </button>
                                    )}
                                    {QUICK_CASH.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setPaidInput(String(n))}
                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300 transition-all hover:bg-white/10 active:scale-95"
                                        >
                                            {formatRupiah(n)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Error */}
                    {result.type === "error" && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                            <XCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
                            <p className="text-[12px] font-medium text-red-300">
                                {result.message}
                            </p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading || !isValidPayment}
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[14px] font-bold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                    >
                        {loading ? "Memproses..." : "Konfirmasi & Check-in"}
                    </Button>
                </form>

                {/* ==================== KANAN: RINGKASAN / KWITANSI ==================== */}
                <div className="space-y-4 lg:col-span-2 lg:sticky lg:top-8 lg:self-start">
                    {receipt ? (
                        /* ---------- KWITANSI ---------- */
                        <div className="overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center gap-3 p-5">
                                <div className="ots-pop flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <p className="text-[16px] font-bold text-emerald-400">
                                        Berhasil!
                                    </p>
                                    <p className="text-[11px] text-slate-300">
                                        Peserta sudah check-in
                                    </p>
                                </div>
                            </div>

                            <div className="relative border-t border-dashed border-white/15">
                                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#0B1120]" />
                                <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#0B1120]" />
                            </div>

                            <div className="space-y-2.5 p-5">
                                <Row
                                    label="No. kwitansi"
                                    value={receipt.receiptNo}
                                    mono
                                    tone="text-emerald-400"
                                />
                                <Row
                                    label="Nama"
                                    value={receipt.participantName}
                                    strong
                                />
                                <Row
                                    label="Kategori"
                                    value={receipt.category.toUpperCase()}
                                />
                                <Row label="Gate" value={receipt.gate} />
                                <Row label="Metode" value={METHOD_LABEL[receipt.method]} />
                                <Row
                                    label="Total"
                                    value={formatRupiah(receipt.amount)}
                                    strong
                                />
                                {receipt.method === "cash" && (
                                    <>
                                        <Row
                                            label="Dibayar"
                                            value={formatRupiah(receipt.paid)}
                                        />
                                        <Row
                                            label="Kembalian"
                                            value={formatRupiah(receipt.change)}
                                            tone="text-emerald-400"
                                            strong
                                        />
                                    </>
                                )}
                                <Row
                                    label="Waktu"
                                    value={new Date(receipt.receivedAt).toLocaleString(
                                        "id-ID",
                                        { dateStyle: "medium", timeStyle: "short" }
                                    )}
                                />
                                <Row label="Diterima oleh" value={receipt.receivedBy} />
                            </div>

                            <div className="px-5 pb-5">
                                <Button
                                    onClick={resetForm}
                                    className="w-full rounded-xl bg-white/10 text-white hover:bg-white/20"
                                >
                                    <RefreshCw size={14} className="mr-2" /> Daftar Peserta Lain
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ---------- RINGKASAN ---------- */}
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                                        <Wallet size={16} />
                                    </div>
                                    <h2 className="text-[15px] font-bold text-white">
                                        Ringkasan
                                    </h2>
                                </div>

                                <div className="space-y-2.5">
                                    <Row
                                        label="Peserta"
                                        value={form.name.trim() || "-"}
                                    />
                                    <Row
                                        label="Kategori"
                                        value={form.category.toUpperCase()}
                                    />
                                    <Row label="Gate" value={form.assigned_gate} />
                                    <Row label="Metode" value={METHOD_LABEL[method]} />
                                </div>

                                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                    <p className="text-[11px] font-semibold text-emerald-300/80">
                                        Total tagihan
                                    </p>
                                    <p className="mt-1 text-3xl font-black tabular-nums text-emerald-400">
                                        {formatRupiah(currentPrice)}
                                    </p>
                                </div>

                                {method === "cash" && paidAmount > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <Row
                                            label="Diterima"
                                            value={formatRupiah(paidAmount)}
                                        />
                                        {shortfall > 0 ? (
                                            <Row
                                                label="Kurang"
                                                value={formatRupiah(shortfall)}
                                                tone="text-amber-400"
                                                strong
                                            />
                                        ) : (
                                            <Row
                                                label="Kembalian"
                                                value={formatRupiah(change)}
                                                tone="text-emerald-400"
                                                strong
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ---------- TRANSFER ---------- */}
                            {method === "transfer" && settings && (
                                <div className="overflow-hidden rounded-[2rem] border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-5 shadow-2xl backdrop-blur-xl">
                                    <h2 className="mb-4 text-[15px] font-bold text-blue-300">
                                        Info transfer
                                    </h2>
                                    <div className="space-y-3 rounded-2xl border border-white/5 bg-black/30 p-4">
                                        <div>
                                            <p className="text-[11px] text-slate-400">Bank</p>
                                            <p className="text-[18px] font-bold text-white">
                                                {settings.bank_name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400">
                                                No. rekening
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleCopyRekening}
                                                className="group mt-0.5 flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-left transition-all hover:bg-white/10 active:scale-[0.98]"
                                            >
                                                <span className="font-mono text-[18px] font-bold text-white">
                                                    {settings.bank_account_no}
                                                </span>
                                                <span
                                                    className={`flex items-center gap-1 text-[11px] font-semibold ${
                                                        copiedRek
                                                            ? "text-emerald-400"
                                                            : "text-slate-400 group-hover:text-white"
                                                    }`}
                                                >
                                                    {copiedRek ? (
                                                        <Check size={14} />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                    {copiedRek ? "Tersalin" : "Salin"}
                                                </span>
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400">
                                                Atas nama
                                            </p>
                                            <p className="text-[14px] font-semibold text-white">
                                                {settings.bank_account_name}
                                            </p>
                                        </div>
                                        {settings.transfer_notes && (
                                            <p className="border-t border-white/5 pt-3 text-[12px] leading-relaxed text-slate-400">
                                                {settings.transfer_notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ---------- QRIS ---------- */}
                            {method === "qris" && settings && (
                                <div className="overflow-hidden rounded-[2rem] border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-5 text-center shadow-2xl backdrop-blur-xl">
                                    <h2 className="mb-4 text-[15px] font-bold text-purple-300">
                                        Scan QRIS
                                    </h2>
                                    {settings.qris_image_url ? (
                                        <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-xl">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={settings.qris_image_url}
                                                alt="QRIS"
                                                className="h-48 w-48 object-contain sm:h-56 sm:w-56"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-[13px] text-slate-400">
                                            QRIS belum diatur.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}