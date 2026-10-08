// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/session";

export default function DashboardIndex() {
    const router = useRouter();

    useEffect(() => {
        const s = loadSession();
        if (!s) { router.replace("/login"); return; }
        if (s.role === "super_admin") router.replace("/dashboard/super-admin");
        else if (s.role === "admin") router.replace("/dashboard/admin");
        else router.replace("/login");
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-sm text-[#737373]">
            Memuat dashboard…
        </div>
    );
}