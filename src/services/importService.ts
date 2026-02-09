import { db } from "../lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";
import { Student, Enrollment, StudentStatus, EnrollmentStatus, PaymentStatus, PaymentType } from "../lib/types";

const studentsCol = collection(db, "students");
const enrollmentsCol = collection(db, "enrollments");

export interface ImportPreviewResult {
    newStudents: number;
    matchedStudents: number;
    newEnrollments: number;
    skippedEnrollments: number;
    errors: { row: number; error: string; data: any }[];
}

export const findStudentByMatch = async (matchBy: 'phone' | 'email', value: string) => {
    if (!value) return null;
    const q = query(studentsCol, where(matchBy, "==", value.trim()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Student & { id: string };
};

export const findEnrollment = async (studentId: string, classId: string, term: string) => {
    const q = query(
        enrollmentsCol,
        where("student_id", "==", studentId),
        where("class_id", "==", classId),
        where("term", "==", term)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Enrollment & { id: string };
};

export const importStudent = async (data: any, matchBy: 'phone' | 'email', updateEmptyOnly: boolean) => {
    const matchValue = data[matchBy === 'phone' ? 'Phone' : 'Email'];
    let student = await findStudentByMatch(matchBy, matchValue);

    if (student) {
        if (updateEmptyOnly) {
            const updates: any = {};
            Object.keys(data).forEach(key => {
                const fieldMap: any = {
                    'Full Name': 'student_name',
                    'Gender': 'gender',
                    'DOB': 'dob',
                    'Address': 'address'
                };
                const studentKey = fieldMap[key];
                if (studentKey && !student[studentKey as keyof Student] && data[key]) {
                    updates[studentKey] = data[key];
                }
            });
            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, "students", student.id), {
                    ...updates,
                    modified_at: new Date().toISOString()
                });
            }
        }
        return { id: student.id, matched: true };
    } else {
        // Create new student
        const names = (data['Full Name'] || '').split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';

        const newStudentData: any = {
            student_name: data['Full Name'],
            first_name: firstName,
            last_name: lastName,
            phone: data['Phone'] || '',
            email: data['Email'] || '',
            gender: data['Gender'] || 'Male',
            dob: data['DOB'] || '',
            address: data['Address'] || '',
            status: 'Active' as StudentStatus,
            created_at: new Date().toISOString(),
            admission_date: new Date().toISOString()
        };

        const docRef = await addDoc(studentsCol, newStudentData);
        return { id: docRef.id, matched: false };
    }
};

export const processImport = async (
    rows: any[],
    type: 'students' | 'enrollments',
    matchBy: 'phone' | 'email',
    updateEmptyOnly: boolean
): Promise<ImportPreviewResult> => {
    const result: ImportPreviewResult = {
        newStudents: 0,
        matchedStudents: 0,
        newEnrollments: 0,
        skippedEnrollments: 0,
        errors: []
    };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            if (type === 'students') {
                if (!row['Full Name'] || (!row['Phone'] && !row['Email'])) {
                    result.errors.push({ row: i + 1, error: "Missing required fields", data: row });
                    continue;
                }
                const res = await importStudent(row, matchBy, updateEmptyOnly);
                if (res.matched) result.matchedStudents++;
                else result.newStudents++;
            } else {
                // Enrollment import
                if ((!row['Phone'] && !row['Email']) || !row['Class'] || !row['Term']) {
                    result.errors.push({ row: i + 1, error: "Missing required fields", data: row });
                    continue;
                }

                // 1. Find or create student
                const studentRes = await importStudent(row, matchBy, updateEmptyOnly);
                if (studentRes.matched) result.matchedStudents++;
                else result.newStudents++;

                // 2. Find or create enrollment
                // Note: For now we assume Class and Term from file are the IDs or names that need matching.
                // In real life, we might need a lookup for class_id and term_id.
                // For this implementation, we'll use them as is for the uniqueness check.
                const existingEnrollment = await findEnrollment(studentRes.id, row['Class'], row['Term']);

                if (existingEnrollment) {
                    // Update skip logic or update existing
                    const updates: any = {};
                    if (row['Status']) updates.enrollment_status = row['Status'];
                    if (row['Join Date']) updates.enrolled_at = row['Join Date'];

                    if (Object.keys(updates).length > 0) {
                        await updateDoc(doc(db, "enrollments", existingEnrollment.id), updates);
                    }
                    result.skippedEnrollments++;
                } else {
                    const newEnrollmentData: any = {
                        student_id: studentRes.id,
                        class_id: row['Class'],
                        term: row['Term'],
                        enrollment_status: (row['Status'] || 'Active') as EnrollmentStatus,
                        enrolled_at: row['Join Date'] || new Date().toISOString(),
                        payment_status: 'Unpaid' as PaymentStatus,
                        payment_type: 'Cash' as PaymentType,
                        total_amount: 0, // Should be fetched from class price
                        discount: 0,
                        paid_amount: 0
                    };
                    await addDoc(enrollmentsCol, newEnrollmentData);
                    result.newEnrollments++;
                }
            }
        } catch (error: any) {
            result.errors.push({ row: i + 1, error: error.message, data: row });
        }
    }

    return result;
};
