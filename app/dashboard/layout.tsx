// app/dashboard/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { loadSession, clearSession, Session } from "@/lib/session";
import {
    LayoutDashboard, ScanLine, UserPlus, Users, FileText,
    LogOut, QrCode, Settings, Wallet, ClipboardList, Home, Ticket, User,
    LayoutGrid, X,
} from "lucide-react";

type NavItem = { name: string; href: string; icon: any };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<Session | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    useEffect(() => {
        const s = loadSession();
        if (!s) { router.replace("/login"); return; }
        setUser(s);
    }, [router]);

    // Tutup sheet saat pindah halaman
    useEffect(() => {
        setSheetOpen(false);
    }, [pathname]);

    // Tutup sheet dengan tombol Escape
    useEffect(() => {
        if (!sheetOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [sheetOpen]);

    const handleLogout = () => {
        clearSession();
        router.replace("/login");
    };

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0B1120]">
                <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                    <QrCode size={24} />
                </div>
            </div>
        );
    }

    const isSuperAdmin = user.role === "super_admin";
    const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
    const roleLabel = user.role.replace("_", " ");

    const mainItems: NavItem[] = [
        { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
        { name: "Scan Tiket", href: "/dashboard/scan", icon: ScanLine },
        { name: "Pendaftaran OTS", href: "/dashboard/ots", icon: UserPlus },
    ];

    const adminItems: NavItem[] = isSuperAdmin ? [
        { name: "List Kehadiran", href: "/dashboard/attendance", icon: ClipboardList },
        { name: "Laporan Kas", href: "/dashboard/cash", icon: Wallet },
        { name: "Kelola Users", href: "/dashboard/users", icon: Users },
        { name: "Kelola Konten", href: "/dashboard/content", icon: FileText },
        { name: "Pengaturan", href: "/dashboard/settings", icon: Settings },
    ] : [];

    const menuItems: NavItem[] = [...mainItems, ...adminItems];

    const bottomNavItems: NavItem[] = [
        { name: "Home", href: "/dashboard", icon: Home },
        { name: "Scan", href: "/dashboard/scan", icon: ScanLine },
        { name: "OTS", href: "/dashboard/ots", icon: Ticket },
        ...(isSuperAdmin
            ? [{ name: "Kas", href: "/dashboard/cash", icon: Wallet }]
            : [{ name: "Profil", href: "/dashboard/profile", icon: User }]
        ),
    ];

    // Menu yang tidak muat di bottom nav (khusus super admin)
    const sheetItems = menuItems.filter((m) => !bottomNavItems.some((b) => b.href === m.href));

    const isActiveRoute = (href: string) =>
        href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

    const moreActive = sheetItems.some((i) => isActiveRoute(i.href));

    const renderSidebarItem = (item: NavItem) => {
        const Icon = item.icon;
        const active = isActiveRoute(item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                    active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
            >
                {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400" />
                )}
                <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${
                        active ? "bg-emerald-500/15" : "bg-white/[0.03] group-hover:bg-white/[0.07]"
                    }`}
                >
                    <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                </span>
                {item.name}
            </Link>
        );
    };

    return (
        <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0B1120] text-slate-50">

            {/* SIDEBAR DESKTOP */}
            <aside className="relative z-20 hidden w-64 flex-col border-r border-white/5 bg-[#0B1120] lg:flex">
                <div className="flex h-20 items-center gap-3 px-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                        <QrCode size={22} />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">Check-in</span>
                </div>

                <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
                    <div className="space-y-1">
                        <p className="px-3 pb-1 text-[11px] font-semibold text-slate-500">Menu utama</p>
                        {mainItems.map(renderSidebarItem)}
                    </div>

                    {adminItems.length > 0 && (
                        <div className="space-y-1">
                            <p className="px-3 pb-1 text-[11px] font-semibold text-slate-500">Administrasi</p>
                            {adminItems.map(renderSidebarItem)}
                        </div>
                    )}
                </nav>

                <div className="space-y-2 p-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-[15px] font-black text-white">
                            {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-white">{user.name}</p>
                            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                            <span className="mt-1.5 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                {roleLabel}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03]">
                            <LogOut size={17} />
                        </span>
                        Keluar
                    </button>
                </div>
            </aside>

            {/* AREA KONTEN UTAMA */}
            <div className="relative flex w-full flex-1 flex-col overflow-hidden">
                {/* Cahaya halus di atas konten */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 bg-gradient-to-b from-emerald-500/[0.07] to-transparent" />

                {/* HEADER MOBILE */}
                <header className="fixed left-4 right-4 top-4 z-40 flex h-[68px] items-center justify-between rounded-[1.75rem] border border-white/10 bg-[#0B1120]/80 px-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:hidden">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-emerald-600 to-teal-400 text-[17px] font-black text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            {initial}
                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0B1120] bg-emerald-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold leading-tight text-white">{user.name}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-medium text-slate-400">
                                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-400">
                                    {roleLabel}
                                </span>
                                <span className="truncate">{user.gate || "All Gates"}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        aria-label="Keluar"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-all hover:bg-red-500/20 hover:text-red-400 active:scale-95"
                    >
                        <LogOut size={18} />
                    </button>
                </header>

                {/* ISI HALAMAN */}
                <main className="relative z-10 w-full flex-1 overflow-y-auto overflow-x-hidden p-4 pb-36 pt-28 sm:p-6 sm:pb-36 sm:pt-28 lg:p-8 lg:pt-8 lg:pb-8">
                    <div className="mx-auto w-full max-w-5xl">{children}</div>
                </main>
            </div>

            {/* BOTTOM NAVIGATION */}
            <div className="pointer-events-none fixed bottom-5 left-0 right-0 z-40 flex justify-center px-4 lg:hidden">
                <nav className="pointer-events-auto flex w-full max-w-[380px] items-center gap-1 rounded-[2rem] border border-white/10 bg-[#0B1120]/85 p-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-2xl">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActiveRoute(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-label={item.name}
                                aria-current={active ? "page" : undefined}
                                className={`flex h-12 items-center justify-center gap-2 rounded-full transition-all duration-300 active:scale-95 ${
                                    active
                                        ? "flex-[1.7] bg-emerald-500/15 px-3 text-emerald-400"
                                        : "flex-1 text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                <Icon
                                    size={21}
                                    strokeWidth={active ? 2.5 : 2}
                                    className={active ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]" : ""}
                                />
                                {active && <span className="text-xs font-bold">{item.name}</span>}
                            </Link>
                        );
                    })}

                    {sheetItems.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setSheetOpen(true)}
                            aria-label="Menu lainnya"
                            className={`flex h-12 items-center justify-center gap-2 rounded-full transition-all duration-300 active:scale-95 ${
                                moreActive
                                    ? "flex-[1.7] bg-emerald-500/15 px-3 text-emerald-400"
                                    : "flex-1 text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <LayoutGrid size={21} strokeWidth={moreActive ? 2.5 : 2} />
                            {moreActive && <span className="text-xs font-bold">Lainnya</span>}
                        </button>
                    )}
                </nav>
            </div>

            {/* SHEET MENU LAINNYA (MOBILE) */}
            <div
                className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${
                    sheetOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-hidden={!sheetOpen}
            >
                <button
                    type="button"
                    aria-label="Tutup menu"
                    onClick={() => setSheetOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-white/10 bg-[#0F172A] px-5 pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
                        sheetOpen ? "translate-y-0" : "translate-y-full"
                    }`}
                >
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-bold text-white">Menu lainnya</h2>
                        <button
                            type="button"
                            onClick={() => setSheetOpen(false)}
                            aria-label="Tutup"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-all hover:text-white active:scale-95"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {sheetItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActiveRoute(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95 ${
                                        active
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                            : "border-white/5 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
                                    }`}
                                >
                                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                                    <span className="text-[11px] font-semibold leading-tight">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.98]"
                    >
                        <LogOut size={17} /> Keluar
                    </button>
                </div>
            </div>
        </div>
    );
}