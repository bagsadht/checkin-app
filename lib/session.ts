// lib/session.ts
export type Session = {
    name: string;
    email: string;
    gate: string;        // assigned gate (bukan pilihan user)
    loginAt: string;
};

const KEY = "session";

export function saveSession(s: Session) {
    localStorage.setItem(KEY, JSON.stringify(s));
}

export function loadSession(): Session | null {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearSession() {
    localStorage.removeItem(KEY);
}