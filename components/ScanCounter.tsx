// components/ScanCounter.tsx
import { Badge } from "@/components/ui/badge";

export default function ScanCounter({ count }: { count: number }) {
    return (
        <Badge
            variant="outline"
            className="bg-green-500/10 border-green-500/30 text-green-400 px-3 py-2 text-base gap-2"
        >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-semibold tabular-nums">{count}</span>
            <span className="text-xs opacity-70">scan</span>
        </Badge>
    );
}