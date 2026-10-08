// lib/format.ts

/**
 * Format angka ke Rupiah: 50000 -> "Rp 50.000"
 */
export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format angka tanpa simbol: 50000 -> "50.000"
 */
export function formatNumber(amount: number): string {
    return new Intl.NumberFormat("id-ID").format(amount);
}

/**
 * Generate nomor kwitansi unik: KW-20261008-1234
 */
export function generateReceiptNo(): string {
    const date = new Date();
    const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `KW-${ymd}-${random}`;
}

/**
 * Format tanggal Indonesia: 8 Okt 2026, 14:30
 */
export function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Format tanggal saja: 8 Okt 2026
 */
export function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/**
 * Parse input angka dengan pemisah ribuan: "50.000" -> 50000
 */
export function parseNumberInput(value: string): number {
    const clean = value.replace(/\D/g, "");
    return parseInt(clean, 10) || 0;
}
