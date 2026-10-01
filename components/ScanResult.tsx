// components/ScanResult.tsx
"use client";

import { useEffect } from "react";
import { Check, AlertTriangle, X, MapPin } from "lucide-react";
import { playBeep, vibrate } from "@/lib/utils";

export type ScanStatus = "success" | "duplicate" | "invalid";

type Props = {
    status: ScanStatus;
    participantName?: string;
    community?: string;
    category?: string;
    gate?: string;
    message: string;
    onDismiss: () => void;
};

const STYLES = `
@keyframes ln-notif-in {
  from { opacity: 0; transform: translateY(-20px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ln-notif-progress {
  from { width: 100%; }
  to   { width: 0%; }
}
`;

export default function ScanResult({
    status,
    participantName,
    community,
    category,
    gate,
    message,
    onDismiss,
}: Props) {
    useEffect(() => {
        playBeep(
            status === "success"
                ? "success"
                : status === "duplicate"
                ? "warning"
                : "error"
        );
        vibrate(status === "success" ? 100 : [100, 50, 100]);

        const t = setTimeout(onDismiss, 3200);
        return () => clearTimeout(t);
    }, [status, onDismiss]);

    const config = {
        success: {
            accent: "#6ee7b7",
            bg: "rgba(110,231,183,0.08)",
            border: "rgba(110,231,183,0.25)",
            icon: <Check size={16} strokeWidth={2.6} className="text-[#6ee7b7]" />,
            label: "BERHASIL CHECK-IN",
        },
        duplicate: {
            accent: "#fbbf24",
            bg: "rgba(251,191,36,0.08)",
            border: "rgba(251,191,36,0.25)",
            icon: (
                <AlertTriangle size={16} strokeWidth={2.2} className="text-[#fbbf24]" />
            ),
            label: "SUDAH CHECK-IN",
        },
        invalid: {
            accent: "#f87171",
            bg: "rgba(248,113,113,0.08)",
            border: "rgba(248,113,113,0.25)",
            icon: <X size={16} strokeWidth={2.6} className="text-[#f87171]" />,
            label: "QR TIDAK VALID",
        },
    }[status];

    return (
        <div
            className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
            style={{ animation: "ln-notif-in .45s cubic-bezier(.16,1,.3,1) both" }}
        >
            <style>{STYLES}</style>

            <div
                className="pointer-events-auto w-full max-w-[440px] overflow-hidden rounded-[14px] border bg-[#0f0f11]/95 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl"
                style={{ borderColor: config.border }}
                onClick={onDismiss}
            >
                {/* Progress bar */}
                <div
                    className="h-[2px] origin-left"
                    style={{
                        background: config.accent,
                        animation: "ln-notif-progress 3.2s linear forwards",
                    }}
                />

                <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* Icon */}
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                        style={{
                            backgroundColor: config.bg,
                            borderColor: config.border,
                        }}
                    >
                        {config.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                        <p
                            className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                            style={{ color: config.accent }}
                        >
                            {config.label}
                        </p>
                        <p className="mt-0.5 truncate text-[14px] font-medium leading-tight text-[#fafafa]">
                            {participantName ?? message}
                        </p>
                        {participantName && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {community && (
                                    <span className="text-[11px] text-[#71717a]">
                                        {community}
                                    </span>
                                )}
                                {category && community && (
                                    <span className="text-[#3f3f46]">·</span>
                                )}
                                {category && (
                                    <span className="text-[11px] uppercase tracking-wider text-[#71717a]">
                                        {category}
                                    </span>
                                )}
                                {gate && (
                                    <>
                                        <span className="text-[#3f3f46]">·</span>
                                        <span className="flex items-center gap-1 text-[11px] text-[#71717a]">
                                            <MapPin size={9} strokeWidth={1.8} />
                                            {gate}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}