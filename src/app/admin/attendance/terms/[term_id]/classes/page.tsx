"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2, Calendar, Clock, Users, CheckCircle2, FileText, Filter } from "lucide-react";
import { Term, Class, Student, Enrollment, Attendance, AttendanceStatus } from "@/lib/types";
import { termService } from "@/services/termService";
import { programService } from "@/services/programService";
import { 
    subscribeToClasses, 
    subscribeToStudents,
    subscribeToEnrollmentsByClass,
    subscribeToAttendance,
    recordAttendance,
    updateAttendanceStatus,
    deleteAttendance
} from "@/lib/services/schoolService";
import { AttendanceCell } from "@/components/attendance/AttendanceCell";
import AttendanceReport from "@/components/attendance/AttendanceReport";
import { useAttendanceLocking } from "@/hooks/useAttendanceLocking";

// Helper function to calculate session dates based on class schedule
// Helper function to calculate session dates based on class schedule
function calculateSessionDates(
    startDate: string, 
    endDate: string, 
    classDays: string[], 
    totalSessions: number
): Record<number, string> {
    const dayMap: Record<string, number> = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
    };

    if (!startDate || !endDate || !classDays || classDays.length === 0) return {};

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize class days: lowercase and trimmed
    const scheduledDayNumbers = classDays
        .map(day => dayMap[day.toLowerCase().trim()])
        .filter(d => d !== undefined);
    
    if (scheduledDayNumbers.length === 0) return {};

    const sessionDates: Record<number, string> = {};
    let sessionNumber = 1;
    let currentDate = new Date(start);

    // Safety break to prevent infinite loops (max 365 days lookahead)
    let safetyCounter = 0;
    
    while (currentDate <= end && sessionNumber <= totalSessions && safetyCounter < 365) {
        const dayOfWeek = currentDate.getDay();
        
        if (scheduledDayNumbers.includes(dayOfWeek)) {
            sessionDates[sessionNumber] = currentDate.toISOString().split('T')[0];
            sessionNumber++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        safetyCounter++;
    }

    return sessionDates;
}

