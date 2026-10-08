// app/dashboard/attendance/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users, Search, Download, RefreshCw, Filter,
    MapPin, CheckCircle2, Clock, X,
} from "lucide-react";

type Checkin = {
    id: string;
    participant_id: string;
    gate: string;
    scanned_at: string;
    scanned_by: string | null;
    method: string | null;
    participants: {
        name: string;
        phone: string;
        community: string;
        category: string;
    } | null;
};

type FilterRange = "today" | "week" | "all";

const GATES = ["Semua", "Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5"];

export default function AttendancePage() {
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [gateFilter, setGateFilter] = useState("Semua");
    const [timeFilter, setTimeFilter] = useState<FilterRange>("today");

    const fetchCheckins = async () => {
        setLoading(true);
        try {
            // 1. Ambil semua checkins
            const { data: checkinsData, error: cErr } = await supabase
                .from("checkins")
                .select("*")
                .order("scanned_at", { ascending: false });

            if (cErr) {
                console.error("Fetch checkins error:", cErr);
                setLoading(false);
                return;
            }

            if (!checkinsData || checkinsData.length === 0) {
                setCheckins([]);
                setLoading(false);
                return;
            }

            // 2. Ambil peserta terkait
            const participantIds = Array.from(
                new Set(checkinsData.map((c) => c.participant_id).filter(Boolean))
            );

            const { data: participantsData } = await supabase
                .from("participants")
                .select("id, name, phone, community, category")
                .in("id", participantIds);

            const participantMap = new Map(
                (participantsData ?? []).map((p) => [p.id, p])
            );

            const merged = checkinsData.map((c) => ({
                ...c,
                participants: participantMap.get(c.participant_id) ?? null,
            }));

            setCheckins(merged as any);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCheckins();
    }, []);

    // Filter data
    const filtered = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return checkins.filter((c) => {
            // Time filter
            const d = new Date(c.scanned_at);
            if (timeFilter === "today" && d < startOfDay) return false;
            if (timeFilter === "week") {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (d < weekAgo) return false;
            }

            // Gate filter
            if (gateFilter !== "Semua" && c.gate !== gateFilter) return false;

            // Search
            if (search.trim()) {
                const q = search.toLowerCase();
                const name = c.participants?.name?.toLowerCase() ?? "";
                const phone = c.participants?.phone ?? "";
                const community = c.participants?.community?.toLowerCase() ?? "";
                if (
                    !name.includes(q) &&
                    !phone.includes(q) &&
                    !community.includes(q)
                )
                    return false;
            }

            return true;
        });
    }, [checkins, search, gateFilter, timeFilter]);

    // Stats per gate
    const statsPerGate = useMemo(() => {
        const stats: Record<string, number> = {};
        GATES.slice(1).forEach((g) => (stats[g] = 0));
        filtered.forEach((c) => {
            if (stats[c.gate] !== undefined) stats[c.gate]++;
        });
        return stats;
    }, [filtered]);

    // Export CSV
    const handleExportCSV = () => {
        if (filtered.length === 0) {
            alert("Belum ada data untuk diexport");
            return;
        }
        try {
            const headers = [
                "No", "Nama", "Telepon", "Komunitas", "Kategori",
                "Gate", "Waktu Check-in", "Metode", "Petugas",
            ];
            const rows = filtered.map((c, i) => [
                (i + 1).toString(),
                c.participants?.name ?? "-",
                c.participants?.phone ?? "-",
                c.participants?.community ?? "-",
                c.participants?.category ?? "-",
                c.gate,
                formatDateTime(c.scanned_at),
                c.method ?? "scan",
                c.scanned_by ?? "-",
            ]);

            const csvContent = [headers, ...rows]
                .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
                .join("\r\n");

            const BOM = "\uFEFF";
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `kehadiran-${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Gagal export: " + (err as Error).message);
        }
    };

    const handleClearFilters = () => {
        setSearch("");
        setGateFilter("Semua");
        setTimeFilter("today");
    };

    const hasFilter = search || gateFilter !== "Semua" || timeFilter !== "today";

    return (
        <div className="p-8 text-[#fafafa]">
            {/* HEADER */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">List Kehadiran</h1>
                    <p className="mt-1 text-sm text-[#737373]">
                        Daftar peserta yang sudah check-in di semua gate
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={fetchCheckins}
                        variant="outline"
                        className="border-[#3a3a3a] text-[#fafafa]"
                    >
                        <RefreshCw size={16} className="mr-2" />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        disabled={filtered.length === 0}
                        className="bg-[#f59e0b] text-[#0a0a0a] hover:bg-[#fbbf24] disabled:opacity-50"
                    >
                        <Download size={16} className="mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* STATS PER GATE */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {GATES.slice(1).map((gate) => (
                    <Card key={gate} className="border-[#1c1c1c] bg-[#0f0f0f]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-[#f59e0b]" />
                                <p className="text-[11.5px] text-[#737373]">{gate}</p>
                            </div>
                            <p className="mt-1 text-[22px] font-bold">{statsPerGate[gate] ?? 0}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* TOTAL CARD */}
            <Card className="mb-6 border-[#22c55e]/30 bg-[#0a1a0f]">
                <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/20">
                        <CheckCircle2 size={22} className="text-[#4ade80]" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-[#4ade80]">
                            Total Hadir: {filtered.length} peserta
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#a3a3a3]">
                            {timeFilter === "today" && "Hari ini"}
                            {timeFilter === "week" && "7 hari terakhir"}
                            {timeFilter === "all" && "Semua waktu"}
                            {gateFilter !== "Semua" && ` · ${gateFilter}`}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* FILTERS */}
            <Card className="mb-6 border-[#1c1c1c] bg-[#0f0f0f]">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative min-w-[240px] flex-1">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama / telepon / komunitas..."
                                className="border-[#262626] bg-[#141414] pl-10 text-[#fafafa] placeholder:text-[#525252]"
                            />
                        </div>

                        {/* Gate filter */}
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-[#737373]" />
                            <select
                                value={gateFilter}
                                onChange={(e) => setGateFilter(e.target.value)}
                                className="h-10 rounded-md border border-[#262626] bg-[#141414] px-3 text-[13px] text-[#fafafa] outline-none focus:border-[#404040]"
                            >
                                {GATES.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Time filter */}
                        <div className="flex gap-1">
                            {(["today", "week", "all"] as FilterRange[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimeFilter(t)}
                                    className={`rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                                        timeFilter === t
                                            ? "bg-[#f59e0b] text-[#0a0a0a]"
                                            : "border border-[#262626] bg-[#141414] text-[#a3a3a3] hover:border-[#3a3a3a]"
                                    }`}
                                >
                                    {t === "today" && "Hari Ini"}
                                    {t === "week" && "7 Hari"}
                                    {t === "all" && "Semua"}
                                </button>
                            ))}
                        </div>

                        {/* Clear */}
                        {hasFilter && (
                            <button
                                onClick={handleClearFilters}
                                className="flex items-center gap-1.5 rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-[12px] text-[#a3a3a3] hover:border-[#3a3a3a] hover:text-[#fafafa]"
                            >
                                <X size={12} />
                                Clear
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* TABLE */}
            <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[15px]">
                        <Users size={18} className="text-[#60a5fa]" />
                        Daftar Kehadiran ({filtered.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="py-12 text-center text-sm text-[#737373]">Memuat...</p>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users size={32} className="mx-auto text-[#404040]" />
                            <p className="mt-3 text-[13px] text-[#737373]">
                                {checkins.length === 0
                                    ? "Belum ada peserta yang check-in"
                                    : "Tidak ada data sesuai filter"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12.5px]">
                                <thead>
                                    <tr className="border-b border-[#1c1c1c] text-left text-[10.5px] uppercase tracking-wider text-[#737373]">
                                        <th className="px-3 py-3">#</th>
                                        <th className="px-3 py-3">Nama</th>
                                        <th className="px-3 py-3">Telepon</th>
                                        <th className="px-3 py-3">Komunitas</th>
                                        <th className="px-3 py-3">Kategori</th>
                                        <th className="px-3 py-3">Gate</th>
                                        <th className="px-3 py-3">Waktu</th>
                                        <th className="px-3 py-3">Metode</th>
                                        <th className="px-3 py-3">Petugas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.slice(0, 200).map((c, i) => (
                                        <tr
                                            key={c.id}
                                            className="border-b border-[#1c1c1c]/50 hover:bg-[#141414]"
                                        >
                                            <td className="px-3 py-2.5 text-[#525252]">{i + 1}</td>
                                            <td className="px-3 py-2.5 font-medium text-[#fafafa]">
                                                {c.participants?.name ?? "-"}
                                            </td>
                                            <td className="px-3 py-2.5 text-[#a3a3a3]">
                                                {c.participants?.phone ?? "-"}
                                            </td>
                                            <td className="px-3 py-2.5 text-[#a3a3a3]">
                                                {c.participants?.community ?? "-"}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                    c.participants?.category === "VVIP"
                                                        ? "bg-[#ef4444]/15 text-[#f87171]"
                                                        : c.participants?.category === "VIP"
                                                        ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                                                        : "bg-[#3b82f6]/15 text-[#60a5fa]"
                                                }`}>
                                                    {c.participants?.category ?? "-"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className="flex items-center gap-1 text-[#f59e0b]">
                                                    <MapPin size={11} />
                                                    {c.gate}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-[#a3a3a3]">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={11} />
                                                    {formatDateTime(c.scanned_at)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                    c.method === "scan" ? "bg-[#22c55e]/15 text-[#4ade80]" :
                                                    c.method === "ots" ? "bg-[#a78bfa]/15 text-[#a78bfa]" :
                                                    "bg-[#737373]/15 text-[#a3a3a3]"
                                                }`}>
                                                    {c.method ?? "scan"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-[#a3a3a3]">
                                                {c.scanned_by ?? "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length > 200 && (
                                <p className="mt-3 text-center text-[11px] text-[#737373]">
                                    Menampilkan 200 dari {filtered.length} baris — gunakan Export CSV untuk semua data
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}