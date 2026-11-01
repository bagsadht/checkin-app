// components/QrScanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, Square, AlertCircle, ScanLine, CheckCircle2 } from "lucide-react";

type Props = {
    onScan: (qrToken: string) => void;
};

const STYLES = `
@keyframes ln-scan-line {
  0%   { top: 15%; opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { top: 85%; opacity: 0; }
}
@keyframes ln-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: .4; }
}
@keyframes ln-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ln-corner-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}
@media (prefers-reduced-motion: reduce) {
  .ln-anim { animation: none !important; }
}
`;

export default function QrScanner({ onScan }: Props) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<{ token: string; at: number } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState(false);
    const [lastToken, setLastToken] = useState<string | null>(null);
    const containerId = "qr-reader";

    const startScanner = async () => {
        setError(null);
        setStarting(true);

        if (scannerRef.current && scannerRef.current.isScanning) {
            await scannerRef.current.stop().catch(() => { });
        }

        try {
            const scanner = new Html5Qrcode(containerId);
            scannerRef.current = scanner;

            const handleSuccess = (decodedText: string) => {
                const now = Date.now();
                if (
                    lastScanRef.current &&
                    lastScanRef.current.token === decodedText &&
                    now - lastScanRef.current.at < 3000
                )
                    return;
                lastScanRef.current = { token: decodedText, at: now };

                // Kilatan tanda QR terbaca
                setLastToken(decodedText);
                setFlash(true);
                setTimeout(() => setFlash(false), 500);

                onScan(decodedText);
            };

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                handleSuccess,
                () => { }
            );

            setIsScanning(true);

            setTimeout(() => {
                const video = document.querySelector(
                    `#${containerId} video`
                ) as HTMLVideoElement | null;
                if (video) {
                    video.setAttribute("playsinline", "true");
                    video.setAttribute("muted", "true");
                    video.play().catch(() => { });
                }
            }, 400);
        } catch (err: any) {
            console.error("Kamera gagal start:", err);
            setError(err?.message || "Kamera gagal dibuka");
            setIsScanning(false);
        } finally {
            setStarting(false);
        }
    };

    const stopScanner = async () => {
        const s = scannerRef.current;
        if (s && s.isScanning) {
            await s.stop().catch(() => { });
            s.clear();
        }
        setIsScanning(false);
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    return (
        <div className="w-full">
            <style>{STYLES}</style>

            {/* Kamera container */}
            <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border bg-black/40 transition-colors duration-300 ${isScanning ? "border-emerald-500/30" : "border-white/10"}`}>
                <div id={containerId} className="absolute inset-0" />

                {/* Corner guides */}
                <div
                    className="ln-anim pointer-events-none absolute inset-[12%]"
                    style={isScanning ? { animation: "ln-corner-pulse 2.4s ease-in-out infinite" } : undefined}
                >
                    <Corner pos="tl" active={isScanning} />
                    <Corner pos="tr" active={isScanning} />
                    <Corner pos="bl" active={isScanning} />
                    <Corner pos="br" active={isScanning} />
                </div>

                {/* Scan line */}
                {isScanning && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div
                            className="ln-anim absolute left-[15%] right-[15%] h-[1.5px]"
                            style={{
                                background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.9), transparent)",
                                animation: "ln-scan-line 2.4s cubic-bezier(.4,0,.2,1) infinite",
                            }}
                        />
                    </div>
                )}

                {/* Kilatan sukses */}
                <div
                    className={`pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/15 ring-4 ring-inset ring-emerald-400/70 transition-opacity duration-300 ${flash ? "opacity-100" : "opacity-0"}`}
                />

                {/* Idle state */}
                {!isScanning && (
                    <div
                        className="ln-anim pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                        style={{ animation: "ln-fade-in .4s ease-out both" }}
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                            <Camera size={22} strokeWidth={1.4} className="text-slate-400" />
                        </div>
                        <p className="mt-4 text-[14px] font-medium text-slate-300">Kamera belum aktif</p>
                        <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-slate-500">
                            Tekan tombol di bawah untuk mulai memindai
                        </p>
                    </div>
                )}

                {/* Indikator memindai */}
                {isScanning && (
                    <div
                        className="ln-anim pointer-events-none absolute left-1/2 top-5 -translate-x-1/2"
                        style={{ animation: "ln-fade-in .3s ease-out both" }}
                    >
                        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-[#0B1120]/80 px-3 py-1.5 backdrop-blur-md">
                            <ScanLine
                                size={11}
                                strokeWidth={2}
                                className="ln-anim text-emerald-400"
                                style={{ animation: "ln-blink 1.4s ease-in-out infinite" }}
                            />
                            <span className="text-[10.5px] font-medium tracking-wide text-emerald-400">Memindai</span>
                        </div>
                    </div>
                )}

                {/* Token terakhir terbaca */}
                {isScanning && lastToken && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
                        <div className="flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-[#0B1120]/85 px-3 py-1.5 backdrop-blur-md">
                            <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
                            <span className="truncate font-mono text-[11px] text-slate-300">{lastToken}</span>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5">
                    <AlertCircle size={14} strokeWidth={1.7} className="mt-0.5 shrink-0 text-red-400" />
                    <p className="text-[12.5px] leading-relaxed text-red-300">{error}</p>
                </div>
            )}

            <div className="mt-4">
                {!isScanning ? (
                    <Button
                        type="button"
                        onClick={startScanner}
                        disabled={starting}
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[13.5px] font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                    >
                        {starting ? (
                            <>
                                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white" />
                                Mengaktifkan…
                            </>
                        ) : (
                            <>
                                <Camera className="mr-2" size={17} strokeWidth={2} />
                                Mulai Scan QR
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={stopScanner}
                        variant="outline"
                        className="h-12 w-full rounded-xl border-white/10 bg-white/5 text-[13.5px] font-medium text-slate-300 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98]"
                    >
                        <Square className="mr-2" size={16} strokeWidth={2} />
                        Hentikan Kamera
                    </Button>
                )}
            </div>

            <p className="mt-3 text-center text-[11.5px] text-slate-500">
                {isScanning ? "Arahkan kamera ke QR peserta" : "Kamera akan aktif setelah tombol ditekan"}
            </p>
        </div>
    );
}

function Corner({ pos, active }: { pos: "tl" | "tr" | "bl" | "br"; active: boolean }) {
    const base = "absolute h-8 w-8 border-emerald-500 transition-opacity duration-500";
    const op = active ? "opacity-90" : "opacity-30";

    const positions: Record<string, string> = {
        tl: "left-0 top-0 rounded-tl-lg border-l-[2px] border-t-[2px]",
        tr: "right-0 top-0 rounded-tr-lg border-r-[2px] border-t-[2px]",
        bl: "bottom-0 left-0 rounded-bl-lg border-b-[2px] border-l-[2px]",
        br: "bottom-0 right-0 rounded-br-lg border-b-[2px] border-r-[2px]",
    };

    return <div className={`${base} ${positions[pos]} ${op}`} />;
}