export default function ClassesPage() {
    const router = useRouter();
    const params = useParams();
    const termId = params.term_id as string;

    const [term, setTerm] = useState<Term | null>(null);
    const [programs, setPrograms] = useState<any[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<string>("");
    const [selectedDay, setSelectedDay] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [sessionDates, setSessionDates] = useState<Record<string, Record<number, string>>>({});
    const { lockedSessions, setLockedSessions, initializeLocks, toggleLock, isLocked } = useAttendanceLocking();

    // Term is read-only if not Active
    const isReadOnly = term?.status !== 'Active';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const termData = await termService.getById(termId);
                setTerm(termData);

                const unsubPrograms = programService.subscribe(setPrograms);
                const unsubClasses = subscribeToClasses(setClasses);
                const unsubStudents = subscribeToStudents(setStudents);

                setLoading(false);

                return () => {
                    unsubPrograms();
                    unsubClasses();
                    unsubStudents();
                };
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, [termId]);

    // Filter programs by term's program_ids
    const termPrograms = useMemo(() => {
        return programs.filter(program => {
            if (!term || !term.program_ids) return false;
            return term.program_ids.includes(program.id);
        });
    }, [programs, term]);

    // Filter classes by term's branch, selected program, and selected day
    const filteredClasses = useMemo(() => {
        if (!selectedProgram) return [];
        
        return classes.filter(cls => {
            if (!term) return false;
            if (cls.branchId !== term.branch_id) return false;
            if (cls.programId !== selectedProgram) return false;
            // Filter by day if selected
            if (selectedDay && !cls.days.includes(selectedDay)) return false;
            return true;
        });
    }, [classes, term, selectedProgram, selectedDay]);

    // Get the specific class to display
    const displayClasses = useMemo(() => {
        if (!selectedClass) return filteredClasses;
        return filteredClasses.filter(cls => cls.class_id === selectedClass);
    }, [filteredClasses, selectedClass]);

    // Auto-calculate session dates when classes are loaded
    useEffect(() => {
        if (!term || displayClasses.length === 0) return;

        const calculatedDates: Record<string, Record<number, string>> = {};
        
        displayClasses.forEach(cls => {
            const dates = calculateSessionDates(
                term.start_date,
                term.end_date,
                cls.days,
                cls.totalSessions || 11
            );
            calculatedDates[cls.class_id] = dates;
        });

        setSessionDates(prev => ({ ...prev, ...calculatedDates }));
    }, [term, displayClasses]);

    // Subscribe to enrollments and attendance for filtered classes
    useEffect(() => {
        if (filteredClasses.length === 0) {
            setEnrollments([]);
            setAttendanceRecords([]);
            return;
        }

        const unsubscribers: (() => void)[] = [];

        filteredClasses.forEach(cls => {
            const unsubEnroll = subscribeToEnrollmentsByClass(cls.class_id, (data) => {
                setEnrollments(prev => {
                    const filtered = prev.filter(e => e.class_id !== cls.class_id);
                    return [...filtered, ...data];
                });
            });

            const unsubAttend = subscribeToAttendance(cls.class_id, (data) => {
                setAttendanceRecords(prev => {
                    const filtered = prev.filter(a => a.class_id !== cls.class_id);
                    return [...filtered, ...data];
                });
            });

            unsubscribers.push(unsubEnroll, unsubAttend);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [filteredClasses]);

    // Auto-lock sessions that have attendance data
    useEffect(() => {
        initializeLocks(filteredClasses, attendanceRecords);
    }, [attendanceRecords, filteredClasses, initializeLocks]);

    const getProgramName = (programId: string) => {
        return programs.find(p => p.id === programId)?.name || "Unknown";
    };

    const getClassEnrollments = (classId: string) => {
        return enrollments
            .filter(e => e.class_id === classId)
            .filter(e => {
                // Filter by active term (ID or Name for legacy)
                if (!term) return true;
                return e.term_id === term.term_id || e.term === term.term_name;
            })
            .map(enrollment => {
                const student = students.find(s => s.student_id === enrollment.student_id);
                const attendance = attendanceRecords.filter(r => r.enrollment_id === enrollment.enrollment_id);
                return { enrollment, student, attendance };
            })
            .sort((a, b) => (a.student?.student_name || "").localeCompare(b.student?.student_name || ""));
    };

    const handleStatusChange = async (
        classId: string,
        enrollmentId: string,
        studentId: string,
        sessionNumber: number,
        status: AttendanceStatus | "",
        existingRecordId?: string,
        reason?: string
    ) => {
        try {
            const dates = sessionDates[classId] || {};
            const date = dates[sessionNumber] || new Date().toISOString().split("T")[0];

            if (status === "") {
                if (existingRecordId) {
                    await deleteAttendance(existingRecordId);
                }
                return;
            }

            if (existingRecordId) {
                // Update existing record with reason
                await updateAttendanceStatus(existingRecordId, status as AttendanceStatus, reason);
            } else {
                // Create new record
                await recordAttendance({
                    enrollment_id: enrollmentId,
                    class_id: classId,
                    student_id: studentId,
                    session_number: sessionNumber,
                    session_date: date,
                    status: status as AttendanceStatus,
                    reason: reason || "",
                });
            }
        } catch (err) {
            console.error("Attendance update failed", err);
        }
    };

    const handleDateChange = (classId: string, sessionNum: number, date: string) => {
        setSessionDates(prev => ({
            ...prev,
            [classId]: {
                ...(prev[classId] || {}),
                [sessionNum]: date
            }
        }));
    };

    // Calculate Present Stats
    const { presentCount, latestDateLabel } = useMemo(() => {
        if (!selectedProgram || displayClasses.length === 0) return { presentCount: 0, latestDateLabel: 'Today' };

        // Robust gathering of records via Enrollment IDs
        // Note: In this file, all enrollments for filtered classes are in `enrollments` state (hopefully? Need to check context)
        // Wait, in this file `enrollments` contains enrollments for ALL displayClasses?
        // Let's check `subscribeToEnrollmentsByClass` loop in useEffect. Yes, state `enrollments` accumulates them.
        
        const relevantRecords: Attendance[] = []; 
        
        // In this file, `attendanceRecords` is the state name for ALL attendance
        // `enrollments` is the state name for ALL enrollments
        
        displayClasses.forEach(cls => {
            const classEnrollments = enrollments.filter(e => e.class_id === cls.class_id);
            const enrollmentIds = classEnrollments.map(e => e.enrollment_id);
            const classAttendance = attendanceRecords.filter(a => enrollmentIds.includes(a.enrollment_id));
            relevantRecords.push(...classAttendance);
        });

        if (relevantRecords.length === 0) return { presentCount: 0, latestDateLabel: 'Today' };

        // Find latest date with any records
        const dates = Array.from(new Set(relevantRecords.map(r => r.session_date)));
        dates.sort();
        const latestDate = dates[dates.length - 1];
        
        const count = relevantRecords.filter(a => a.session_date === latestDate && a.status === 'Present').length;
        
        // Format label
        const today = new Date().toISOString().split('T')[0];
        let label = 'Today';
        if (latestDate !== today) {
             if (latestDate) {
                 label = new Date(latestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
             }
        }

        return { presentCount: count, latestDateLabel: label };
    }, [attendanceRecords, enrollments, displayClasses, selectedProgram]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-[95%] mx-auto space-y-6 pb-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-4 px-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/admin/attendance/terms')}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-800">Attendance Tracking</h1>
                            {term && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    term.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                    term.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                    term.status === 'Inactive' ? 'bg-slate-100 text-slate-500' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                    {term.status}
                                </span>
                            )}
                        </div>
                        {term && (
                            <p className="text-xs text-slate-500 font-semibold">
                                {term.term_name} • {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Read-Only Notice */}
            {isReadOnly && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                        <Clock size={16} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-800">View Only Mode</p>
                        <p className="text-xs text-amber-600">This term is {term?.status?.toLowerCase()}. Attendance records cannot be modified.</p>
                    </div>
                </div>
            )}

            {/* FILTERS */}
            <div className="glass-panel p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={16} className="text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-700">Filters</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Program Filter */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Program</label>
                        <select
                            value={selectedProgram}
                            onChange={(e) => {
                                setSelectedProgram(e.target.value);
                                setSelectedDay("");
                                setSelectedClass("");
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
                        >
                            <option value="">-- Select Program --</option>
                            {termPrograms.map(program => (
                                <option key={program.id} value={program.id}>{program.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Day Filter */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Day</label>
                        <select
                            value={selectedDay}
                            onChange={(e) => {
                                setSelectedDay(e.target.value);
                                setSelectedClass("");
                            }}
                            disabled={!selectedProgram}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">All Days</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                        </select>
                    </div>

                    {/* Class Filter */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            disabled={!selectedProgram}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">All Classes</option>
                            {filteredClasses.map(cls => (
                                <option key={cls.class_id} value={cls.class_id}>
                                    {cls.className} ({cls.startTime} - {cls.endTime})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* SUMMARY CARD */}
            {selectedProgram && displayClasses.length > 0 && (
                <div className="w-full bg-[#2563EB] rounded-3xl p-6 shadow-xl shadow-blue-200 mb-6 transition-all">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                            <img src="/logo.png" alt="" className="w-6 h-6 object-contain opacity-90" />
                        </div>
                        <div>
                             <h2 className="text-lg font-black text-white">Class Report</h2>
                             <div className="flex items-center gap-2 text-blue-100 text-xs font-bold bg-blue-700/50 px-3 py-1 rounded-full w-fit mt-1">
                                <Calendar size={12} />
                                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="bg-indigo-50 rounded-2xl p-4 flex flex-col justify-between h-20 transition-all hover:scale-105 cursor-pointer">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Total Students</p>
                            <h3 className="text-2xl font-black text-indigo-900">
                                {displayClasses.reduce((sum, cls) => sum + getClassEnrollments(cls.class_id).length, 0)}
                            </h3>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col justify-between h-20 transition-all hover:scale-105 cursor-pointer">
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Present ({latestDateLabel})</p>
                            <h3 className="text-2xl font-black text-emerald-900">
                                {presentCount}
                            </h3>
                        </div>
                    </div>
                </div>
            )}

            {/* CLASSES FOR SELECTED PROGRAM */}
            {!selectedProgram ? (
                <div className="glass-panel p-16 text-center">
                    <Filter className="mx-auto text-slate-300 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Select a Program</h3>
                    <p className="text-slate-400 text-sm">Choose a program from the filters above to view classes and track attendance.</p>
                </div>
            ) : displayClasses.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <BookOpen className="mx-auto text-slate-300 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Classes Found</h3>
                    <p className="text-slate-400 text-sm">
                        No classes found for {getProgramName(selectedProgram)}
                        {selectedDay && ` on ${selectedDay}`} in this term.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Program Header */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">{getProgramName(selectedProgram)}</h2>
                            {selectedDay && <p className="text-xs text-slate-500 font-semibold">{selectedDay} Classes</p>}
                        </div>
                    </div>

                    {/* Classes */}
                    {displayClasses.map(cls => {
                        const classEnrollments = getClassEnrollments(cls.class_id);
                        
                        // Get base calculated dates
                        const calculatedDates = sessionDates[cls.class_id] || {};
                        
                        // Override with actual dates from existing attendance records
                        // This ensures that if a session was delayed/moved and attendance taken, the actual date is shown
                        const actualDates: Record<number, string> = {};
                        if (classEnrollments.length > 0) {
                             const enrollmentIds = classEnrollments.map(e => e.enrollment.enrollment_id);
                             const classAttendance = attendanceRecords.filter(a => enrollmentIds.includes(a.enrollment_id));
                             
                             classAttendance.forEach(record => {
                                 if (record.session_number && record.session_date) {
                                     // We trust the first record we find for a session (assuming all students have same date)
                                     if (!actualDates[record.session_number]) {
                                         actualDates[record.session_number] = record.session_date;
                                     }
                                 }
                             });
                        }
                        
                        const classDates = { ...calculatedDates, ...actualDates };

                        return (
                            <div key={cls.class_id} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                {/* Class Header */}
                                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <h3 className="text-base font-black text-slate-900">{cls.className}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Clock size={12} />
                                                        <span className="font-semibold">{cls.startTime} - {cls.endTime}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Calendar size={12} />
                                                        <span className="font-semibold">{cls.days.join(", ")}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <Users size={16} className="text-indigo-500" />
                                            <span>{classEnrollments.length} Students</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Show Report for inactive terms, Grid for active terms */}
                                {isReadOnly ? (
                                    <AttendanceReport 
                                        classEnrollments={classEnrollments}
                                        totalSessions={cls.totalSessions || 11}
                                        className={cls.className}
                                    />
                                ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="sticky left-0 z-20 bg-white p-4 min-w-[250px] border-b border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Student</div>
                                                </th>
                                                {Array.from({ length: 11 }).map((_, i) => {
                                                    const sessionNum = i + 1;
                                                    const sessionDate = classDates[sessionNum];
                                                    const isSessionLocked = isLocked(cls.class_id, sessionNum);

                                                    const formattedDate = sessionDate 
                                                        ? new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                        : '';
                                                    
                                                    return (
                                                        <th key={i} className={`p-2 min-w-[110px] border-b border-r border-slate-50 last:border-r-0 ${isSessionLocked ? 'bg-slate-100/50' : 'bg-slate-50/30'}`}>
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">S{sessionNum}</span>
                                                                    {!isReadOnly && (
                                                                        <button
                                                                            onClick={() => toggleLock(cls.class_id, sessionNum)}
                                                                            className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${isLocked(cls.class_id, sessionNum) ? 'text-slate-500 bg-slate-200' : 'text-slate-300 hover:text-indigo-500'}`}
                                                                            title={isLocked(cls.class_id, sessionNum) ? "Unlock Column" : "Lock Column"}
                                                                        >
                                                                            {isLocked(cls.class_id, sessionNum) ? (
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                                            ) : (
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {formattedDate && (
                                                                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                        {formattedDate}
                                                                    </span>
                                                                )}
                                                                    {!isReadOnly && !isSessionLocked && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const enrollments = getClassEnrollments(cls.class_id);
                                                                            enrollments.forEach(item => {
                                                                                const sessionNum = i + 1;
                                                                                const record = item.attendance.find(r => r.session_number === sessionNum);
                                                                                handleStatusChange(
                                                                                    cls.class_id,
                                                                                    item.enrollment.enrollment_id,
                                                                                    item.student!.student_id,
                                                                                    sessionNum,
                                                                                    'Present',
                                                                                    record?.attendance_id,
                                                                                    ""
                                                                                );
                                                                            });
                                                                        }}
                                                                        className="text-[9px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors"
                                                                        title="Mark all students present for this session"
                                                                    >
                                                                        ✓ All
                                                                    </button>
                                                                    )}

                                                                <input
                                                                    type="date"
                                                                    className={`w-full bg-transparent text-center text-[9px] font-semibold text-slate-500 outline-none hover:bg-white focus:bg-white rounded py-1 transition-colors mt-1 ${isSessionLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                                                                    value={sessionDate || ""}
                                                                    onChange={(e) => handleDateChange(cls.class_id, sessionNum, e.target.value)}
                                                                    disabled={isReadOnly || isSessionLocked}
                                                                />
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classEnrollments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={13} className="p-8 text-center text-slate-400 text-sm">
                                                        No students enrolled in this class
                                                    </td>
                                                </tr>
                                            ) : (
                                                classEnrollments.map((item) => (
                                                    <tr key={item.enrollment.enrollment_id} className="group hover:bg-slate-50/50 transition-colors">
                                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 p-4 border-b border-r border-slate-100 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden border border-slate-200">
                                                                    {item.student?.image_url ? (
                                                                        <img src={item.student.image_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        item.student?.student_name.charAt(0)
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-700 text-sm">{item.student?.student_name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.student?.student_code}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {Array.from({ length: 11 }).map((_, i) => {
                                                            const sessionNum = i + 1;
                                                            const record = item.attendance.find(r => r.session_number === sessionNum);
                                                            return (
                                                                <td key={i} className="p-2 border-b border-r border-slate-50 last:border-r-0">
                                                                    <AttendanceCell 
                                                                        record={record} 
                                                                        onChange={(status, reason) => handleStatusChange(
                                                                            cls.class_id,
                                                                            item.enrollment.enrollment_id,
                                                                            item.student!.student_id,
                                                                            sessionNum,
                                                                            status,
                                                                            record?.attendance_id,
                                                                            reason
                                                                        )}
                                                                        readOnly={isReadOnly || isLocked(cls.class_id, sessionNum)}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
