
import { db, storage } from "../firebase";
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    Student,
    Class,
    Enrollment,
    Attendance,
    StudentStatus,
    AttendanceStatus,
    School
} from "../types";

// Collection References
const studentsCol = collection(db, "students");
const classesCol = collection(db, "classes");
const enrollmentsCol = collection(db, "enrollments");
const attendanceCol = collection(db, "attendance");
const schoolsCol = collection(db, "schools");

// --- School Services ---

export const getSchoolDetails = async () => {
    try {
        const snapshot = await getDocs(schoolsCol);
        if (snapshot.empty) return null;
        return { school_id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as School;
    } catch (error) {
        console.error("Error fetching school details:", error);
        throw error;
    }
};

export const subscribeToSchoolDetails = (callback: (school: School | null) => void) => {
    return onSnapshot(schoolsCol, (snapshot) => {
        if (snapshot.empty) {
            callback(null);
        } else {
            callback({ school_id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as School);
        }
    }, (error) => {
        console.error("Error subscribing to school details:", error);
    });
};

export const updateSchoolDetails = async (id: string, data: Partial<School>) => {
    try {
        const docRef = doc(db, "schools", id);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error("Error updating school details:", error);
        throw error;
    }
};

export const createSchoolDetails = async (data: Omit<School, 'school_id'>) => {
    try {
        const docRef = await addDoc(schoolsCol, data);
        return { school_id: docRef.id, ...data };
    } catch (error) {
        console.error("Error creating school details:", error);
        throw error;
    }
};

// --- Storage Services ---
export const uploadImage = async (file: File, path: string) => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};

// --- Student Services ---

export const addStudent = async (studentData: Omit<Student, 'student_id' | 'created_at'>) => {
    try {
        const docRef = await addDoc(studentsCol, {
            ...studentData,
            created_at: new Date().toISOString(),
            created_by: 'Admin User', // TODO: Replace with actual auth user
            modified_at: new Date().toISOString(),
            modified_by: 'Admin User'
        });
        return { id: docRef.id, ...studentData };
    } catch (error) {
        console.error("Error adding student:", error);
        throw error;
    }
};

export const getStudents = async () => {
    try {
        const q = query(studentsCol, orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            student_id: doc.id,
            ...doc.data()
        } as Student));
    } catch (error) {
        console.error("Error fetching students:", error);
        throw error;
    }
};

export const subscribeToStudents = (callback: (students: Student[]) => void) => {
    const q = query(studentsCol, orderBy("created_at", "desc"));
    return onSnapshot(q, (snapshot) => {
        const students = snapshot.docs.map(doc => ({
            student_id: doc.id,
            ...doc.data()
        } as Student));
        callback(students);
    }, (error) => {
        console.error("Error subscribing to students:", error);
    });
};

export const getStudentById = async (id: string) => {
    try {
        const docRef = doc(db, "students", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { student_id: docSnap.id, ...docSnap.data() } as Student;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting student:", error);
        throw error;
    }
};

// --- Enrollment Services ---

export const addEnrollment = async (data: any) => {
    try {
        // Map field names to match the Enrollment type
        const enrollmentData: any = {
            ...data,
            enrolled_at: new Date().toISOString(),
            // Ensure enrollment_status is set (default to Active)
            enrollment_status: data.enrollment_status || 'Active',
            // Map status to payment_status if needed
            payment_status: data.payment_status || data.status || 'Unpaid',
            // Map fee_type to payment_type if needed
            payment_type: data.payment_type || data.fee_type || 'Cash',
        };

        // Remove old field names if they exist
        delete enrollmentData.status;
        delete enrollmentData.fee_type;

        const docRef = await addDoc(enrollmentsCol, enrollmentData);
        return docRef.id;
    } catch (error) {
        console.error("Error adding enrollment:", error);
        throw error;
    }
};

export const updateEnrollment = async (id: string, data: Partial<Enrollment>) => {
    try {
        const docRef = doc(db, "enrollments", id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating enrollment:", error);
        throw error;
    }
};

export const deleteEnrollment = async (id: string) => {
    try {
        const docRef = doc(db, "enrollments", id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting enrollment:", error);
        throw error;
    }
};

export const subscribeToEnrollments = (callback: (data: Enrollment[]) => void) => {
    // Use created_at as fallback if enrolled_at doesn't exist, or remove orderBy if field might not exist
    let q;
    try {
        q = query(enrollmentsCol, orderBy("enrolled_at", "desc"));
    } catch (error) {
        // If enrolled_at index doesn't exist, try created_at or no ordering
        try {
            q = query(enrollmentsCol, orderBy("created_at", "desc"));
        } catch {
            q = query(enrollmentsCol);
        }
    }

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            // Ensure enrolled_at exists, fallback to created_at
            if (!docData.enrolled_at && docData.created_at) {
                docData.enrolled_at = docData.created_at;
            }
            return {
                enrollment_id: doc.id,
                ...docData
            } as Enrollment;
        });
        callback(data);
    }, (error) => {
        console.error("Error subscribing to enrollments:", error);
    });
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
    try {
        const docRef = doc(db, "students", id);
        await updateDoc(docRef, {
            ...data,
            modified_at: new Date().toISOString(),
            modified_by: 'Admin User' // TODO: Replace with actual auth user
        });
        return true;
    } catch (error) {
        console.error("Error updating student:", error);
        throw error;
    }
};

