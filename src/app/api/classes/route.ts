import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";
import { ClassSession } from "@/types";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { branchId, programId, className, days, startTime, endTime, maxStudents, totalSessions } = body;

        const docRef = await addDoc(collection(db, "classes"), {
            branchId,
            programId,
            className,
            days, // Array of strings e.g. ["Mon", "Wed"]
            startTime,
            endTime,
            maxStudents: Number(maxStudents),
            totalSessions: Number(totalSessions), // Usually defaults to program duration, but can override
            createdAt: Timestamp.now(),
        });

        return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("branchId");
        const programId = searchParams.get("programId");

        let constraints = [];
        if (branchId) constraints.push(where("branchId", "==", branchId));
        if (programId) constraints.push(where("programId", "==", programId));

        const q = query(collection(db, "classes"), ...constraints);
        const querySnapshot = await getDocs(q);

        const classes: ClassSession[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as ClassSession[];

        return NextResponse.json(classes);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
    }
}
