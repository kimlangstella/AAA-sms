"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Loader2, Calendar, Clock, Users, CheckCircle2, FileText, Filter, ArrowLeft, Download } from "lucide-react";

import { Term, Class, Student, Enrollment, Attendance, AttendanceStatus } from "@/lib/types";
import { termService } from "@/services/termService";
import { programService } from "@/services/programService";
import { branchService } from "@/services/branchService";
import { 
    subscribeToClasses, 
    subscribeToStudents,
    subscribeToEnrollmentsByClass,
    subscribeToAttendance,
    recordAttendance,
    updateAttendanceStatus
} from "@/lib/services/schoolService";
import { AttendanceCell } from "@/components/attendance/AttendanceCell";
import { useAttendanceLocking } from "@/hooks/useAttendanceLocking";
import { exportToExcel } from "@/utils/exportUtils";

// Helper function to calculate session dates based on class schedule
function calculateSessionDates(
    startDate: string, 
    endDate: string, 
    classDays: string[], 
    totalSessions: number
): Record<number, string> {
    const dayMap: Record<string, number> = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const scheduledDayNumbers = classDays.map(day => dayMap[day]).filter(d => d !== undefined);
    
    const sessionDates: Record<number, string> = {};
    let sessionNumber = 1;
    let currentDate = new Date(start);

    while (currentDate <= end && sessionNumber <= totalSessions) {
        const dayOfWeek = currentDate.getDay();
        
        if (scheduledDayNumbers.includes(dayOfWeek)) {
            sessionDates[sessionNumber] = currentDate.toISOString().split('T')[0];
            sessionNumber++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return sessionDates;
}

export default function TrackAttendancePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [branches, setBranches] = useState<any[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
    const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
    
    // Filter State
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [selectedProgram, setSelectedProgram] = useState<string>("");
    const [selectedDay, setSelectedDay] = useState<string>(""); 
    const [selectedClass, setSelectedClass] = useState<string>(""); 
    
    const [loading, setLoading] = useState(true);
    const { lockedSessions, setLockedSessions, initializeLocks, toggleLock, isLocked } = useAttendanceLocking();
    const [sessionDates, setSessionDates] = useState<Record<string, Record<number, string>>>({});
    
    // Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        scope: 'current',
        showId: false, // Default per request
        showStats: false, // Default per request
        showLegend: true
    });

    // Fetch initial data
    useEffect(() => {
        const unsubBranches = branchService.subscribe(setBranches);
        const unsubTerms = termService.subscribe(setTerms);
        const unsubPrograms = programService.subscribe(setPrograms);
        const unsubClasses = subscribeToClasses(setClasses);
        const unsubStudents = subscribeToStudents(setStudents);

        setLoading(false);

        return () => {
            unsubBranches();
            unsubTerms();
            unsubPrograms();
            unsubClasses();
            unsubStudents();
        };
    }, []);

    // Initialize from URL params or Default to Active Term
    // Initialize from URL params - Removed auto-select default
    useEffect(() => {
        const termId = searchParams.get('termId');
        if (termId) {
             setSelectedTerm(termId);
        }
    }, [searchParams]);

    // Handle Branch Auto-selection when Term changes
    useEffect(() => {
        if (selectedTerm) {
            const term = terms.find(t => t.term_id === selectedTerm);
            if (term) setSelectedBranch(term.branch_id);
        }
    }, [selectedTerm, terms]);

    // Get current term data
    const currentTerm = useMemo(() => {
        return terms.find(t => t.term_id === selectedTerm) || null;
    }, [terms, selectedTerm]);

    // Filter terms by selected branch
    const filteredTerms = useMemo(() => {
        if (!selectedBranch) return terms;
        return terms.filter(t => t.branch_id === selectedBranch);
    }, [terms, selectedBranch]);

    // Filter programs by term's program_ids
    // Filter programs by term's program_ids OR selected branch OR all
    const filteredPrograms = useMemo(() => {
        if (currentTerm && currentTerm.program_ids) {
            return programs.filter(p => currentTerm.program_ids.includes(p.id));
        }
        if (selectedBranch) {
            return programs.filter(p => p.branchId === selectedBranch);
        }
        return programs;
    }, [programs, currentTerm, selectedBranch]);

    // Filter classes by term's branch, selected program, and selected day
    // Filter classes by term's branch, selected program, and selected day
    const filteredClasses = useMemo(() => {
        return classes.filter(cls => {
            // Filter by Term if selected (ensure class branch matches term branch)
            if (currentTerm && cls.branchId !== currentTerm.branch_id) return false;
            
            // Filter by Branch if selected
            if (selectedBranch && cls.branchId !== selectedBranch) return false;
            
            // Filter by Program if selected
            if (selectedProgram && cls.programId !== selectedProgram) return false;
            
            // Filter by Day if selected
            if (selectedDay && !cls.days.includes(selectedDay)) return false;
            
            return true;
        });
    }, [classes, currentTerm, selectedBranch, selectedProgram, selectedDay]);

    // Get the specific classes to display (handle Class filter)
    const displayClasses = useMemo(() => {
        if (!selectedClass) return filteredClasses;
        return filteredClasses.filter(cls => cls.class_id === selectedClass);
    }, [filteredClasses, selectedClass]);

    // Auto-calculate session dates when relevant data changes
    // Auto-calculate session dates when relevant data changes
    useEffect(() => {
        if (filteredClasses.length === 0) return;

        const newSessionDates: Record<string, Record<number, string>> = {};
        
        filteredClasses.forEach(cls => {
            // Use current term if selected, otherwise find active term for the branch
            let term = currentTerm;
            if (!term) {
                term = terms.find(t => t.branch_id === cls.branchId && t.status === 'Active') || null;
            }

            if (term) {
                const dates = calculateSessionDates(
                    term.start_date,
                    term.end_date,
                    cls.days,
                    cls.totalSessions || 12
                );
                newSessionDates[cls.class_id] = dates;
            }
        });
        
        setSessionDates(newSessionDates);
    }, [currentTerm, filteredClasses, terms]);

    // Subscribe to all enrollments and attendance for filtered classes
    useEffect(() => {
        if (filteredClasses.length === 0) {
            setAllEnrollments([]);
            setAllAttendance([]);
            return;
        }

        const unsubscribers: (() => void)[] = [];
        
        filteredClasses.forEach(cls => {
            const unsubEnroll = subscribeToEnrollmentsByClass(cls.class_id, (enrollments) => {
                setAllEnrollments(prev => {
                    const filtered = prev.filter(e => e.class_id !== cls.class_id);
                    return [...filtered, ...enrollments];
                });
            });
            
            const unsubAttend = subscribeToAttendance(cls.class_id, (attendance) => {
                setAllAttendance(prev => {
                    const filtered = prev.filter(a => a.class_id !== cls.class_id);
                    return [...filtered, ...attendance];
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
        initializeLocks(filteredClasses, allAttendance);
    }, [allAttendance, filteredClasses, initializeLocks]);

    const getClassEnrollments = (classId: string) => {
        return allEnrollments
            .filter(e => e.class_id === classId)
            .map(enrollment => {
                const student = students.find(s => s.student_id === enrollment.student_id);
                const attendance = allAttendance.filter(r => r.enrollment_id === enrollment.enrollment_id);
                return { enrollment, student, attendance };
            })
            .sort((a, b) => (a.student?.student_name || "").localeCompare(b.student?.student_name || ""));
    };

    const handleStatusChange = async (
        classId: string,
        enrollmentId: string,
        studentId: string,
        sessionNumber: number,
        status: AttendanceStatus,
        existingRecordId?: string,
        reason?: string
    ) => {
        try {
            const dates = sessionDates[classId] || {};
            const date = dates[sessionNumber] || new Date().toISOString().split("T")[0];

            if (existingRecordId) {
                await updateAttendanceStatus(existingRecordId, status, reason);
            } else {
                await recordAttendance({
                    enrollment_id: enrollmentId,
                    class_id: classId,
                    student_id: studentId,
                    session_number: sessionNumber,
                    session_date: date,
                    status,
                    reason: reason || "",
                });
            }
        } catch (err) {
            console.error("Attendance update failed", err);
        }
    };

    const handleMarkAllPresent = (classId: string, sessionNumber: number) => {
        const enrollments = getClassEnrollments(classId);
        enrollments.forEach(item => {
            const record = item.attendance.find(r => r.session_number === sessionNumber);
            handleStatusChange(
                classId,
                item.enrollment.enrollment_id,
                item.student!.student_id,
                sessionNumber,
                'Present',
                record?.attendance_id,
                ""
            );
        });
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
        if (displayClasses.length === 0) return { presentCount: 0, latestDateLabel: 'Today' };

        // Robust gathering of records via Enrollment IDs
        const relevantRecords: Attendance[] = [];
        displayClasses.forEach(cls => {
            const classEnrollments = allEnrollments.filter(e => e.class_id === cls.class_id);
            const enrollmentIds = classEnrollments.map(e => e.enrollment_id);
            const classAttendance = allAttendance.filter(a => enrollmentIds.includes(a.enrollment_id));
            relevantRecords.push(...classAttendance);
        });

        if (relevantRecords.length === 0) return { presentCount: 0, latestDateLabel: 'Today' };

        // Find latest date with any records
        const dates = Array.from(new Set(relevantRecords.map(r => r.session_date)));
        dates.sort();
        const latestDate = dates[dates.length - 1];
        
        const count = relevantRecords.filter(a => a.session_date === latestDate && a.status === 'Present').length;
        
        const today = new Date().toISOString().split('T')[0];
        let label = 'Today';
        if (latestDate !== today && latestDate) {
             label = new Date(latestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        return { presentCount: count, latestDateLabel: label };
    }, [allAttendance, allEnrollments, displayClasses]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
        );
    }

    const generateExportHTML = (classData: any, isPrint: boolean, options: any) => {
        const enrollments = getClassEnrollments(classData.class_id);
        const dates = sessionDates[classData.class_id] || {};
        const totalSessions = classData.totalSessions || 12;
        const termName = currentTerm ? currentTerm.term_name : (terms.find(t => t.term_id === selectedTerm)?.term_name || 'All Terms');

        return `
            <div style="margin-bottom: 20px; font-family: Arial, sans-serif;">
                <div style="margin-bottom: 10px; border: 1px solid #ddd; padding: 15px; background: #f9fafb;">
                    <h2 style="margin: 0 0 5px 0; font-size: 18px;">${classData.className}</h2>
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        Term: <strong>${termName}</strong> | Schedule: ${classData.days.join(", ")} (${classData.startTime} - ${classData.endTime})
                    </p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr>
                            ${options.showId ? '<th style="border: 1px solid #ddd; padding: 8px; background: #4F46E5; color: white;">ID</th>' : ''}
                            <th style="border: 1px solid #ddd; padding: 8px; background: #4F46E5; color: white; text-align: left;">Student Name</th>
                            ${Array.from({ length: totalSessions }).map((_, i) => {
                                const date = dates[i + 1] ? new Date(dates[i + 1]).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : '';
                                return `<th style="border: 1px solid #ddd; padding: 4px; background: #4F46E5; color: white; min-width: 40px;">S${i + 1}<br/><span style="font-size: 9px; font-weight: normal;">${date}</span></th>`;
                            }).join('')}
                            ${options.showStats ? `
                                <th style="border: 1px solid #ddd; padding: 8px; background: #4F46E5; color: white;">Present</th>
                                <th style="border: 1px solid #ddd; padding: 8px; background: #4F46E5; color: white;">Absent</th>
                            `: ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${enrollments.map(item => {
                            let present = 0;
                            let absent = 0;
                            
                            const sessionCells = Array.from({ length: totalSessions }).map((_, i) => {
                                const record = item.attendance.find(r => r.session_number === i + 1);
                                const status = record?.status || '-';
                                
                                if (status === 'Present') present++;
                                if (status === 'Absent') absent++;
                                
                                let display = '-';
                                let bg = '#fff';
                                let color = '#000';

                                if (status === 'Present') { display = 'P'; color = '#059669'; bg = '#ecfdf5'; }
                                else if (status === 'Absent') { display = 'A'; color = '#dc2626'; bg = '#fef2f2'; }
                                else if (status === 'Permission') { display = 'L'; color = '#d97706'; bg = '#fffbeb'; }
                                
                                return `<td style="border: 1px solid #ddd; padding: 4px; text-align: center; color: ${color}; background: ${bg}; font-weight: bold;">${display}</td>`;
                            }).join('');

                            return `
                                <tr>
                                    ${options.showId ? `<td style="border: 1px solid #ddd; padding: 8px;">${item.student?.student_code || ''}</td>` : ''}
                                    <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${item.student?.student_name}</td>
                                    ${sessionCells}
                                    ${options.showStats ? `
                                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${present}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #dc2626;">${absent}</td>
                                    `: ''}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ${options.showLegend ? `
                    <div style="margin-top: 5px; font-size: 8px; color: #666; text-align: right;">
                        <strong>Legend:</strong> P = Present, A = Absent, L = Permission (Leave)
                    </div>
                ` : ''}
            </div>
        `;
    };

    const handlePrint = () => {
        // Hardcoded options for Print
        const options = {
            scope: 'current',
            showId: false,
            showStats: false,
            showLegend: true
        };

        // Filter out classes with no students
        const classesToExport = displayClasses.filter(cls => getClassEnrollments(cls.class_id).length > 0); 
        
        if (classesToExport.length === 0) {
            alert("No classes with students to print.");
            return;
        } 
        
        const termName = currentTerm ? currentTerm.term_name.toUpperCase() : (terms.find(t => t.term_id === selectedTerm)?.term_name.toUpperCase() || 'ALL TERMS');

        // CSS for Landscape and Stacked Layout
        let content = `
            <html>
            <head>
                <title>Attendance Report</title>
                <style>
                    @page { 
                        size: landscape; 
                        margin: 10mm; 
                    }
                    * { 
                        box-sizing: border-box; 
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        -webkit-print-color-adjust: exact; 
                        margin: 0;
                        padding: 10mm;
                        font-size: 11px;
                        width: 100%;
                    }
                    .main-title {
                        text-align: center;
                        font-weight: 900;
                        font-size: 18px;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                        color: #000;
                    }
                    .sub-title {
                        text-align: center;
                        font-weight: bold;
                        font-size: 14px;
                        margin-bottom: 30px;
                        color: #333;
                        border-bottom: 2px solid #000;
                        padding-bottom: 15px;
                    }
                    .class-container {
                        width: 100%;
                        margin-bottom: 0px !important;
                        padding-bottom: 0px !important;
                        page-break-inside: avoid;
                        display: block;
                        clear: both;
                    }
                    .class-header {
                        background-color: #1e40af !important;
                        padding: 6px 12px;
                        font-weight: bold;
                        border: 1px solid #000;
                        border-bottom: none;
                        font-size: 11px;
                        text-transform: uppercase;
                        color: #ffffff !important;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                    }
                    th, td { 
                        border: 1px solid #000; 
                        padding: 4px; 
                        text-align: center;
                        font-size: 10px;
                    }
                    th {
                        background-color: #f8fafc;
                        color: #000;
                        font-weight: bold;
                    }
                    .status-p { color: #16a34a; font-weight: 900; }
                    .status-a { color: #dc2626; font-weight: 900; }
                    .status-l { color: #d97706; font-weight: 900; }
                    .student-name {
                        text-align: left;
                        padding-left: 8px;
                        font-weight: bold;
                        width: 200px;
                    }
                    .session-header {
                        min-width: 35px;
                    }
                    .date-sub {
                        font-size: 8px;
                        font-weight: normal;
                        display: block;
                        margin-top: 2px;
                    }
                    
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="main-title">Student Attendance List</div>
                <div class="sub-title">Term: ${termName}</div>
        `;

        classesToExport.forEach(cls => {
            const enrollments = getClassEnrollments(cls.class_id);
            const dates = sessionDates[cls.class_id] || {};
            const totalSessions = cls.totalSessions || 12;
            
            content += `
                <div class="class-container">
                    <div class="class-header">
                        Class Schedule: ${cls.className} (${cls.days.join(", ")} ${cls.startTime} - ${cls.endTime})
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30px;">No.</th>
                                <th class="student-name">Student Name</th>
                                ${Array.from({ length: totalSessions }).map((_, i) => {
                                    const date = dates[i + 1] ? new Date(dates[i + 1]).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
                                    return `
                                        <th class="session-header">
                                            S${i+1}
                                            ${date ? `<span class="date-sub">${date}</span>` : ''}
                                        </th>
                                    `;
                                }).join('')}
                                <th style="width: 100px;">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${enrollments.map((item, idx) => {
                                const sessionCells = Array.from({ length: totalSessions }).map((_, i) => {
                                    const record = item.attendance.find(r => r.session_number === i + 1);
                                     const s = (record?.status || '').toLowerCase();
                                     let display = '';
                                     let statusClass = '';
                                     
                                     if (s === 'present' || s === 'p') { 
                                         display = 'P'; 
                                         statusClass = 'status-p';
                                     }
                                     else if (s === 'absent' || s === 'a') { 
                                         display = 'A'; 
                                         statusClass = 'status-a';
                                     }
                                     else if (s === 'permission' || s === 'l' || s === 'leave') { 
                                         display = 'L'; 
                                         statusClass = 'status-l';
                                     }
                                     
                                     return `<td class="${statusClass}">${display}</td>`;
                                }).join('');

                                return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td class="student-name">
                                            ${item.student?.student_name.toUpperCase()}
                                        </td>
                                        ${sessionCells}
                                        <td></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        content += `
            <div style="margin-top: 20px; font-size: 10px; font-weight: bold; border-top: 1px solid #000; padding-top: 10px;">
                * Note: P = Present, A = Absent, L = Permission (Leave)
            </div>
        </body></html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(content);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const handleExportExcel = () => {
        // Hardcoded options for Excel
        const options = {
            scope: 'current',
            showId: false, 
            showStats: false, 
            showLegend: true
        };
        
        // Filter out classes with no students
        const classesToExport = displayClasses.filter(cls => getClassEnrollments(cls.class_id).length > 0); 
        
        if (classesToExport.length === 0) {
            alert("No classes with students to export.");
            return;
        }

        let content = "";
        classesToExport.forEach(cls => {
            content += generateExportHTML(cls, false, options);
        });
        
        const fileName = `Attendance_${options.scope}_${new Date().toISOString().split('T')[0]}`;
        exportToExcel(fileName, content);
    };

    return (
        <div className="max-w-[95%] mx-auto space-y-6 pb-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-4 px-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/admin/attendance/terms')}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-800">Attendance Tracking</h1>
                            {currentTerm && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    currentTerm.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                    currentTerm.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                    currentTerm.status === 'Inactive' ? 'bg-slate-100 text-slate-500' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                    {currentTerm.status}
                                </span>
                            )}
                        </div>
                        {currentTerm ? (
                            <p className="text-xs text-slate-500 font-semibold">
                                {currentTerm.term_name} • {new Date(currentTerm.start_date).toLocaleDateString()} - {new Date(currentTerm.end_date).toLocaleDateString()}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500 font-semibold">Managing attendance for all classes</p>
                        )}
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowExportModal(true)}
                    disabled={displayClasses.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileText size={16} />
                    <span>Export / Print</span>
                </button>
            </div>
            
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                        <h2 className="text-xl font-black text-slate-800 mb-6">Export Options</h2>
                        
                        <div className="space-y-6">
                            {/* Scope */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Scope</label>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="font-bold text-slate-700">{displayClasses.length} Classes Selected</p>
                                    <p className="text-xs text-slate-400 mt-1">Based on current filters (Term, Program, etc.)</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                >
                                    <FileText size={18} />
                                    Print View
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                                >
                                    <Download size={18} />
                                    Export Excel
                                </button>
                            </div>
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTERS */}
            <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-700">Filters</h2>
                </div>
                
                {/* Context Filters (Branch & Term) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                    <div>
                         <label className="block text-xs font-bold text-slate-500 mb-2">Branch</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => {
                                setSelectedBranch(e.target.value);
                                setSelectedTerm(""); 
                                setSelectedProgram("");
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm appearance-none cursor-pointer"
                        >
                            <option value="">All Branches</option>
                            {branches.map(branch => (
                                <option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Term</label>
                        <select
                            value={selectedTerm}
                            onChange={(e) => {
                                setSelectedTerm(e.target.value);
                                setSelectedProgram("");
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm appearance-none cursor-pointer"
                        >
                            <option value="">All Terms</option>
                            {filteredTerms.map(term => (
                                <option key={term.term_id} value={term.term_id}>{term.term_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* View Filters (Program, Day, Class) */}
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
                            <option value="">All Programs</option>
                            {filteredPrograms.map(program => (
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
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
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
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
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
            {displayClasses.length > 0 && (
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

            {/* CLASSES DISPLAY */}
            {displayClasses.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <BookOpen className="mx-auto text-slate-300 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Classes Found</h3>
                    <p className="text-slate-400 text-sm">No classes found matching the selected filters.</p>
                    <div className="mt-4 p-2 bg-slate-100 rounded text-[10px] text-slate-500 font-mono text-left inline-block">
                         <p>Debug: Term={currentTerm?.term_name || 'All'}, Program={selectedProgram || 'All'}, Day={selectedDay || 'All'}</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {displayClasses.map(cls => (
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
                                        <span>{getClassEnrollments(cls.class_id).length} Students</span>
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="sticky left-0 z-20 bg-white p-4 min-w-[250px] border-b border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Student</div>
                                            </th>
                                            {Array.from({ length: cls.totalSessions || 12 }).map((_, i) => {
                                                const sessionNum = i + 1;
                                                const sessionDate = sessionDates[cls.class_id]?.[sessionNum];
                                                const formattedDate = sessionDate 
                                                    ? new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                    : '';
                                                
                                                return (
                                                    <th key={i} className={`p-2 min-w-[110px] border-b border-r border-slate-50 last:border-r-0 ${isLocked(cls.class_id, sessionNum) ? 'bg-slate-100/50' : 'bg-slate-50/30'}`}>
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">S{sessionNum}</span>
                                                                <button
                                                                    onClick={() => toggleLock(cls.class_id, sessionNum)}
                                                                    className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${
                                                                        isLocked(cls.class_id, sessionNum)
                                                                            ? 'text-slate-500 bg-slate-200' 
                                                                            : 'text-slate-300 hover:text-indigo-500'
                                                                    }`}
                                                                    title={isLocked(cls.class_id, sessionNum) ? "Unlock Session" : "Lock Session"}
                                                                >
                                                                    {isLocked(cls.class_id, sessionNum) ? (
                                                                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                                    ) : (
                                                                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {formattedDate && (
                                                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                    {formattedDate}
                                                                </span>
                                                            )}
                                                            {!isLocked(cls.class_id, sessionNum) && (
                                                                <button
                                                                    onClick={() => handleMarkAllPresent(cls.class_id, sessionNum)}
                                                                    className="text-[9px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors"
                                                                    title="Mark all students present for this session"
                                                                >
                                                                    ✓ All
                                                                </button>
                                                            )}
                                                            <input
                                                                type="date"
                                                                className={`w-full bg-transparent text-center text-[9px] font-semibold text-slate-500 outline-none hover:bg-white focus:bg-white rounded py-1 transition-colors mt-1 ${isLocked(cls.class_id, sessionNum) ? 'cursor-not-allowed opacity-50' : ''}`}
                                                                value={sessionDate || ""}
                                                                onChange={(e) => handleDateChange(cls.class_id, sessionNum, e.target.value)}
                                                                disabled={isLocked(cls.class_id, sessionNum)}
                                                            />
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getClassEnrollments(cls.class_id).length === 0 ? (
                                            <tr>
                                                <td colSpan={(cls.totalSessions || 12) + 1} className="p-8 text-center text-slate-400 text-sm">
                                                    No students enrolled in this class
                                                </td>
                                            </tr>
                                        ) : (
                                            getClassEnrollments(cls.class_id).map((item) => (
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
                                                    {Array.from({ length: cls.totalSessions || 12 }).map((_, i) => {
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
                                                                        status as AttendanceStatus,
                                                                        record?.attendance_id,
                                                                        reason
                                                                    )}
                                                                    readOnly={isLocked(cls.class_id, sessionNum)}
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
