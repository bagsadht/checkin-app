// lib/session.ts
export type SessionRole = "super_admin" | "admin" | "participant";

export type Session = {
    userId: string;
    name: string;
    email: string;
    role: SessionRole;
    gate: string;     // ← hilangkan "?"
    loginAt: string;
};

const SESSION_KEY = "checkin:session";

export function saveSession(s: Session) {
    if (typeof window === "undefined") return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function loadSession(): Session | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
}