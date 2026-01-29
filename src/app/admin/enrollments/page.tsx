"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Search, 
  UserPlus, 
  ChevronRight, 
  Users, 
  Clock, 
  CreditCard,
  X,
  Check,
  Loader2, LayoutGrid, LayoutList, Building2, Globe, Phone, MapPin, School, ArrowLeft, User, Wallet, Landmark, Calendar, CalendarCheck 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Student, Class, Enrollment, Branch } from "@/lib/types";
import { subscribeToStudents, subscribeToClasses, subscribeToEnrollments, addEnrollment, deleteEnrollment } from "@/lib/services/schoolService";
import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";

/* =========================
   TYPES & HELPERS
   ========================= */

// Helper to calculate progress/payment status
const getPaymentStatus = (paid: number, total: number, discount: number = 0) => {
  const finalTotal = Math.max(0, total - discount);
  if (finalTotal === 0) return 'Paid'; 
  const percentage = (paid / finalTotal) * 100;
  return percentage >= 100 ? 'Paid' : 'Unpaid';
};

/* =========================
   COMPONENTS
   ========================= */

function ClassCard({ cls, enrollments, onClick }: { cls: Class, enrollments: Enrollment[], onClick: () => void }) {
  const router = useRouter();
  const activeEnrollments = enrollments.filter(e => e.class_id === cls.class_id);
  const count = activeEnrollments.length;
  const capacity = cls.maxStudents || 0;
  const isFull = capacity > 0 && count >= capacity;
  const width = capacity > 0 ? (count / capacity) * 100 : 0;

  const handleViewAttendance = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin/attendance?branchId=${cls.branchId || ''}&programId=${cls.programId || ''}&classId=${cls.class_id}`);
  };

  return (
    <div onClick={onClick} className="bg-white rounded-3xl p-6 border border-slate-100/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-slate-200 transition-all cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden">
       
       <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <div className="bg-white/20 p-2 rounded-full">
                     <Users size={20} />
                  </div>
              </div>
              <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{cls.className}</h3>
                  <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-400">
                     <Calendar size={12} />
                     <span className="truncate max-w-[120px]">{Array.isArray(cls.days) ? cls.days.join(" • ") : cls.days}</span>
                  </div>
              </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isFull ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
             {isFull ? 'FULL' : 'OPEN'}
          </div>
       </div>

       <div className="space-y-4">
          <div className="flex justify-between items-end">
              <div>
                  <span className="text-3xl font-black text-slate-900">{count}</span>
                  <span className="text-xs font-bold text-slate-400 ml-1">Students</span>
              </div>
              <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">Target: {capacity}</span>
              </div>
          </div>
          
          <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
             <div 
               className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-rose-500' : 'bg-indigo-500'}`} 
               style={{ width: `${width}%` }}
             ></div>
          </div>

          <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex -space-x-2">
                 {activeEnrollments.slice(0, 3).map((e, i) => (
                     <div key={`${e.enrollment_id}-${i}`} className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] text-slate-500 font-bold overflow-hidden">
                         {e.student?.image_url ? <img src={e.student.image_url} className="w-full h-full object-cover" /> : e.student?.student_name?.charAt(0)}
                     </div>
                 ))}
                 {count > 3 && (
                     <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[9px] text-slate-400 font-bold">
                         +{count - 3}
                     </div>
                 )}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                    onClick={handleViewAttendance}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="View Attendance"
                >
                    <CalendarCheck size={14} />
                </button>
                <span className="text-[10px] font-bold text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    View Class <ChevronRight size={12} />
                </span>
              </div>
          </div>
       </div>
    </div>
  );
}

function EnrollmentCard({ enrollment, onRemove }: { enrollment: Enrollment; onRemove: () => void }) {
  const student = enrollment.student;
  const isPaid = getPaymentStatus(enrollment.paid_amount || 0, enrollment.total_amount || 0, enrollment.discount || 0) === 'Paid';

  if (!student) return null;

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-md transition-all gap-4">
       <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold shadow-sm overflow-hidden flex-shrink-0">
             {student.image_url ? (
                 <img src={student.image_url} alt="" className="w-full h-full object-cover" />
             ) : (
                 student.student_name.charAt(0)
             )}
          </div>
          <div>
             <h4 className="font-bold text-slate-900">{student.student_name}</h4>
             <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">ID: {student.student_code}</span>
                <span>•</span>
                <span>Session {enrollment.start_session || 1}</span>
             </div>
          </div>
       </div>
       
       <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
          <div className="flex gap-4 text-right">
             <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                 <p className="font-bold text-slate-900">${enrollment.total_amount?.toLocaleString() || '0'}</p>
             </div>
             <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid</p>
                 <p className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>${enrollment.paid_amount?.toLocaleString() || '0'}</p>
             </div>
             <div className="hidden sm:block">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                 <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                    {isPaid ? 'Paid' : 'Unpaid'}
                 </div>
             </div>
          </div>
          
          <button 
             onClick={(e) => { e.stopPropagation(); onRemove(); }}
             className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
          >
             <Trash2 size={16} />
          </button>
       </div>
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
       <input 
          {...props}
          className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:font-medium"
       />
    </div>
  )
}

