// lib/useCountUp.ts
"use client";
import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 600) {
    const [value, setValue] = useState(target);
    const prevRef = useRef(target);

    useEffect(() => {
        const from = prevRef.current;
        const to = target;
        if (from === to) return;

        const start = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Math.round(from + (to - from) * eased));
            if (t < 1) raf = requestAnimationFrame(tick);
            else prevRef.current = to;
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return value;
}