// app/dashboard/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { loadSession, clearSession, Session } from "@/lib/session";
import {
    LayoutDashboard, ScanLine, UserPlus, Users, FileText,
    LogOut, QrCode, Settings, Wallet, ClipboardList, Menu, X,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<Session | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const s = loadSession();
        if (!s) { router.replace("/login"); return; }
        setUser(s);
    }, [router]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        clearSession();
        router.replace("/login");
    };

    if (!user) return <div className="min-h-screen bg-[#0a0a0a]" />;

    const isSuperAdmin = user.role === "super_admin";

    const menuItems = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Scan Tiket", href: "/dashboard/scan", icon: ScanLine },
        { name: "Pendaftaran OTS", href: "/dashboard/ots", icon: UserPlus },
        { name: "List Kehadiran", href: "/dashboard/attendance", icon: ClipboardList },
        ...(isSuperAdmin ? [
            { name: "Laporan Kas", href: "/dashboard/cash", icon: Wallet },
            { name: "Kelola Users", href: "/dashboard/users", icon: Users },
            { name: "Kelola Konten", href: "/dashboard/content", icon: FileText },
            { name: "Pengaturan Pembayaran", href: "/dashboard/settings", icon: Settings },
        ] : []),
    ];

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-[#fafafa]">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#1c1c1c] bg-[#0f0f0f] transition-transform duration-300 lg:static lg:translate-x-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between border-b border-[#1c1c1c] p-5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1c1c1c]">
                            <QrCode size={16} className="text-[#f59e0b]" />
                        </div>
                        <div className="leading-none">
                            <p className="text-[13px] font-semibold">Check-in</p>
                            <p className="mt-1 text-[10.5px] text-[#737373]">Gate Management</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-lg p-1.5 text-[#737373] hover:bg-[#1c1c1c] hover:text-[#fafafa] lg:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                                    isActive
                                        ? "bg-[#1c1c1c] text-[#fafafa]"
                                        : "text-[#a3a3a3] hover:bg-[#141414] hover:text-[#fafafa]"
                                }`}
                            >
                                <Icon size={17} strokeWidth={2} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-[#1c1c1c] p-3">
                    <div className="mb-3 rounded-xl border border-[#1c1c1c] bg-[#141414] p-3">
                        <p className="truncate text-[13px] font-semibold">{user.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#737373]">{user.email}</p>
                        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isSuperAdmin ? "bg-[#f59e0b]/15 text-[#f59e0b]" : "bg-[#3b82f6]/15 text-[#60a5fa]"
                        }`}>
                            {user.role.replace("_", " ")}
                        </span>
                        {user.gate && (
                            <p className="mt-1 text-[11px] text-[#737373]">Gate: {user.gate}</p>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-[#a3a3a3] transition-colors hover:bg-[#1c1c1c] hover:text-[#ef4444]"
                    >
                        <LogOut size={17} strokeWidth={2} />
                        Logout
                    </button>
                </div>
            </aside>

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex items-center gap-3 border-b border-[#1c1c1c] bg-[#0f0f0f] px-4 py-3 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-lg p-2 text-[#fafafa] hover:bg-[#1c1c1c]"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1c1c1c]">
                            <QrCode size={14} className="text-[#f59e0b]" />
                        </div>
                        <p className="text-[13px] font-semibold">Check-in</p>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}