function Select({ label, children, ...props }: { label: string, children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
       <select
         {...props}
         className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"
       >
          {children}
       </select>
    </div>
  )
}

/* =========================
   MAIN ENROLLMENT PAGE
========================= */

export default function EnrollmentsPage() {
  // Global State
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Dropdown State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]); // Multi-select
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState(""); // Internal search for dropdown

  // Data Loading
  useEffect(() => {
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubClasses = subscribeToClasses(setClasses);
    const unsubEnrollments = subscribeToEnrollments((data) => {
        setEnrollments(data);
        setLoading(false);
    });
    return () => { unsubStudents(); unsubClasses(); unsubEnrollments(); };
  }, []);

  // Filtered Classes for Grid
  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classes;
    const q = searchQuery.toLowerCase();
    return classes.filter(c => c.className.toLowerCase().includes(q));
  }, [classes, searchQuery]);

  const classRoster = useMemo(() => {
    if (!selectedClass) return [];
    return enrollments
        .filter(e => e.class_id === selectedClass.class_id)
        .map(e => ({ ...e, student: students.find(s => s.student_id === e.student_id) }))
        .filter(e => e.student); // Ensure student exists
  }, [selectedClass, enrollments, students]);

  // Filter students for dropdown
  const availableStudents = useMemo(() => {
    // Exclude already enrolled students
    const unenrolled = students.filter(s => !classRoster.some(r => r.student?.student_id === s.student_id));
    if (!studentSearchQuery) return unenrolled;
    const q = studentSearchQuery.toLowerCase();
    // Search by name (first name included) or code
    return unenrolled.filter(s => s.student_name.toLowerCase().includes(q) || s.student_code.toLowerCase().includes(q));
  }, [students, classRoster, studentSearchQuery]);

  const toggleStudent = (id: string) => {
      setSelectedStudentIds(prev => 
          prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      );
  };

  async function handleAddStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClass || selectedStudentIds.length === 0) return;

    setIsSubmitting(true);
    try {
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);
        
        // Loop through all selected students and enroll them
        const enrollPromises = selectedStudentIds.map(studentId => 
            addEnrollment({
                class_id: selectedClass.class_id,
                student_id: studentId,
                start_session: Number(data.start_session) || 1,
                total_amount: Number(data.total_amount) || 0,
                discount: Number(data.discount) || 0,
                paid_amount: Number(data.paid_amount) || 0,
                payment_status: (Number(data.paid_amount) >= (Number(data.total_amount) - Number(data.discount))) ? 'Paid' : 'Unpaid' as any,
                payment_type: data.payment_type as any || 'Cash',
                payment_expired: data.payment_expired as string,
                payment_date: new Date().toISOString()
            })
        );

        await Promise.all(enrollPromises);
        
        setShowAddModal(false);
        setSelectedStudentIds([]);
        setStudentSearchQuery("");
    } catch (err) {
        alert("Failed to enroll students.");
    } finally {
        setIsSubmitting(false);
    }
  }

  async function handleRemoveStudent(enrollmentId: string) {
    if (!confirm("Are you sure you want to remove this student from the class?")) return;
    try {
        await deleteEnrollment(enrollmentId);
    } catch (err) {
        alert("Failed to remove student.");
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  }

  /* RENDER: CLASS DETAIL VIEW */
  if (selectedClass) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedClass(null)} className="w-10 h-10 rounded-xl border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-white transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{selectedClass.className}</h1>
                        <p className="text-slate-400 font-bold text-xs mt-1">Class Roster & Enrollment</p>
                    </div>
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span>Add Student</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-900">{classRoster.length}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
                    </div>
                </div>
                {/* Add more stats if needed */}
            </div>

            {/* Roster List */}
            <div className="space-y-4">
                {classRoster.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">No students enrolled yet.</p>
                    </div>
                ) : (
                    classRoster.map(enrollment => (
                        <EnrollmentCard key={enrollment.enrollment_id} enrollment={enrollment} onRemove={() => handleRemoveStudent(enrollment.enrollment_id!)} />
                    ))
                )}
            </div>

            {/* MODAL: ADD STUDENT */}
            {showAddModal && (
                <div 
                    onClick={() => setShowAddModal(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                            <h2 className="text-lg font-bold text-slate-900">Enroll Student</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddStudent} className="p-8 space-y-6 overflow-y-auto">
                             {/* CUSTOM STUDENT SELECT WITH MULTI-SELECT & SEARCH */}
                            <div className="space-y-1.5 group">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Select Students</label>
                                <div className="relative">
                                    <button 
                                      type="button" 
                                      onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                                      className="w-full px-4 py-3 text-left rounded-xl bg-slate-50 border-2 border-slate-100 hover:border-indigo-200 hover:bg-white transition-all flex items-center justify-between"
                                    >
                                        {selectedStudentIds.length > 0 ? (
                                            <span className="font-bold text-slate-700">
                                                {selectedStudentIds.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected
                                            </span>
                                        ) : <span className="text-slate-400 font-bold text-sm">Choose students...</span>}
                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${studentDropdownOpen ? 'rotate-90' : ''}`} />
                                    </button>
                                    
                                    {studentDropdownOpen && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-80 overflow-hidden z-20 flex flex-col">
                                            {/* Search Input */}
                                            <div className="p-3 border-b border-slate-50 relative">
                                                <input 
                                                    autoFocus
                                                    value={studentSearchQuery}
                                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                                    placeholder="Search by first name..." 
                                                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                                                />
                                            </div>

                                            {/* List */}
                                            <div className="overflow-y-auto max-h-60 p-1">
                                                {availableStudents.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-slate-400 font-bold">No students found</div>
                                                ) : (
                                                    availableStudents.map((s, index) => {
                                                        const isSelected = selectedStudentIds.includes(s.student_id);
                                                        return (
                                                            <button
                                                                key={`${s.student_id}-${index}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    toggleStudent(s.student_id);
                                                                    setStudentDropdownOpen(false); // Auto-close as requested
                                                                }}
                                                                className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                                            >
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                                                    {isSelected && <Check size={12} className="text-white" />}
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                     <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                        {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-500">{s.student_name.charAt(0)}</span>}
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <p className="font-bold text-slate-800 text-xs truncate">{s.student_name}</p>
                                                                        <p className="text-[10px] text-slate-400 font-medium truncate">{s.student_code}</p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            
                                            {/* Footer Count */}
                                            <div className="p-2 border-t border-slate-50 text-[10px] text-center font-bold text-slate-400 bg-slate-50/50">
                                                {selectedStudentIds.length} selected
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SELECTED STUDENTS DISPLAY */}
                            {selectedStudentIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    {students
                                        .filter(s => selectedStudentIds.includes(s.student_id))
                                        .map(student => (
                                            <div key={student.student_id} className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-xl pr-3 pl-2 py-2 animate-in zoom-in-95 duration-200 group/chip hover:border-indigo-200 transition-colors">
                                                {/* Avatar */}
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-600 overflow-hidden border border-indigo-100 group-hover/chip:scale-105 transition-transform">
                                                    {student.image_url ? <img src={student.image_url} className="w-full h-full object-cover" /> : student.student_name.charAt(0)}
                                                </div>
                                                {/* Info */}
                                                <div className="flex flex-col min-w-[80px] max-w-[140px]">
                                                    <span className="text-[11px] font-black text-slate-700 leading-tight truncate px-1">{student.student_name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 leading-tight truncate px-1">{student.student_code}</span>
                                                </div>
                                                {/* Remove */}
                                                <button 
                                                    type="button" 
                                                    onClick={() => toggleStudent(student.student_id)}
                                                    className="ml-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all hover:scale-110"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Enrollment ID" name="enrollment_id" placeholder="Auto-generated" disabled />
                                <Input label="Start Session" name="start_session" type="number" defaultValue={1} min={1} required />
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Wallet size={14} className="text-indigo-500" />
                                    Payment Details
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Total Amount ($)" name="total_amount" type="number" placeholder="0.00" required />
                                    <Input label="Discount ($)" name="discount" type="number" placeholder="0.00" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Paid Amount ($)" name="paid_amount" type="number" placeholder="0.00" required />
                                    <Select label="Fee Type" name="payment_type">
                                        <option value="Cash">Cash</option>
                                        <option value="ABA">ABA PayWay</option>
                                    </Select>
                                </div>

                                <Input label="Payment Expired" name="payment_expired" type="date" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors text-sm">Cancel</button>
                                <button 
                                  disabled={isSubmitting || selectedStudentIds.length === 0}
                                  className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 text-sm flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                    Enroll {selectedStudentIds.length > 0 ? `${selectedStudentIds.length} Students` : 'Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
  }

  /* RENDER: CLASS BOARD VIEW */
  return (
    <div className="space-y-8 pb-20">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Class Board</h1>
             <p className="text-slate-500 font-medium mt-2">Manage all active classes and student enrollments</p>
          </div>
          
          <div className="flex gap-3">
             <button 
                onClick={() => setShowAddClassModal(true)} 
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-indigo-600 border-2 border-indigo-100 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-all shadow-sm"
             >
                <Plus size={16} />
                <span>New Class</span>
            </button>
             <button 
                onClick={() => setView(view === 'grid' ? 'list' : 'grid')} 
                className="p-2.5 bg-white text-slate-400 border-2 border-slate-100 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
             >
                {view === 'grid' ? <LayoutList size={20} /> : <LayoutGrid size={20} />}
            </button>
          </div>
       </div>

       {/* Search Removed */}

       {/* Class Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map(cls => (
             <ClassCard key={cls.class_id} cls={cls} enrollments={enrollments} onClick={() => setSelectedClass(cls)} />
          ))}
       </div>

      {/* MODAL: ADD CLASS */}
      {showAddClassModal && (
          <div 
             onClick={() => setShowAddClassModal(false)}
             className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          >
               <div 
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
               >
                   <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                                 <Calendar size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Create New Class</h2>
                        </div>
                        <button onClick={() => setShowAddClassModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
                   </div>
                   <CreateClassForm onCancel={() => setShowAddClassModal(false)} onSuccess={() => setShowAddClassModal(false)} />
               </div>
          </div>
      )}
    </div>
  );
}

// Reuse CreateClassForm logic but adapted for Modal
function CreateClassForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [programs, setPrograms] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        const unsub = branchService.subscribe(setBranches);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!selectedBranchId) {
            setPrograms([]);
            return;
        }
        const unsubscribe = programService.subscribe(setPrograms);
        return () => unsubscribe();
    }, [selectedBranchId]);

    // Filter programs by branch if applicable
    const filteredPrograms = programs.filter(p => !p.branchId || p.branchId === selectedBranchId);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);
        const daysStr = data.days as string;
        
        const payload = {
            ...data,
            days: daysStr.split(",").map(s => s.trim()),
            branchId: selectedBranchId
        };

        try {
            await fetch("/api/classes", { method: "POST", body: JSON.stringify(payload) });
            onSuccess();
        } catch (e) {
            setMsg("Failed to open class.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Select Branch</label>
                    <div className="relative">
                        <select 
                            value={selectedBranchId} 
                            onChange={(e) => setSelectedBranchId(e.target.value)} 
                            required 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none"
                        >
                            <option value="">Select Branch...</option>
                            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Select Program</label>
                    <div className="relative">
                        <select 
                            name="programId" 
                            required 
                            disabled={!selectedBranchId}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none disabled:opacity-50"
                        >
                            <option value="">{selectedBranchId ? 'Select Curricula...' : 'Choose Branch First'}</option>
                            {filteredPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <Input label="Class Name" name="className" required placeholder="e.g. Morning A" />
                <Input label="Schedule" name="days" placeholder="Mon, Wed, Fri" />
                
                <div className="grid grid-cols-2 gap-4">
                     <Input label="Start Time" name="startTime" type="time" required />
                     <Input label="End Time" name="endTime" type="time" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <Input label="Max Student" name="maxStudents" type="number" defaultValue={20} />
                     <Input label="Total Sessions" name="totalSessions" type="number" defaultValue={60} />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl text-slate-400 font-bold text-xs hover:bg-slate-50 transition-all">
                    Cancel
                </button>
                <button disabled={loading} className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold text-xs hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    <span>Create Class</span>
                </button>
            </div>
        </form>
    )
}
