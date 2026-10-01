// components/GateSelector.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";

const GATES = [
    "Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5",
    "Gate 6", "Gate 7", "Gate 8", "Gate 9", "Gate 10",
];

type Props = {
    value: string;
    onChange: (v: string) => void;
};

export default function GateSelector({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState<number>(-1);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    useEffect(() => {
        if (open) {
            const idx = GATES.indexOf(value);
            setHighlight(idx >= 0 ? idx : 0);
        }
    }, [open, value]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
            e.preventDefault();
            setOpen(true);
            return;
        }
        if (!open) return;

        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(GATES.length - 1, h + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlight >= 0) {
                onChange(GATES[highlight]);
                setOpen(false);
            }
        }
    };

    useEffect(() => {
        if (!open || highlight < 0 || !listRef.current) return;
        const el = listRef.current.children[highlight] as HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`group/gate flex h-11 w-full items-center gap-2.5 rounded-[10px] border bg-[#f1ede4]/[0.02] px-3.5 text-left text-[13px] text-[#f1ede4] outline-none transition-all duration-500 ${
                    open
                        ? "border-[#c9ab6e]/60 bg-[#c9ab6e]/[0.05] shadow-[0_0_0_3px_rgba(201,171,110,0.12)]"
                        : "border-[#f1ede4]/10 hover:border-[#f1ede4]/20 hover:bg-[#f1ede4]/[0.03]"
                }`}
            >
                <MapPin
                    size={14}
                    strokeWidth={1.5}
                    className={`shrink-0 transition-colors duration-500 ${
                        open
                            ? "text-[#c9ab6e]"
                            : "text-[#6b7480] group-hover/gate:text-[#c9ab6e]"
                    }`}
                />
                <span className="flex-1 truncate font-medium tracking-tight">
                    {value}
                </span>
                <ChevronDown
                    size={14}
                    strokeWidth={1.7}
                    className={`shrink-0 text-[#6b7480] transition-all duration-500 ${
                        open ? "rotate-180 text-[#c9ab6e]" : ""
                    }`}
                />
            </button>

            {open && (
                <div
                    className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[12px] border border-[#f1ede4]/10 bg-[#0f161d] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
                    style={{
                        animation: "ln-pop-down .35s cubic-bezier(.16,1,.3,1) both",
                        transformOrigin: "top center",
                    }}
                >
                    <style>{`
                        @keyframes ln-pop-down {
                            from { opacity: 0; transform: translateY(-4px) scale(.97); }
                            to   { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>

                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9ab6e]/40 to-transparent" />

                    <ul
                        ref={listRef}
                        role="listbox"
                        className="max-h-[280px] overflow-y-auto py-1.5"
                    >
                        {GATES.map((g, i) => {
                            const selected = g === value;
                            const active = i === highlight;
                            return (
                                <li key={g} role="option" aria-selected={selected}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange(g);
                                            setOpen(false);
                                        }}
                                        onMouseEnter={() => setHighlight(i)}
                                        className={`group/item flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13px] transition-colors duration-200 ${
                                            active ? "bg-[#f1ede4]/[0.04]" : ""
                                        }`}
                                    >
                                        <span
                                            className={`truncate tracking-tight transition-colors duration-200 ${
                                                selected
                                                    ? "font-medium text-[#e2cd9c]"
                                                    : "text-[#c4c9d0] group-hover/item:text-[#f1ede4]"
                                            }`}
                                        >
                                            {g}
                                        </span>

                                        {selected && (
                                            <Check
                                                size={14}
                                                strokeWidth={2}
                                                className="shrink-0 text-[#c9ab6e]"
                                            />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}