// app/dashboard/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    UserPlus, Pencil, Trash2, X, Save, ShieldCheck, Shield,
    Mail, Lock, MapPin, User as UserIcon, AlertTriangle,
} from "lucide-react";

type UserRole = "super_admin" | "admin" | "participant";

type DbUser = {
    id: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    assigned_gate: string | null;
};

const GATES = ["Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5"];

export default function UsersPage() {
    const [users, setUsers] = useState<DbUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<DbUser | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
        role: "admin" as UserRole,
        assigned_gate: GATES[0],
    });

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error: err } = await supabase
            .from("users")
            .select("*")
            .order("role", { ascending: true });

        if (err) {
            setError(err.message);
        } else {
            setUsers(data ?? []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const resetForm = () => {
        setForm({
            email: "",
            password: "",
            name: "",
            role: "admin",
            assigned_gate: GATES[0],
        });
        setEditing(null);
        setShowForm(false);
        setError(null);
    };

    const handleEdit = (user: DbUser) => {
        setForm({
            email: user.email,
            password: user.password,
            name: user.name,
            role: user.role,
            assigned_gate: user.assigned_gate ?? GATES[0],
        });
        setEditing(user);
        setShowForm(true);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validasi
        if (!form.email.trim() || !form.email.includes("@")) {
            setError("Email tidak valid");
            return;
        }
        if (!form.password || form.password.length < 4) {
            setError("Password minimal 4 karakter");
            return;
        }
        if (!form.name.trim()) {
            setError("Nama wajib diisi");
            return;
        }

        setSaving(true);

        const payload = {
            email: form.email.trim().toLowerCase(),
            password: form.password,
            name: form.name.trim(),
            role: form.role,
            assigned_gate: form.role === "admin" ? form.assigned_gate : null,
        };

        if (editing) {
            // Update
            const { error: err } = await supabase
                .from("users")
                .update(payload)
                .eq("id", editing.id);

            if (err) {
                setError(err.message);
                setSaving(false);
                return;
            }
        } else {
            // Insert
            const { error: err } = await supabase.from("users").insert(payload);

            if (err) {
                setError(err.message);
                setSaving(false);
                return;
            }
        }

        await fetchUsers();
        setSaving(false);
        resetForm();
    };

    const handleDelete = async (user: DbUser) => {
        if (user.role === "super_admin") {
            alert("Super Admin tidak bisa dihapus!");
            return;
        }
        if (!confirm(`Hapus user "${user.name}" (${user.email})?`)) return;

        const { error: err } = await supabase
            .from("users")
            .delete()
            .eq("id", user.id);

        if (err) {
            alert("Gagal menghapus: " + err.message);
            return;
        }
        fetchUsers();
    };

    return (
        <div className="p-4 text-[#fafafa] sm:p-6 lg:p-8">
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Kelola Users</h1>
                    <p className="mt-1 text-sm text-[#737373]">
                        Tambah, edit, atau hapus akun admin & super admin
                    </p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-[#f59e0b] text-[#0a0a0a] hover:bg-[#fbbf24]"
                    >
                        <UserPlus size={16} className="mr-2" />
                        Tambah User
                    </Button>
                )}
            </div>

            {/* FORM */}
            {showForm && (
                <Card className="mb-6 border-[#f59e0b]/30 bg-[#0f0f0f]">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-[15px]">
                            <span>{editing ? "Edit User" : "Tambah User Baru"}</span>
                            <button
                                onClick={resetForm}
                                className="rounded-md p-1 text-[#737373] hover:bg-[#1c1c1c] hover:text-[#fafafa]"
                            >
                                <X size={16} />
                            </button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-[#a3a3a3]">Nama Lengkap</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="John Doe"
                                        disabled={saving}
                                        className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[#a3a3a3]">Email</Label>
                                    <Input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="admin@event.com"
                                        disabled={saving || !!editing}
                                        className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252] disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[#a3a3a3]">Password</Label>
                                    <Input
                                        type="text"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="1234"
                                        disabled={saving}
                                        className="mt-2 border-[#262626] bg-[#141414] text-[#fafafa] placeholder:text-[#525252]"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[#a3a3a3]">Role</Label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                                        disabled={saving || editing?.role === "super_admin"}
                                        className="mt-2 h-10 w-full rounded-md border border-[#262626] bg-[#141414] px-3 text-[14px] text-[#fafafa] outline-none focus:border-[#404040] disabled:opacity-60"
                                    >
                                        <option value="admin">Admin (Petugas Gate)</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                                {form.role === "admin" && (
                                    <div className="sm:col-span-2">
                                        <Label className="text-[#a3a3a3]">Gate yang Ditugaskan</Label>
                                        <select
                                            value={form.assigned_gate}
                                            onChange={(e) => setForm({ ...form, assigned_gate: e.target.value })}
                                            disabled={saving}
                                            className="mt-2 h-10 w-full rounded-md border border-[#262626] bg-[#141414] px-3 text-[14px] text-[#fafafa] outline-none focus:border-[#404040]"
                                        >
                                            {GATES.map((g) => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 rounded-lg border border-[#7f1d1d] bg-[#1a0a0a] px-3 py-2.5">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#f87171]" />
                                    <p className="text-[12.5px] text-[#fca5a5]">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-[#f59e0b] text-[#0a0a0a] hover:bg-[#fbbf24]"
                                >
                                    <Save size={16} className="mr-2" />
                                    {saving ? "Menyimpan…" : editing ? "Update" : "Simpan"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    disabled={saving}
                                    className="border-[#3a3a3a] text-[#fafafa]"
                                >
                                    Batal
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* LIST */}
            <Card className="border-[#1c1c1c] bg-[#0f0f0f]">
                <CardHeader>
                    <CardTitle className="text-[15px]">
                        Daftar Users ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="py-8 text-center text-sm text-[#737373]">Memuat…</p>
                    ) : users.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[#737373]">Belum ada user.</p>
                    ) : (
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 rounded-xl border border-[#1c1c1c] bg-[#141414] p-3"
                                >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                        user.role === "super_admin"
                                            ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                                            : "bg-[#3b82f6]/15 text-[#60a5fa]"
                                    }`}>
                                        {user.role === "super_admin" ? <ShieldCheck size={18} /> : <Shield size={18} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-semibold">{user.name}</p>
                                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#737373]">
                                            <Mail size={10} />
                                            <span className="truncate">{user.email}</span>
                                            {user.assigned_gate && (
                                                <>
                                                    <span>·</span>
                                                    <MapPin size={10} />
                                                    <span>{user.assigned_gate}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                        user.role === "super_admin"
                                            ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                                            : "bg-[#3b82f6]/15 text-[#60a5fa]"
                                    }`}>
                                        {user.role.replace("_", " ")}
                                    </span>
                                    <div className="flex shrink-0 gap-1">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="rounded-lg p-2 text-[#737373] hover:bg-[#1c1c1c] hover:text-[#60a5fa]"
                                            title="Edit"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user)}
                                            disabled={user.role === "super_admin"}
                                            className="rounded-lg p-2 text-[#737373] hover:bg-[#1c1c1c] hover:text-[#f87171] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#737373]"
                                            title="Hapus"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}