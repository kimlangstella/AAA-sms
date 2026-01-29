"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  Lock,
  Unlock,
  Loader2,
  Users,
  MapPin,
  ChevronDown,
  BookOpen,
  Search,
  Filter,
  Download,
  MoreVertical,
  CheckCircle2,
  FileText,
  Table,
  LayoutList
} from "lucide-react";

import {
  Class as ClassType,
  Student,
  Enrollment,
  Attendance,
  AttendanceStatus,
} from "@/lib/types";

import {
  subscribeToClasses,
  subscribeToStudents,
  subscribeToEnrollmentsByClass,
  subscribeToAttendance,
  recordAttendance,
  updateAttendanceStatus,
} from "@/lib/services/schoolService";

import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";
import { Branch } from "@/lib/types";
import { AttendanceCell } from "@/components/attendance/AttendanceCell";

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessionDates, setSessionDates] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tracking' | 'report'>('tracking');
  const [isEditing, setIsEditing] = useState(false); // Locking state

  // --- Initial Data Fetching ---
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we should default to report view based on params or history?
    // For now, default to tracking unless specified
    if (searchParams.get('mode') === 'report') {
        setViewMode('report');
    }
  }, [searchParams]);

  useEffect(() => {
    const unsubClasses = subscribeToClasses(setClasses);
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubBranches = branchService.subscribe(setBranches);
    const unsubPrograms = programService.subscribe(setPrograms);

    return () => {
      unsubClasses();
      unsubStudents();
      unsubBranches();
      unsubPrograms();
    };
  }, []);

  // Initialize filters from URL
  useEffect(() => {
      const branchId = searchParams.get('branchId');
      const programId = searchParams.get('programId');
      const classId = searchParams.get('classId');
    
    if (branchId) setSelectedBranchId(branchId);
    if (programId) setSelectedProgramId(programId);
    if (classId) {
        setSelectedClassId(classId);
    }
  }, [searchParams]);

  // --- Class Data Fetching ---
  useEffect(() => {
    if (!selectedClassId) {
      setEnrollments([]);
      setAttendanceRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubEnrollments = subscribeToEnrollmentsByClass(
      selectedClassId,
      (data) => {
        setEnrollments(data);
        setLoading(false);
      }
    );

    const unsubAttendance = subscribeToAttendance(selectedClassId, (data) => {
      setAttendanceRecords(data);
      const dates: Record<number, string> = {};
      data.forEach((r) => {
        if (!dates[r.session_number]) {
          dates[r.session_number] = r.session_date;
        }
      });
      setSessionDates((prev) => ({ ...prev, ...dates }));
    });

    return () => {
      unsubEnrollments();
      unsubAttendance();
    };
  }, [selectedClassId]);

  // --- Data Processing ---
  const gridData = useMemo(() => {
    return enrollments
      .map((enrollment) => {
        const student = students.find(
          (s) => s.student_id === enrollment.student_id
        );
        return {
          enrollment,
          student,
          attendance: attendanceRecords.filter(
            (r) => r.enrollment_id === enrollment.enrollment_id
          ),
        };
      })
      .sort((a, b) =>
        (a.student?.student_name || "").localeCompare(
          b.student?.student_name || ""
        )
      );
  }, [enrollments, students, attendanceRecords]);

  // --- Report Data Calculation ---
  const reportData = useMemo(() => {
      const maxSession = attendanceRecords.length > 0 
          ? Math.max(...attendanceRecords.map(r => r.session_number)) 
          : 0;
      
      return gridData.map(item => {
          const presents = item.attendance.filter(r => r.status === 'Present').length;
          const absents = item.attendance.filter(r => r.status === 'Absent').length;
          const permissions = item.attendance.filter(r => r.status === 'Permission').length;
          const totalRecorded = item.attendance.length;
          
          // Calculate Percentage (based on current max session or recorded?)
          // Usually based on maxSession of the class so far
          const percentage = maxSession > 0 ? ((presents + permissions) / maxSession) * 100 : 0; // Treating Permission as not-absent for %? Or just Present?
          // User policy defaults: Present + MakeUp (which is Present status) counts. Permission might be deduction-free but not "Present".
          // Let's stick to (Present / Max) * 100 for strict, or (Present+Late / Max)
          // Simplest: (Presents / MaxSession) * 100
          
          return {
              ...item,
              stats: {
                  presents,
                  absents,
                  permissions,
                  percentage: Math.round(percentage),
                  grade: percentage >= 90 ? 'Good' : percentage >= 70 ? 'Warning' : 'Critical'
              }
          };
      });
  }, [gridData, attendanceRecords]);

  const filteredPrograms = useMemo(() => {
    return programs
        .filter((p: any) => !selectedBranchId || p.branchId === selectedBranchId || p.branch_id === selectedBranchId)
        .map((p: any) => ({
            ...p,
            program_id: p.id || p.program_id,
            program_name: p.name || p.program_name
        }));
  }, [programs, selectedBranchId]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
         if (selectedBranchId && c.branchId !== selectedBranchId) return false;
         if (selectedProgramId && c.programId !== selectedProgramId) return false;
         return true;
    });
  }, [classes, selectedBranchId, selectedProgramId]);

  // --- Handlers ---
  async function handleStatusChange(
    enrollmentId: string,
    studentId: string,
    sessionNumber: number,
    status: AttendanceStatus,
    existingRecordId?: string,
    reason?: string 
  ) {
    try {
      const date =
        sessionDates[sessionNumber] ||
        new Date().toISOString().split("T")[0];

      if (existingRecordId) {
        await updateAttendanceStatus(existingRecordId, status);
      } else {
        await recordAttendance({
          enrollment_id: enrollmentId,
          class_id: selectedClassId,
          student_id: studentId,
          session_number: sessionNumber,
          session_date: date,
          status,
          reason,
        });
      }
    } catch (err) {
      console.error("Attendance update failed", err);
    }
  }

  const handleDateChange = (sessionNum: number, date: string) => {
    setSessionDates((prev) => ({ ...prev, [sessionNum]: date }));
  };

  return (

        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Attendance</h1>
                <p className="text-slate-400 font-bold text-sm">Manage class participation and track student records.</p>
            </div>

            {/* Compact Filters Row */}
            <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                 
                 {/* Branch Filter */}
                 <div className="relative w-full md:flex-1">
                    <select 
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 outline-none cursor-pointer appearance-none hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                        value={selectedBranchId}
                        onChange={(e) => {
                            setSelectedBranchId(e.target.value);
                            setSelectedProgramId("");
                            setSelectedClassId("");
                        }}
                    >
                        <option value="">All Branches</option>
                        {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                 </div>

                 {/* Program Filter */}
                 <div className="relative w-full md:flex-1">
                    <select 
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 outline-none cursor-pointer appearance-none hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                        value={selectedProgramId}
                        onChange={(e) => {
                            setSelectedProgramId(e.target.value);
                            setSelectedClassId("");
                        }}
                        disabled={!selectedBranchId}
                    >
                        <option value="">All Programs</option>
                        {filteredPrograms.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                 </div>

                 {/* Class Filter */}
                 <div className="relative w-full md:flex-1">
                    <select 
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 outline-none cursor-pointer appearance-none hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        disabled={!selectedProgramId}
                    >
                        <option value="">Select Class...</option>
                        {filteredClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.className}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                 </div>
            </div>

            {/* Empty State or Content */}
            {!selectedClassId ? (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                    <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 mb-6">
                        <Users size={48} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Ready to track attendance</h3>
                    <p className="text-slate-400 font-medium text-sm text-center max-w-xs">
                        Select a class from the filters above to load the student registry and start marking attendance.
                    </p>
                </div>
            ) : loading ? (
                <div className="h-96 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <p className="font-bold text-slate-400">Retrieving class data...</p>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    
                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
                        <button 
                            onClick={() => setViewMode('tracking')} 
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'tracking' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutList size={16} />
                            <span>Tracking Sheet</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('report')} 
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileText size={16} />
                            <span>Attendance Report</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        
                        {/* HEADER & LEGEND */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                    <Users size={18} className="text-indigo-500" />
                                    <span>{gridData.length} Students Enrolled</span>
                                </div>
                                {viewMode === 'tracking' && (
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        {isEditing ? (
                                            <>
                                                <Unlock size={18} className="text-amber-500" />
                                                <span className="text-amber-600">Editing Mode</span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={18} className="text-slate-400" />
                                                <span className="text-slate-400">Read-Only</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {viewMode === 'tracking' && (
                                <div className="flex items-center gap-4">
                                     <button 
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                                            isEditing 
                                                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' 
                                                : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                        }`}
                                     >
                                        {isEditing ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                                        <span>{isEditing ? 'Done Editing' : 'Edit Attendance'}</span>
                                     </button>

                                    {/* Legend - Only for Tracking */}
                                    <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide border-l border-slate-200 pl-4 ml-2">
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">P - Present</span>
                                        <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded">A - Absent</span>
                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">L - Leave</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CONTENT: TRACKING OR REPORT */}
                        <div className="overflow-x-auto custom-scrollbar pb-4">
                            {viewMode === 'tracking' ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="sticky left-0 z-20 bg-white p-4 min-w-[300px] border-b border-r border-slate-100">
                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest pl-4">Student Details</div>
                                            </th>
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <th key={i} className="p-2 min-w-[100px] border-b border-r border-slate-50 last:border-r-0 bg-slate-50/30">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">S{i + 1}</span>
                                                        <input
                                                            type="date"
                                                            className="w-full bg-transparent text-center text-[10px] font-bold text-slate-600 outline-none hover:bg-white focus:bg-white rounded py-1 transition-colors"
                                                            value={sessionDates[i + 1] || ""}
                                                            onChange={(e) => handleDateChange(i + 1, e.target.value)}
                                                            disabled={!isEditing} 
                                                        />
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gridData.map((item) => (
                                            <tr key={item.enrollment.enrollment_id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 p-4 border-b border-r border-slate-100 transition-colors">
                                                    <div className="flex items-center gap-4 pl-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden border border-slate-200">
                                                            {item.student?.image_url ? (
                                                                <img src={item.student.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                item.student?.student_name.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-sm">{item.student?.student_name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.student?.student_code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const sessionNum = i + 1;
                                                    const record = item.attendance.find(r => r.session_number === sessionNum);
                                                    return (
                                                        <td key={i} className="p-2 border-b border-r border-slate-50 last:border-r-0">
                                                            <AttendanceCell 
                                                                record={record} 
                                                                onChange={(status, reason) => handleStatusChange(
                                                                    item.enrollment.enrollment_id,
                                                                    item.student!.student_id,
                                                                    sessionNum,
                                                                    status,
                                                                    record?.attendance_id,
                                                                    reason
                                                                )}
                                                                readOnly={!isEditing}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                /* REPORT TABLE */
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-4 pl-8 border-b border-r border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-white z-20 min-w-[250px]">Student Details</th>
                                            {/* Session Headers */}
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <th key={i} className="p-2 min-w-[60px] border-b border-r border-slate-50 text-center bg-slate-50/50">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">S{i + 1}</span>
                                                        <span className="text-[9px] font-bold text-slate-300">{sessionDates[i + 1] ? sessionDates[i + 1].split('-').slice(1).join('/') : '-'}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="p-4 border-b border-slate-100 text-center text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">Total</th>
                                            <th className="p-4 border-b border-slate-100 text-center text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">%</th>
                                            <th className="p-4 border-b border-slate-100 text-center text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map((item) => (
                                            <tr key={item.enrollment.enrollment_id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                                                <td className="p-4 pl-8 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden border border-slate-200">
                                                            {item.student?.image_url ? (
                                                                <img src={item.student.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                item.student?.student_name.charAt(0)
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{item.student?.student_name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.student?.student_code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                
                                                {/* Session Cells */}
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const s = i + 1;
                                                    const record = item.attendance.find(r => r.session_number === s);
                                                    let statusChar = "-";
                                                    let colorClass = "text-slate-200";
                                                    let bgClass = "";
                                                    
                                                    if (record) {
                                                        if (record.status === 'Present') {
                                                            const isMakeup = record.reason?.includes("Make up");
                                                            statusChar = isMakeup ? "M" : "P";
                                                            colorClass = isMakeup ? "text-blue-600" : "text-emerald-600";
                                                            bgClass = isMakeup ? "bg-blue-50" : "bg-emerald-50";
                                                        } else if (record.status === 'Absent') {
                                                            statusChar = "A";
                                                            colorClass = "text-rose-600";
                                                            bgClass = "bg-rose-50";
                                                        } else if (record.status === 'Permission') {
                                                            statusChar = "L";
                                                            colorClass = "text-amber-600";
                                                            bgClass = "bg-amber-50";
                                                        }
                                                    }

                                                    return (
                                                        <td key={s} className="p-2 border-r border-slate-50 text-center">
                                                            <div 
                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-xs font-black ${colorClass} ${bgClass}`}
                                                                title={record?.reason || record?.status || "No record"} // Tooltip showing Reason
                                                            >
                                                                {statusChar}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {/* Stats */}
                                                <td className="p-4 text-center bg-slate-50/30">
                                                    <div className="flex flex-col gap-1 items-center justify-center">
                                                        <span className="text-[10px] font-bold text-emerald-600">{item.stats.presents} P</span>
                                                        <span className="text-[10px] font-bold text-rose-600">{item.stats.absents} A</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center bg-slate-50/30">
                                                    <span className="font-black text-slate-700 text-xs">{item.stats.percentage}%</span>
                                                </td>
                                                <td className="p-4 text-center bg-slate-50/30">
                                                    <div className={`w-2 h-2 rounded-full mx-auto ${
                                                        item.stats.grade === 'Good' ? 'bg-emerald-500' :
                                                        item.stats.grade === 'Warning' ? 'bg-amber-500' : 'bg-rose-500'
                                                    }`} title={item.stats.grade} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
    </div>
  );
}


