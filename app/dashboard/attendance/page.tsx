// app/dashboard/attendance/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { loadSession } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Download, RefreshCw, MapPin, CheckCircle2, Clock } from "lucide-react";

type Checkin = {
    id: string; participant_id: string; gate: string; scanned_at: string; scanned_by: string | null; method: string | null;
    participant_name: string; participant_phone: string; participant_community: string; participant_category: string;
};
type FilterRange = "today" | "week" | "all";
const GATES = ["Semua", "Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5"];

export default function AttendancePage() {
    const router = useRouter();
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [gateFilter, setGateFilter] = useState("Semua");
    const [timeFilter, setTimeFilter] = useState<FilterRange>("today");

    const fetchCheckins = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "checkins"), orderBy("scanned_at", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Checkin[];
            setCheckins(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const s = loadSession();
        if (!s || s.role !== "super_admin") { router.replace("/dashboard"); return; }
        fetchCheckins();
    }, [router]);

    const filtered = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return checkins.filter((c) => {
            const d = new Date(c.scanned_at);
            if (timeFilter === "today" && d < startOfDay) return false;
            if (timeFilter === "week" && d < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
            if (gateFilter !== "Semua" && c.gate !== gateFilter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                const name = c.participant_name?.toLowerCase() ?? "";
                const phone = c.participant_phone ?? "";
                if (!name.includes(q) && !phone.includes(q)) return false;
            }
            return true;
        });
    }, [checkins, search, gateFilter, timeFilter]);

    const getCardGradient = (category: string) => {
        switch (category?.toUpperCase()) {
            case "VVIP": return "from-rose-500 to-pink-600 shadow-rose-500/20";
            case "VIP": return "from-amber-400 to-orange-500 shadow-orange-500/20";
            default: return "from-emerald-400 to-teal-600 shadow-emerald-500/20";
        }
    };

    return (
        <div className="space-y-6 pb-10 w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">List Kehadiran</h1>
                    <p className="mt-1 text-[13px] font-medium text-slate-400">Total {filtered.length} peserta hadir</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchCheckins} variant="outline" className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10 sm:flex-none">
                        <RefreshCw size={14} className="mr-2" /> Refresh
                    </Button>
                    <Button disabled={filtered.length === 0} className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 sm:flex-none">
                        <Download size={14} className="mr-2" /> Export
                    </Button>
                </div>
            </div>

            <div className="rounded-[2rem] bg-white/5 p-3 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau telepon..." className="border-white/10 bg-black/20 pl-10 text-[13px] text-white placeholder:text-slate-500 focus:border-emerald-500" />
                </div>
                <div className="flex items-center gap-2">
                    <select value={gateFilter} onChange={(e) => setGateFilter(e.target.value)} className="h-9 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 text-[12px] text-white sm:w-auto outline-none appearance-none">
                        {GATES.map((g) => <option key={g} value={g} className="bg-slate-800">{g}</option>)}
                    </select>
                    <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                        {(["today", "week", "all"] as FilterRange[]).map((t) => (
                            <button key={t} onClick={() => setTimeFilter(t)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${timeFilter === t ? "bg-emerald-500 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
                                {t === "today" ? "Hari Ini" : t === "week" ? "7 Hari" : "Semua"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-sm font-medium text-slate-400">Memuat data...</div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center">
                    <Users size={40} className="mx-auto text-slate-600" />
                    <p className="mt-3 text-sm font-medium text-slate-400">Belum ada data kehadiran.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((c) => (
                        <div key={c.id} className={`group relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-5 text-white shadow-xl transition-transform hover:scale-[1.02] ${getCardGradient(c.participant_category || "umum")}`}>
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl"></div>
                            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-black/10 blur-xl"></div>

                            <div className="relative z-10 flex h-full flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="inline-block rounded-full bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
                                            {c.participant_category || "Umum"}
                                        </span>
                                        <span className="text-[11px] font-bold text-white/90 flex items-center gap-1">
                                            <Clock size={12} /> {new Date(c.scanned_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h3 className="text-[18px] font-black leading-tight line-clamp-1">{c.participant_name ?? "-"}</h3>
                                    <p className="mt-1 text-[12px] font-medium text-white/80">{c.participant_phone ?? "-"}</p>
                                </div>

                                <div className="mt-5 flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Gate</p>
                                        <p className="text-[13px] font-bold flex items-center gap-1">
                                            <MapPin size={12} /> {c.gate}
                                        </p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
                                        <CheckCircle2 size={20} className="text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}