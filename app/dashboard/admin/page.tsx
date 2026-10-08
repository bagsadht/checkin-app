// app/dashboard/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanLine, UserPlus, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        total: 0, checkedIn: 0, myGate: 0, remaining: 0,
    });
    const [recent, setRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const s = loadSession();
        if (!s || s.role !== "admin") return;

        const fetchStats = async () => {
            const { count: total } = await supabase
                .from("participants")
                .select("*", { count: "exact", head: true });

            const { count: checkedIn } = await supabase
                .from("checkins")
                .select("*", { count: "exact", head: true });

            const { count: myGate } = await supabase
                .from("checkins")
                .select("*", { count: "exact", head: true })
                .eq("gate", s.gate);

            const { data: recentData } = await supabase
                .from("checkins")
                .select("*, participants(name, phone)")
                .order("scanned_at", { ascending: false })
                .limit(8);

            setStats({
                total: total ?? 0,
                checkedIn: checkedIn ?? 0,
                myGate: myGate ?? 0,
                remaining: (total ?? 0) - (checkedIn ?? 0),
            });
            setRecent(recentData ?? []);
            setLoading(false);
        };

        fetchStats();
    }, []);

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
                <p className="mt-1 text-sm text-[#737373]">Ringkasan kehadiran & aksi cepat</p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="Total Peserta" value={stats.total} color="blue" />
                <StatCard icon={CheckCircle2} label="Sudah Hadir" value={stats.checkedIn} color="green" />
                <StatCard icon={ScanLine} label="Gate Anda" value={stats.myGate} color="amber" />
                <StatCard icon={UserPlus} label="Belum Hadir" value={stats.remaining} color="red" />
            </div>

            {/* QUICK ACTIONS */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link href="/dashboard/scan">
                    <Card className="cursor-pointer border-[#1c1c1c] bg-[#0f0f0f] transition-colors hover:border-[#f59e0b]/40">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f59e0b]/15">
                                <ScanLine size={22} className="text-[#f59e0b]" />
                            </div>
                            <div>
                                <p className="text-[15px] font-semibold">Scan Tiket QR</p>
                                <p className="text-[12px] text-[#737373]">Mulai scan peserta yang datang</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/ots">
                    <Card className="cursor-pointer border-[#1c1c1c] bg-[#0f0f0f] transition-colors hover:border-[#f59e0b]/40">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b82f6]/15">
                                <UserPlus size={22} className="text-[#60a5fa" />
                            </div>
                            <div>
                                <p className="text-[15px] font-semibold">Daftar Peserta OTS</p>
                                <p className="text-[12px] text-[#737373]">Registrasi peserta on-the-spot</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* RECENT */}
            <Card className="mt-8 border-[#1c1c1c] bg-[#0f0f0f]">
                <CardHeader>
                    <CardTitle className="text-[15px]">Kehadiran Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="py-6 text-center text-sm text-[#737373]">Memuat…</p>
                    ) : recent.length === 0 ? (
                        <p className="py-6 text-center text-sm text-[#737373]">Belum ada kehadiran.</p>
                    ) : (
                        <div className="divide-y divide-[#1c1c1c]">
                            {recent.map((c) => (
                                <div key={c.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-[13.5px] font-medium">{c.participants?.name ?? "-"}</p>
                                        <p className="text-[11px] text-[#737373]">{c.gate} · {new Date(c.scanned_at).toLocaleString("id-ID")}</p>
                                    </div>
                                    <span className="rounded-full bg-[#22c55e]/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#4ade80]">
                                        {c.method ?? "scan"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: any) {
    const colors: any = {
        blue: "bg-[#3b82f6]/15 text-[#60a5fa]",
        green: "bg-[#22c55e]/15 text-[#4ade80]",
        amber: "bg-[#f59e0b]/15 text-[#f59e0b]",
        red: "bg-[#ef4444]/15 text-[#f87171]",
    };
    return (
        <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
            <CardContent className="p-5">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
                    <Icon size={18} />
                </div>
                <p className="text-[11.5px] font-medium text-[#737373]">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            </CardContent>
        </Card>
    );
}