// app/api/users/route.ts
import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount as any)
    });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

// POST: Tambah User Baru
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, role, assigned_gate } = body;

        if (!password || password.length < 6) {
            throw new Error("Password minimal 6 karakter");
        }

        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        });

        await adminDb.collection("users").doc(userRecord.uid).set({
            email, name, role, assigned_gate
        });

        return NextResponse.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// PUT: Update User
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { uid, email, password, name, role, assigned_gate } = body;

        const updateAuth: any = { displayName: name };
        if (password && password.trim() !== "") {
            if (password.length < 6) throw new Error("Password minimal 6 karakter");
            updateAuth.password = password;
        }
        
        await adminAuth.updateUser(uid, updateAuth);

        await adminDb.collection("users").doc(uid).set({
            email, name, role, assigned_gate
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// DELETE: Hapus User
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get("uid");

        if (!uid) throw new Error("UID diperlukan");

        await adminAuth.deleteUser(uid);
        await adminDb.collection("users").doc(uid).delete();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}