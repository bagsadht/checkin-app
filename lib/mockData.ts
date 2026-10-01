// lib/mockData.ts

export type Participant = {
    id: string;
    name: string;
    phone: string;
    community: string;
    category: string;
    assigned_gate: string;
    qr_token: string;
};

export type Checkin = {
    id: string;
    participant_id: string;
    gate: string;
    scanned_at: string;
    scanned_by?: string;
    method?: "scan" | "manual";
};

export const mockParticipants: Participant[] = [
    { id: "1", name: "Ahmad Fauzi", phone: "081234567001", community: "Divisi Marketing", category: "umum", assigned_gate: "Gate 1", qr_token: "QR-AHMAD" },
    { id: "2", name: "Siti Nurhaliza", phone: "081234567002", community: "Divisi Marketing", category: "umum", assigned_gate: "Gate 1", qr_token: "QR-SITI" },
    { id: "3", name: "Budi Hartono", phone: "081234567003", community: "Divisi IT", category: "umum", assigned_gate: "Gate 2", qr_token: "QR-BUDI" },
    { id: "4", name: "Dewi Lestari", phone: "081234567004", community: "Divisi HR", category: "VIP", assigned_gate: "Gate 3", qr_token: "QR-DEWI" },
    { id: "5", name: "Rizky Pratama", phone: "081234567005", community: "Divisi Finance", category: "umum", assigned_gate: "Gate 2", qr_token: "QR-RIZKY" },
];

export type Petugas = {
    email: string;
    password: string;
    name: string;
    assigned_gate: string;   // ← WAJIB: petugas tidak pilih gate sendiri
};

export const mockPetugas: Petugas[] = [
    { email: "andi@event.com", password: "1234", name: "Andi", assigned_gate: "Gate 1" },
    { email: "budi@event.com", password: "1234", name: "Budi", assigned_gate: "Gate 2" },
    { email: "citra@event.com", password: "1234", name: "Citra", assigned_gate: "Gate 3" },
    { email: "dedi@event.com", password: "1234", name: "Dedi", assigned_gate: "Gate 4" },
    { email: "eka@event.com", password: "1234", name: "Eka", assigned_gate: "Gate 5" },
];

const STORAGE_KEY = "mock_checkins";

export function loadCheckins(): Checkin[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveCheckins(list: Checkin[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addCheckin(c: Checkin): Checkin[] {
    const list = loadCheckins();
    list.push(c);
    saveCheckins(list);
    return list;
}

export function findParticipantByQr(qrToken: string): Participant | undefined {
    return mockParticipants.find((p) => p.qr_token === qrToken);
}

export function findParticipantById(id: string): Participant | undefined {
    return mockParticipants.find((p) => p.id === id);
}