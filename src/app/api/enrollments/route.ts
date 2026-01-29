import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp, query, where, doc, getDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { Enrollment } from "@/types";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            studentId, classId, term, startSession,
            totalAmount, discount, paidAmount, paymentType
        } = body;

        // Validate inputs
        if (!studentId || !classId || !term) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Logic for Payment Status
        // "When payment is made, payment_status becomes Paid." -> Implies full payment? Or partial?
        // Let's assume if paidAmount >= totalAmount - discount, then Paid.
        // Or users manually set status?
        // User requirement: "When payment is made, payment_status becomes Paid."
        // Let's infer based on paidAmount, but usually systems have a rigid logic.
        // Let's assume initially Unpaid unless paid matches total.

        // Actually, let's keep it simple: Calculate remainder.
        const finalAmount = totalAmount - discount;
        let paymentStatus = "Unpaid";
        if (paidAmount >= finalAmount) {
            paymentStatus = "Paid";
        }

        // "Enrollment can be Active, Hold, Completed" -> Default Active
        const enrollmentStatus = "Active";

        const docRef = await addDoc(collection(db, "enrollments"), {
            studentId,
            classId,
            term,
            startSession: Number(startSession),
            totalAmount: Number(totalAmount),
            discount: Number(discount),
            paidAmount: Number(paidAmount),
            paymentStatus,
            paymentType, // 'Cash' | 'ABA'
            enrollmentStatus,
            createdAt: Timestamp.now(),
        });

        return NextResponse.json({
            id: docRef.id,
            paymentStatus,
            enrollmentStatus,
            ...body
        }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get("studentId");
        const classId = searchParams.get("classId");

        let constraints = [];
        if (studentId) constraints.push(where("studentId", "==", studentId));
        if (classId) constraints.push(where("classId", "==", classId));

        const q = query(collection(db, "enrollments"), ...constraints);
        const querySnapshot = await getDocs(q);

        const enrollments: Enrollment[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
        })) as Enrollment[];

        return NextResponse.json(enrollments);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }
}
