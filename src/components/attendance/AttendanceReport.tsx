"use client";

import { Student, Attendance, Enrollment } from "@/lib/types";
import { CheckCircle2, XCircle, Clock, User, TrendingUp, FileText } from "lucide-react";

interface AttendanceReportProps {
    classEnrollments: Array<{
        enrollment: Enrollment;
        student: Student | undefined;
        attendance: Attendance[];
    }>;
    totalSessions: number;
    className: string;
}

export default function AttendanceReport({ classEnrollments, totalSessions, className }: AttendanceReportProps) {
    const getStats = (attendance: Attendance[]) => {
        const presentCount = attendance.filter(a => a.status === 'Present').length;
        const permissionCount = attendance.filter(a => a.status === 'Permission').length;
        const absentCount = attendance.filter(a => a.status === 'Absent').length;
        const recordedCount = attendance.length;
        
        // Rate usually includes Present + Permission as "Attended/Excused"
        const effectivePresent = attendance.filter(a => a.status === 'Present' || a.status === 'Permission').length;
        const presentPercent = recordedCount > 0 ? Math.round((effectivePresent / recordedCount) * 100) : 0;
        
        return { presentCount, permissionCount, absentCount, recordedCount, presentPercent };
    };

    if (classEnrollments.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400">
                No students enrolled in this class
            </div>
        );
    }

    return (
        <div className="p-4">
            <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" />
                Attendance Report - {className}
            </h3>
            
            <div className="space-y-3">
                {classEnrollments.map((item, idx) => {
                    const stats = getStats(item.attendance);
                    const remarks = item.attendance.filter(a => a.reason || a.status === 'Permission' || a.status === 'Absent');

                    // Sort remarks by session number
                    remarks.sort((a, b) => a.session_number - b.session_number);
                    
                    return (
                        <div key={item.enrollment.enrollment_id} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                                {/* Student Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-sm">
                                        {item.student?.image_url ? (
                                            <img src={item.student.image_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            item.student?.student_name?.charAt(0) || "?"
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{item.student?.student_name || "Unknown"}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{item.student?.student_code}</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-around gap-2 md:gap-6 flex-1">
                                    {/* Present */}
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-emerald-600">
                                            <CheckCircle2 size={14} />
                                            <span className="font-black text-lg">{stats.presentCount}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Present</p>
                                    </div>

                                    {/* Permission */}
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-amber-500">
                                            <Clock size={14} />
                                            <span className="font-black text-lg">{stats.permissionCount}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Leave</p>
                                    </div>

                                    {/* Absent */}
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-rose-500">
                                            <XCircle size={14} />
                                            <span className="font-black text-lg">{stats.absentCount}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-semibold uppercase">Absent</p>
                                    </div>

                                    {/* Attendance Rate */}
                                    <div className="min-w-[80px]">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-slate-500">Rate</span>
                                            <span className={`text-xs font-black ${
                                                stats.presentPercent >= 80 ? 'text-emerald-600' :
                                                stats.presentPercent >= 60 ? 'text-amber-500' :
                                                'text-rose-500'
                                            }`}>
                                                {stats.presentPercent}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all ${
                                                    stats.presentPercent >= 80 ? 'bg-emerald-500' :
                                                    stats.presentPercent >= 60 ? 'bg-amber-500' :
                                                    'bg-rose-500'
                                                }`}
                                                style={{ width: `${stats.presentPercent}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-0.5 text-center">
                                            {stats.recordedCount}/{totalSessions} recorded
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Remarks / Reasons Section */}
                            {remarks.length > 0 && (
                                <div className="bg-white border-t border-slate-100 p-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <FileText size={10} /> Remarks & Exceptions
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {remarks.map(record => (
                                            <div key={record.attendance_id} className="flex items-start gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <div className={`mt-0.5 min-w-[30px] px-1.5 py-0.5 rounded text-[9px] font-bold text-center uppercase ${
                                                    record.status === 'Present' ? 'bg-blue-100 text-blue-700' :
                                                    record.status === 'Permission' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {record.status === 'Present' && (record.reason?.includes('Make-up')) ? 'Make-up' : 
                                                     record.status === 'Permission' ? 'Leave' : record.status}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-600">
                                                        Session {record.session_number} 
                                                        <span className="text-slate-400 font-normal ml-1">
                                                            {new Date(record.session_date).toLocaleDateString()}
                                                        </span>
                                                    </p>
                                                    {record.reason && (
                                                        <p className="text-slate-500 italic mt-0.5 leading-tight">"{record.reason}"</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-700 mb-2">Class Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-black text-slate-800">{classEnrollments.length}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Students</p>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-emerald-600">
                            {Math.round(classEnrollments.reduce((sum, item) => sum + getStats(item.attendance).presentPercent, 0) / classEnrollments.length) || 0}%
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Avg Attendance</p>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800">{totalSessions}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Sessions</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
