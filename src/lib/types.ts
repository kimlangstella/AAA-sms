export type Role = 'Admin' | 'Teacher' | 'Student' | 'Parent';

export type Gender = 'Male' | 'Female';
export type StudentStatus = 'Active' | 'Hold' | 'Inactive';
export type PaymentStatus = 'Paid' | 'Unpaid';
export type PaymentType = 'Cash' | 'ABA';
export type EnrollmentStatus = 'Active' | 'Hold' | 'Completed' | 'Dropped';
export type AttendanceStatus = 'Present' | 'Absent' | 'Permission';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface School {
    school_id: string;
    school_name: string;
    address: string;
    contact_info: string;
    email: string;
    website?: string;
    logo_url?: string;
}

export interface Branch {
    branch_id: string;
    school_id: string; // Reference to school
    branch_name: string;
    address: string;
    phone: string;
    email?: string;
    location?: string; // GPS or general area
}

export interface Program {
    program_id: string;
    program_name: string;
    description?: string;
    total_sessions: number; // Duration
    price: number;
}

export interface Class {
    class_id: string; // Document ID (mapped from Firestore doc.id)
    branchId: string;
    programId: string;
    className: string;
    days: string[]; // Array of day strings
    startTime: string; // "08:00"
    endTime: string; // "10:00"
    maxStudents: number;
    totalSessions: number;
    createdAt?: any;
    // Computed/Joined fields for display
    program_name?: string;
}

export interface Student {
    student_id: string; // Document ID
    student_code: string; // "Student ID"
    student_name: string; // Derived or full name
    first_name: string;
    last_name: string;
    email?: string;
    age: number;
    gender: Gender;
    dob: string;
    pob: string; // Place of Birth
    nationality: string;
    branch_id: string;
    address: string;
    phone: string;
    status: StudentStatus;
    admission_date: string;

    // Parent Info
    father_name?: string;
    father_occupation?: string;
    mother_name?: string;
    mother_occupation?: string;
    parent_phone: string;

    // Metadata
    created_at: string;
    created_by?: string;
    modified_by?: string;
    modified_at?: string;
    image_url?: string;

    // Insurance
    insurance_info?: {
        provider: string;
        policy_number: string;
        type: string;
        coverage_amount: number;
        start_date: string;
        end_date: string;
    };
}

export interface Enrollment {
    enrollment_id: string; // Document ID
    student_id: string;
    class_id: string;
    term: string; // e.g. 2026_T1

    total_amount: number;
    discount: number;
    paid_amount: number;
    payment_status: PaymentStatus; // "Paid" or "Unpaid"
    payment_type: PaymentType; // "Cash" or "ABA"
    payment_expired?: string; // Date string

    enrollment_status: EnrollmentStatus; // Active, Hold, Completed, Dropped

    // Enrollment details
    start_session: number; // Session number (1-12)
    enrolled_at: string;
    student?: Student; // Optional joined student
}

export interface Attendance {
    attendance_id: string;
    enrollment_id: string;
    class_id: string;
    student_id: string;

    session_date: string; // Date
    session_number: number;
    term?: string; // Optional if needed

    status: AttendanceStatus;
    reason?: string;

    recorded_at: string;
}

export interface TimeTableEntry {
    class_id: string;
    class_name: string;
    program_name: string;
    start_time: string;
    end_time: string;
    day: string;
}
