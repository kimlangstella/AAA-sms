import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";
import { Student } from "@/types";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            name, gender, dob, nationality, branchId,
            phone, parentPhone, fatherName, motherName
        } = body;

        const docRef = await addDoc(collection(db, "students"), {
            name,
            gender,
            dob,
            nationality,
            branchId,
            phone: phone || "",
            parentPhone: parentPhone || "",
            fatherName: fatherName || "",
            motherName: motherName || "",
            status: "Active", // Default status
            createdAt: Timestamp.now(),
        });

        return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("branchId"); // Filter students by branch

        let q;
        if (branchId) {
            q = query(collection(db, "students"), where("branchId", "==", branchId));
        } else {
            q = collection(db, "students");
        }

        const querySnapshot = await getDocs(q);
        const students: Student[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as Student[];

        return NextResponse.json(students);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}
