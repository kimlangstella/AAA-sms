
import { db } from "./firebase";
import { collection, doc, writeBatch } from "firebase/firestore";

export const seedDatabase = async () => {
    const batch = writeBatch(db);

    // 1. Branches
    const branches = [
        { branch_id: "branch_main", branch_name: "Main Campus", address: "123 Education Blvd", phone: "012345678", status: "Active" },
        { branch_id: "branch_north", branch_name: "North Campus", address: "456 Knowledge Way", phone: "098765432", status: "Active" }
    ];

    branches.forEach(b => {
        batch.set(doc(db, "branches", b.branch_id), b);
    });

    // 2. Programs
    const programs = [
        { program_id: "prog_eng", program_name: "General English", duration_sessions: 60, price: 150.00, description: "Full time english course" },
        { program_id: "prog_math", program_name: "High School Math", duration_sessions: 90, price: 200.00, description: "Grade 10-12 Math" }
    ];

    programs.forEach(p => {
        batch.set(doc(db, "programs", p.program_id), p);
    });

    // 3. Staff (New)
    const staff = [
        { staff_id: "staff_001", name: "Teacher Sna", role: "Teacher", phone: "012333444", status: "Active" },
        { staff_id: "staff_002", name: "Admin Tola", role: "Admin", phone: "016777888", status: "Active" }
    ];

    staff.forEach(s => {
        batch.set(doc(db, "staff", s.staff_id), s);
    });

    // 4. Classes
    const classes = [
        {
            class_id: "class_a1",
            class_name: "English Level 1",
            branch_id: "branch_main",
            program_id: "prog_eng",
            day: "Mon-Wed-Fri",
            start_time: "08:00",
            end_time: "09:30",
            max_students: 20,
            total_sessions: 60,
            status: "Active"
        }
    ];

    classes.forEach(c => {
        batch.set(doc(db, "classes", c.class_id), c);
    });

    // 5. Students
    const students = [
        {
            student_id: "std_001",
            student_name: "Sok Dara",
            age: 18,
            gender: "Male",
            dob: "2005-05-15",
            pob: "Phnom Penh",
            nationality: "Cambodian",
            branch_id: "branch_main",
            address: "#12, St 200, Phnom Penh",
            phone: "012999888",
            parent_phone: "011222333",
            father_name: "Sok Visal",
            mother_name: "Chan Thida",
            status: "Active",
            created_at: new Date().toISOString()
        }
    ];

    students.forEach(s => {
        batch.set(doc(db, "students", s.student_id), s);
    });

    // 6. Enrollments
    const enrollments = [
        {
            enrollment_id: "enr_001",
            student_id: "std_001",
            class_id: "class_a1",
            term: "Term 1",
            start_session: 1,
            total_amount: 150.00,
            discount: 0,
            paid_amount: 150.00,
            payment_status: "Paid",
            payment_type: "Cash",
            enrollment_status: "Active",
            created_at: new Date().toISOString()
        }
    ];

    enrollments.forEach(e => {
        batch.set(doc(db, "enrollments", e.enrollment_id), e);
    });

    // 7. Attendance
    const attendance = [
        {
            attendance_id: "att_001",
            enrollment_id: "enr_001",
            session_number: 1,
            session_date: new Date().toISOString(),
            status: "Present",
            reason: ""
        }
    ];

    attendance.forEach(a => {
        batch.set(doc(db, "attendance", a.attendance_id), a);
    });

    try {
        await batch.commit();
        console.log("Database seeded with all collections successfully!");
        return true;
    } catch (error) {
        console.error("Error seeding database:", error);
        throw error;
    }
};
