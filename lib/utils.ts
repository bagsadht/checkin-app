// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function playBeep(type: "success" | "warning" | "error") {
    try {
        const ctx = new (
            window.AudioContext || (window as any).webkitAudioContext
        )();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
            osc.frequency.value = 880;
            gain.gain.value = 0.15;
        } else if (type === "warning") {
            osc.frequency.value = 440;
            gain.gain.value = 0.12;
        } else {
            osc.frequency.value = 220;
            gain.gain.value = 0.15;
        }

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
        console.error("Beep gagal:", e);
    }
}

export function vibrate(pattern: number | number[]) {
    if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
}