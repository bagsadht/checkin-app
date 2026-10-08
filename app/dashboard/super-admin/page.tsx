// app/dashboard/super-admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, CheckCircle2, UserPlus } from "lucide-react";

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({ total: 0, checkedIn: 0, admins: 0, superAdmins: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const { count: total } = await supabase.from("participants").select("*", { count: "exact", head: true });
            const { count: checkedIn } = await supabase.from("checkins").select("*", { count: "exact", head: true });
            const { count: admins } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "admin");
            const { count: superAdmins } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "super_admin");

            setStats({
                total: total ?? 0,
                checkedIn: checkedIn ?? 0,
                admins: admins ?? 0,
                superAdmins: superAdmins ?? 0,
            });
            setLoading(false);
        };
        fetchStats();
    }, []);

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
                <p className="mt-1 text-sm text-[#737373]">Kelola seluruh sistem check-in</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="Total Peserta" value={stats.total} color="blue" />
                <StatCard icon={CheckCircle2} label="Sudah Hadir" value={stats.checkedIn} color="green" />
                <StatCard icon={ShieldCheck} label="Admin" value={stats.admins} color="amber" />
                <StatCard icon={UserPlus} label="Super Admin" value={stats.superAdmins} color="red" />
            </div>

            <Card className="mt-8 border-[#1c1c1c] bg-[#0f0f0f]">
                <CardHeader>
                    <CardTitle className="text-[15px]">Aksi Cepat</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <a href="/dashboard/users" className="rounded-xl border border-[#1c1c1c] bg-[#141414] p-4 transition-colors hover:border-[#f59e0b]/40">
                        <p className="text-[14px] font-semibold">Kelola Users</p>
                        <p className="mt-1 text-[12px] text-[#737373]">Tambah, edit, atau hapus akun admin</p>
                    </a>
                    <a href="/dashboard/content" className="rounded-xl border border-[#1c1c1c] bg-[#141414] p-4 transition-colors hover:border-[#f59e0b]/40">
                        <p className="text-[14px] font-semibold">Kelola Konten</p>
                        <p className="mt-1 text-[12px] text-[#737373]">Ubah isi halaman panitia & admin</p>
                    </a>
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