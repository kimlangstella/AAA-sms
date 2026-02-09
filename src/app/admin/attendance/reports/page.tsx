"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3, Filter, Download, Calendar, Users, TrendingUp, TrendingDown } from "lucide-react";
import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";
import { termService } from "@/services/termService";
import { 
    subscribeToClasses, 
    subscribeToStudents, 
    subscribeToEnrollmentsByClass,
    subscribeToAttendance 
} from "@/lib/services/schoolService";
import { Student, Enrollment, Attendance } from "@/lib/types";

interface StudentReport {
    student: Student;
    enrollment: Enrollment;
    className: string; // Added className
    totalSessions: number;
    presents: number;
    absents: number;
    leaves: number;
    attendanceRate: number;
}

export default function AttendanceReportsPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]); // Added terms state
    const [programs, setPrograms] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
    
    const [filterBranch, setFilterBranch] = useState("");
    const [filterTerm, setFilterTerm] = useState(""); // Added term filter
    const [filterProgram, setFilterProgram] = useState("");
    const [filterClass, setFilterClass] = useState("");

    useEffect(() => {
        const unsubBranches = branchService.subscribe(setBranches);
        const unsubTerms = termService.subscribe(setTerms); // Subscribe to terms
        const unsubPrograms = programService.subscribe(setPrograms);
        const unsubClasses = subscribeToClasses(setClasses);
        const unsubStudents = subscribeToStudents(setStudents);

        return () => {
            unsubBranches();
            unsubTerms();
            unsubPrograms();
            unsubClasses();
            unsubStudents();
        };
    }, []);

    // Filter terms by selected branch
    const filteredTerms = useMemo(() => {
        if (!filterBranch) return terms;
        return terms.filter(t => t.branch_id === filterBranch);
    }, [terms, filterBranch]);

    // Filter programs by selected branch AND selected term
    const filteredPrograms = useMemo(() => {
        const branchPrograms = filterBranch
            ? programs.filter(p => p.branchId === filterBranch)
            : programs;
            
        // If a term is selected, only show programs associated with that term (if applicable)
        // Since terms have program_ids, we can use that for stricter filtering
        const selectedTermData = terms.find(t => t.term_id === filterTerm);
        if (selectedTermData && selectedTermData.program_ids && selectedTermData.program_ids.length > 0) {
            return branchPrograms.filter(p => selectedTermData.program_ids?.includes(p.id));
        }

        return branchPrograms;
    }, [programs, filterBranch, filterTerm, terms]);

    // Filter classes by selected branch, term, and program
    const filteredClasses = classes.filter(c => {
        if (filterBranch && c.branchId !== filterBranch) return false;
        
        // Filter by program is straightforward
        if (filterProgram && c.programId !== filterProgram) return false;

        // Filter by Term logic
        // If a term is selected, we should check if the class belongs to that term.
        // Classes don't directly have term_id, but they belong to a branch.
        // More importantly, we should use the term filter downstream for enrollments.
        // However, if we want to filter classes themselves (e.g. archived classes), current data model might not support it directly on Class object.
        // But we can filter based on whether the class has ANY enrollment in that term? No, that's circular.
        // For now, we show all classes in the branch/program. Filtering happens at enrollment level.
        
        return true;
    });

    // Subscribe to enrollments and attendance
    useEffect(() => {
        setEnrollments([]);
        setAttendanceRecords([]);

        if (filterClass) {
            const unsubEnroll = subscribeToEnrollmentsByClass(filterClass, setEnrollments);
            const unsubAttend = subscribeToAttendance(filterClass, setAttendanceRecords);
            return () => { unsubEnroll(); unsubAttend(); };
        } else if (filterBranch) {
            // If branch is selected but no class, subscribe to all visible classes
            if (filteredClasses.length === 0) return;
            
            const unsubs: (() => void)[] = [];
            filteredClasses.forEach(cls => {
                unsubs.push(subscribeToEnrollmentsByClass(cls.class_id, (data) => {
                     setEnrollments(prev => {
                         const others = prev.filter(e => e.class_id !== cls.class_id);
                         return [...others, ...data];
                     });
                }));
                unsubs.push(subscribeToAttendance(cls.class_id, (data) => {
                     setAttendanceRecords(prev => {
                         const others = prev.filter(a => a.class_id !== cls.class_id);
                         return [...others, ...data];
                     });
                }));
            });
            return () => unsubs.forEach(u => u());
        }
    }, [filterClass, filterBranch, filteredClasses.map(c => c.class_id).join(',')]); // Use ID string to avoid deep object dependency issues

    // Calculate report data
    const reportData: any[] = useMemo(() => { // Changed type to any specifically to allow adding 'notes' without strict interface check for now or update interface
        if ((!filterClass && !filterBranch) || enrollments.length === 0) return [];

        // Pre-filter enrollments if a Term is selected
        const visibleEnrollments = filterTerm 
            ? enrollments.filter(e => e.term_id === filterTerm)
            : enrollments;

        return visibleEnrollments.map(enrollment => {
            const student = students.find(s => s.student_id === enrollment.student_id);
            const studentAttendance = attendanceRecords.filter(r => r.enrollment_id === enrollment.enrollment_id);
            const enrolledClass = classes.find(c => c.class_id === enrollment.class_id); // Lookup class
            
            const totalSessions = enrolledClass?.totalSessions || 12;
            const presents = studentAttendance.filter(r => r.status === 'Present').length;
            const absents = studentAttendance.filter(r => r.status === 'Absent').length;
  /*          const leaves = studentAttendance.filter(r => r.status === 'Permission').length; */
            const leaves = studentAttendance.filter(r => r.status === 'Permission').length;
            const attendanceRate = totalSessions > 0 ? (presents / totalSessions) * 100 : 0;
            
            // Collect notes/makeup dates
            // We want to find sessions where there is a reason or special status
            const notes = studentAttendance
                .filter(r => r.reason && r.reason.trim() !== "")
                .map(r => `S${r.session_number}: ${r.reason}`)
                .join(", ");

            return {
                student: student!,
                enrollment,
                className: enrolledClass?.className || 'Unknown',
                totalSessions,
                presents,
                absents,
                leaves,
                attendanceRate: Math.round(attendanceRate),
                notes // Add notes
            };
        }).sort((a, b) => (a.student?.student_name || "").localeCompare(b.student?.student_name || ""));
    }, [enrollments, students, attendanceRecords, classes, filterClass, filterBranch, filterTerm]); // Add filterTerm dependenc

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        if (reportData.length === 0) return null;

        const totalStudents = reportData.length;
        const avgAttendanceRate = reportData.reduce((sum, r) => sum + r.attendanceRate, 0) / totalStudents;
        const goodAttendance = reportData.filter(r => r.attendanceRate >= 90).length;
        const poorAttendance = reportData.filter(r => r.attendanceRate < 70).length;

        return {
            totalStudents,
            avgAttendanceRate: Math.round(avgAttendanceRate),
            goodAttendance,
            poorAttendance
        };
    }, [reportData]);

    // Group data by class
    const groupedReportData = useMemo(() => {
        const groups: { [key: string]: StudentReport[] } = {};
        reportData.forEach(report => {
            if (!groups[report.className]) {
                groups[report.className] = [];
            }
            groups[report.className].push(report);
        });
        return groups;
    }, [reportData]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass p-3 px-5 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <BarChart3 size={16} />
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Attendance Reports</h1>
                </div>
                <button 
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={reportData.length === 0}
                >
                    <Download size={16} />
                    <span>Export Report</span>
                </button>
            </div>

            {/* FILTERS */}
            <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={16} className="text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-700">Filters</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Branch</label>
                        <select
                            value={filterBranch}
                            onChange={(e) => {
                                setFilterBranch(e.target.value);
                                setFilterTerm(""); // Reset term when branch changes
                                setFilterProgram("");
                                setFilterClass("");
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-sm"
                        >
                            <option value="">All Branches</option>
                            {branches.map(branch => (
                                <option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Term</label>
                        <select
                            value={filterTerm}
                            onChange={(e) => {
                                setFilterTerm(e.target.value);
                                setFilterProgram("");
                                setFilterClass("");
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-sm"
                        >
                            <option value="">All Terms</option>
                            {filteredTerms.map(term => (
                                <option key={term.term_id} value={term.term_id}>{term.term_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Program</label>
                        <select
                            value={filterProgram}
                            onChange={(e) => {
                                setFilterProgram(e.target.value);
                                setFilterClass("");
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-sm"
                        >
                            <option value="">All Programs</option>
                            {filteredPrograms.map(program => (
                                <option key={program.id} value={program.id}>{program.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Class</label>
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-sm"
                        >
                            <option value="">All Classes</option>
                            {filteredClasses.map(cls => (
                                <option key={cls.class_id} value={cls.class_id}>{cls.className}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* REPORT CONTENT */}
            {!filterBranch && !filterClass ? (
                <div className="glass-panel p-16 text-center">
                    <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Attendance Reports</h3>
                    <p className="text-slate-400 text-sm">Select a branch or class from the filters above to view attendance statistics and reports.</p>
                </div>
            ) : reportData.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <Users className="mx-auto text-slate-300 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Data</h3>
                    <p className="text-slate-400 text-sm">No students found for the selected criteria.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedReportData).map(([className, classReports]) => (
                        <div key={className} className="glass-panel overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-100">
                                <h3 className="text-md font-bold text-slate-800">{className || "Unknown Class"}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="text-left p-4 text-xs font-black text-slate-400 uppercase tracking-wide">Student</th>
                                            <th className="text-center p-4 text-xs font-black text-slate-400 uppercase tracking-wide">Present</th>
                                            <th className="text-center p-4 text-xs font-black text-slate-400 uppercase tracking-wide">Absent</th>
                                            <th className="text-center p-4 text-xs font-black text-slate-400 uppercase tracking-wide">Leave</th>
                                            <th className="text-center p-4 text-xs font-black text-slate-400 uppercase tracking-wide">Total Sessions</th>
                                            <th className="text-center p-4 text-xs font-black text-slate-400 uppercase tracking-wide">Attendance Rate</th>
                                            <th className="text-left p-4 text-xs font-black text-slate-400 uppercase tracking-wide">Notes / Make-up</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classReports.map((report) => (
                                            <tr key={report.enrollment.enrollment_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 overflow-hidden border border-slate-200">
                                                            {report.student?.image_url ? (
                                                                <img src={report.student.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                report.student?.student_name.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm">{report.student?.student_name}</p>
                                                            <p className="text-xs text-slate-400 font-semibold">{report.student?.student_code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                                                        {report.presents}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-rose-50 text-rose-700 font-bold text-sm">
                                                        {report.absents}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold text-sm">
                                                        {report.leaves}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="font-bold text-slate-600 text-sm">{report.totalSessions}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-lg font-black ${
                                                        report.attendanceRate >= 90 ? 'text-emerald-600' :
                                                        report.attendanceRate >= 70 ? 'text-amber-600' :
                                                        'text-rose-600'
                                                    }`}>
                                                        {report.attendanceRate}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-left">
                                                    <span className="text-xs font-medium text-slate-500 block max-w-[200px] break-words">
                                                        {report.notes || "-"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
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