export const deleteStudent = async (id: string) => {
    try {
        const docRef = doc(db, "students", id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error("Error deleting student:", error);
        throw error;
    }
};

// --- Class Services ---

export const addClass = async (classData: Omit<Class, 'class_id'>) => {
    try {
        const docRef = await addDoc(classesCol, classData);
        return { id: docRef.id, ...classData };
    } catch (error) {
        console.error("Error adding class:", error);
        throw error;
    }
};

export const getClasses = async (branchId?: string) => {
    try {
        let q = classesCol;
        // if (branchId) q = query(classesCol, where("branch_id", "==", branchId)); // Uncomment if filtering by branch
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            class_id: doc.id,
            ...doc.data()
        } as Class));
    } catch (error) {
        console.error("Error fetching classes:", error);
        throw error;
    }
};

export const subscribeToClasses = (callback: (classes: Class[]) => void, branchId?: string, programId?: string) => {
    let q = query(classesCol);
    if (branchId && programId) {
        q = query(classesCol, where("branchId", "==", branchId), where("programId", "==", programId));
    } else if (branchId) {
        q = query(classesCol, where("branchId", "==", branchId));
    } else if (programId) {
        q = query(classesCol, where("programId", "==", programId));
    }

    return onSnapshot(q, (snapshot) => {
        const classes = snapshot.docs.map(doc => ({
            class_id: doc.id,
            ...doc.data()
        } as Class));
        callback(classes);
    }, (error) => {
        console.error("Error subscribing to classes:", error);
    });
};

// --- Enrollment Services ---

export const enrollStudent = async (enrollmentData: Omit<Enrollment, 'enrollment_id' | 'enrolled_at'>) => {
    try {
        const docRef = await addDoc(enrollmentsCol, {
            ...enrollmentData,
            enrolled_at: new Date().toISOString()
        });
        return { id: docRef.id, ...enrollmentData };
    } catch (error) {
        console.error("Error enrolling student:", error);
        throw error;
    }
};

export const getEnrollmentsByClass = async (classId: string) => {
    try {
        const q = query(enrollmentsCol, where("class_id", "==", classId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            enrollment_id: doc.id,
            ...doc.data()
        } as Enrollment));
    } catch (error) {
        console.error("Error fetching enrollments:", error);
        throw error;
    }
};

export const subscribeToEnrollmentsByClass = (classId: string, callback: (enrollments: Enrollment[]) => void) => {
    const q = query(enrollmentsCol, where("class_id", "==", classId));
    return onSnapshot(q, (snapshot) => {
        const enrollments = snapshot.docs.map(doc => ({
            enrollment_id: doc.id,
            ...doc.data()
        } as Enrollment));
        callback(enrollments);
    }, (error) => {
        console.error("Error subscribing to enrollments:", error);
    });
};

// --- Attendance Services ---

export const recordAttendance = async (attendanceData: Omit<Attendance, 'attendance_id' | 'recorded_at'>) => {
    try {
        const docRef = await addDoc(attendanceCol, {
            ...attendanceData,
            recorded_at: new Date().toISOString()
        });
        return { id: docRef.id, ...attendanceData };
    } catch (error) {
        console.error("Error recording attendance:", error);
        throw error;
    }
};

export const getAttendance = async (classId: string, date: string) => {
    try {
        const q = query(attendanceCol,
            where("class_id", "==", classId),
            where("session_date", "==", date)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            attendance_id: doc.id,
            ...doc.data()
        } as Attendance));
    } catch (error) {
        console.error("Error fetching attendance:", error);
        throw error;
    }
};

export const updateAttendanceStatus = async (attendanceId: string, status: AttendanceStatus) => {
    try {
        const docRef = doc(attendanceCol, attendanceId);
        await updateDoc(docRef, { status, recorded_at: new Date().toISOString() });
    } catch (error) {
        console.error("Error updating attendance:", error);
        throw error;
    }
};

export const subscribeToAttendance = (classId: string, callback: (attendance: Attendance[]) => void) => {
    const q = query(attendanceCol, where("class_id", "==", classId));
    return onSnapshot(q, (snapshot) => {
        const attendance = snapshot.docs.map(doc => ({
            attendance_id: doc.id,
            ...doc.data()
        } as Attendance));
        callback(attendance);
    }, (error) => {
        console.error("Error subscribing to attendance:", error);
    });
};

export const subscribeToDailyAttendance = (date: string, callback: (attendance: Attendance[]) => void) => {
    const q = query(attendanceCol, where("session_date", "==", date));
    return onSnapshot(q, (snapshot) => {
        const attendance = snapshot.docs.map(doc => ({
            attendance_id: doc.id,
            ...doc.data()
        } as Attendance));
        callback(attendance);
    }, (error) => {
        console.error("Error subscribing to daily attendance:", error);
    });
};
