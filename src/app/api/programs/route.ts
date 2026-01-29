import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";
import { Program } from "@/types";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { branchId, name, durationSessions, price, description } = body;

        if (!branchId || !name || !durationSessions || !price) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const docRef = await addDoc(collection(db, "programs"), {
            branchId,
            name,
            durationSessions: Number(durationSessions),
            price: Number(price),
            description: description || "",
            createdAt: Timestamp.now(),
        });

        return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("branchId");

        let q = collection(db, "programs");
        // If branchId is provided, filter by it (optional, but good practice)
        // Note: To use 'where' efficiently, might need composite index if sorting later.
        // robust types: q is Query<DocumentData> or CollectionReference<DocumentData>

        // For simplicity in this step, let's just get all or filter in memory if small,
        // but proper Firestore query is best.
        // However, `q` type manipulation in TS with firebase v9 can be tricky without `query()`.

        let dbQuery;
        if (branchId) {
            dbQuery = query(collection(db, "programs"), where("branchId", "==", branchId));
        } else {
            dbQuery = collection(db, "programs");
        }

        const querySnapshot = await getDocs(dbQuery);
        const programs: Program[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as Program[];

        return NextResponse.json(programs);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
    }
}
