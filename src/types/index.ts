export type Role = 'Admin' | 'Student' | 'Parent';

export interface Branch {
  id: string; // Firestore Document ID
  name: string;
  address?: string;
  phone?: string;
  createdAt: Date;
}

export interface Program {
  id: string;
  branchId: string; // While "Programs have classes", sometimes programs are specific to branches or global. Design implies generic, but let's keep it flexible or link to branch if needed. The request says "Each branch has different programs", so Program should likely belong to a Branch.
  name: string;
  durationSessions: number; // e.g., 11
  price: number;
  description?: string;
  createdAt: Date;
}

export interface ClassSession {
  id: string; // class_id
  branchId: string;
  programId: string;
  className: string; // e.g. "Morning-A"
  days: string[]; // e.g. ["Mon", "Wed", "Fri"]
  startTime: string; // "08:00"
  endTime: string; // "09:00"
  maxStudents: number;
  totalSessions: number; // e.g., 11. Usually inherits from Program, but good to have override.
  createdAt: Date;
}

export interface Student {
  id: string; // student_id
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string; // ISO date
  nationality: string;
  branchId: string; // "A student belongs to one branch"
  phone?: string;
  parentPhone?: string;
  fatherName?: string;
  motherName?: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
}

export type PaymentStatus = 'Paid' | 'Unpaid';
export type EnrollmentStatus = 'Active' | 'Hold' | 'Completed';
export type PaymentType = 'Cash' | 'ABA' | 'Bank Transfer';

export interface Enrollment {
  id: string; // enrollment_id
  studentId: string;
  classId: string;
  term: string; // e.g., "Term 1 2024" or just specific period
  startSession: number; // e.g., 1. If joining late, might be 3.
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentType: PaymentType;
  enrollmentStatus: EnrollmentStatus;
  paymentExpiredDate?: Date; // "At the end of a term" logic might use this
  createdAt: Date;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Permission';

export interface Attendance {
  id: string; // attendance_id
  enrollmentId: string;
  classId: string;
  studentId: string; // Denormalized for easier query
  sessionNumber: number; // 1 to total_sessions
  sessionDate: string; // ISO Date "YYYY-MM-DD"
  status: AttendanceStatus;
  reason?: string;
  recordedAt: Date;
}
