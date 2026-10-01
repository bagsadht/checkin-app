// components/SessionCard.tsx
"use client";

import { MapPin, Clock } from "lucide-react";

type Props = {
    name: string;
    email?: string;
    gate: string;
    loginAt: string | null;
};

function fmtTime(iso?: string | null) {
    if (!iso) return "--:--";
    try {
        return new Date(iso).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    } catch {
        return "--:--";
    }
}

export default function SessionCard({ name, email, gate, loginAt }: Props) {
    const initial = (name || "?").trim().charAt(0).toUpperCase();

    return (
        <div className="overflow-hidden rounded-[14px] border border-[#f1ede4]/[0.07] bg-[#0f161d] transition-all duration-500 hover:border-[#f1ede4]/[0.12] hover:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
            <div className="relative flex items-center gap-3.5 border-b border-[#f1ede4]/[0.06] px-4 py-4">
                <div className="relative">
                    <div
                        aria-hidden
                        className="absolute -inset-1 rounded-full bg-[#c9ab6e]/15 blur-md"
                    />
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#c9ab6e]/30 bg-gradient-to-br from-[#c9ab6e]/20 to-[#c9ab6e]/5">
                        <span className="ln-serif text-[17px] font-medium leading-none text-[#e2cd9c]">
                            {initial}
                        </span>
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#5d6672]">
                        Sesi Aktif
                    </p>
                    <p className="mt-0.5 truncate text-[14px] font-semibold tracking-tight text-[#f1ede4]">
                        {name || "—"}
                    </p>
                    {email && (
                        <p className="mt-0.5 truncate text-[11px] text-[#6b7480]">
                            {email}
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#8fb8a0]/25 bg-[#8fb8a0]/[0.06] px-2.5 py-1">
                    <span className="relative flex h-1.5 w-1.5">
                        <span
                            className="absolute inline-flex h-full w-full rounded-full bg-[#8fb8a0]"
                            style={{
                                animation: "ln-breathe 2.4s ease-in-out infinite",
                            }}
                        />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#8fb8a0]" />
                    </span>
                    <span className="text-[10px] font-medium tracking-wide text-[#8fb8a0]">
                        Aktif
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#f1ede4]/[0.06]">
                <DetailCell
                    icon={<MapPin size={12} strokeWidth={1.7} />}
                    label="Gate"
                    value={gate}
                />
                <DetailCell
                    icon={<Clock size={12} strokeWidth={1.7} />}
                    label="Login"
                    value={fmtTime(loginAt)}
                />
            </div>
        </div>
    );
}

function DetailCell({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-[#5d6672]">
                <span className="text-[#6b7480]">{icon}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.16em]">
                    {label}
                </span>
            </div>
            <p className="mt-1.5 truncate text-[13.5px] font-semibold tabular-nums tracking-tight text-[#f1ede4]">
                {value}
            </p>
        </div>
    );
}