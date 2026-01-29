import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp, query, where, getDoc, doc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { Attendance, Enrollment } from "@/types";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            enrollmentId, classId, studentId,
            sessionNumber, sessionDate, status, reasonForAbsent
        } = body;

        // Validate inputs
        if (!enrollmentId || !classId || !studentId || !sessionNumber || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Attendance Rules Check
        const enrollmentRef = doc(db, "enrollments", enrollmentId);
        const enrollmentSnap = await getDoc(enrollmentRef);

        if (!enrollmentSnap.exists()) {
            return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
        }

        const enrollmentData = enrollmentSnap.data() as Enrollment;

        // "Attendance is recorded only from the student’s start_session."
        if (sessionNumber < enrollmentData.startSession) {
            return NextResponse.json({
                error: `Cannot record attendance. Student starts at session ${enrollmentData.startSession}`
            }, { status: 400 });
        }

        // "If enrollment is Hold, no payment is required and no attendance is recorded"
        if (enrollmentData.enrollmentStatus === 'Hold') {
            return NextResponse.json({ error: "Student enrollment is on Hold" }, { status: 400 });
        }

        // Check if record already exists for this session
        const q = query(
            collection(db, "attendance"),
            where("enrollment_id", "==", enrollmentId),
            where("session_number", "==", sessionNumber)
        );
        const existingSnap = await getDocs(q);
        if (!existingSnap.empty) {
            return NextResponse.json({ error: "Attendance already recorded for this session" }, { status: 409 });
        }

        const docRef = await addDoc(collection(db, "attendance"), {
            enrollment_id: enrollmentId,
            class_id: classId,
            student_id: studentId,
            session_number: Number(sessionNumber),
            session_date: sessionDate,
            status,
            reason_for_absent: reasonForAbsent || "",
            recorded_at: new Date().toISOString(),
        });

        return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { attendanceId, status, reasonForAbsent } = body;

        if (!attendanceId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const attendanceRef = doc(db, "attendance", attendanceId);
        await updateDoc(attendanceRef, {
            status,
            reason_for_absent: reasonForAbsent || "",
            updated_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get("classId");
        const enrollmentId = searchParams.get("enrollmentId");

        let constraints = [];
        if (classId) constraints.push(where("class_id", "==", classId));
        if (enrollmentId) constraints.push(where("enrollment_id", "==", enrollmentId));

        const q = query(collection(db, "attendance"), ...constraints);
        const querySnapshot = await getDocs(q);

        const records = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                enrollmentId: data.enrollment_id,
                classId: data.class_id,
                studentId: data.student_id,
                sessionNumber: data.session_number,
                sessionDate: data.session_date,
                status: data.status,
                reasonForAbsent: data.reason_for_absent,
                recordedAt: data.recorded_at,
            };
        });

        return NextResponse.json(records);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    }
}
