import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";
import { Branch } from "@/types";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, address, phone } = body;

        const docRef = await addDoc(collection(db, "branches"), {
            name,
            address: address || "",
            phone: phone || "",
            createdAt: Timestamp.now(),
        });

        return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const querySnapshot = await getDocs(collection(db, "branches"));
        const branches: Branch[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as Branch[];

        return NextResponse.json(branches);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
    }
}
