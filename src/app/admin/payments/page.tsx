"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribeToStudents, subscribeToClasses, subscribeToEnrollments, updateEnrollment, deleteEnrollment } from "@/lib/services/schoolService";
import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";
import { Student, Class, Enrollment, Branch } from "@/lib/types";
import { Search, Loader2, Calendar, FileText, Download, Trash2, Filter, CheckCircle, ArrowLeft, ChevronDown, ChevronUp, AlertCircle, Users, DollarSign } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { useRouter } from "next/navigation";

export default function PaymentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  
  const [editingPayment, setEditingPayment] = useState<any | null>(null);

  const [bulkPayModalOpen, setBulkPayModalOpen] = useState(false);
  const [bulkPayDate, setBulkPayDate] = useState("");

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
      contentRef: componentRef,
      documentTitle: "Payment-Report"
  });

  async function handleUpdatePayment(enrollmentId: string, paidAmount: number, dueDate?: string) {
       try {
           const enrollment = enrollments.find(e => e.enrollment_id === enrollmentId);
           if (!enrollment) return;
           
           const total = Number(enrollment.total_amount) - Number(enrollment.discount || 0);
           const isPaid = paidAmount >= total;

           await updateEnrollment(enrollmentId, {
               paid_amount: paidAmount,
               payment_status: isPaid ? 'Paid' : 'Unpaid',
               ...(dueDate ? { payment_due_date: dueDate } : {})
           });
       } catch (err) {
           console.error(err);
           alert("Failed to update payment");
       }
  }

  async function handleDelete(id: string) {
      if (!confirm("Are you sure you want to delete this payment record? This action cannot be undone.")) return;
      try {
          await deleteEnrollment(id);
      } catch (err) {
          console.error(err);
          alert("Failed to delete record");
      }
  }

  async function performBulkPay() {
      if (!selectedClassId || selectedClassId === 'all') return;
      
      const studentsInClass = enrollments.filter(e => e.class_id === selectedClassId);
      let count = 0;
      
      for (const enr of studentsInClass) {
          const needed = Number(enr.total_amount) - Number(enr.discount || 0);
          if (Number(enr.paid_amount) < needed) {
             await updateEnrollment(enr.enrollment_id, {
                 paid_amount: needed,
                 payment_status: 'Paid',
                 ...(bulkPayDate ? { payment_due_date: bulkPayDate } : {})
             });
             count++;
          }
      }
      alert(`Updated ${count} records to Paid.`);
      setBulkPayModalOpen(false);
  }

  function openBulkPayModal(classId: string) {
      if (classId === 'all') return;
      // Default to 1 year from now? or just empty
      setBulkPayDate(""); 
      setBulkPayModalOpen(true);
  }

  useEffect(() => {
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubClasses = subscribeToClasses(setClasses);
    const unsubBranches = branchService.subscribe(setBranches);
    const unsubPrograms = programService.subscribe(setPrograms);
    const unsubEnrollments = subscribeToEnrollments((data) => {
        setEnrollments(data);
        setLoading(false);
    });

    return () => { 
        unsubStudents(); 
        unsubClasses(); 
        unsubBranches();
        unsubPrograms();
        unsubEnrollments(); 
    };
  }, []);

  // Filtered Classes based on Branch/Program
  const filteredClasses = useMemo(() => {
      let filtered = classes;
      if (selectedBranchId !== 'all') {
          filtered = filtered.filter(c => c.branchId === selectedBranchId);
      }
      if (selectedProgramId !== 'all') {
          // Note: programService returns .id, but class stores .programId
          filtered = filtered.filter(c => c.programId === selectedProgramId);
      }
      return filtered;
  }, [classes, selectedBranchId, selectedProgramId]);

  // Combine data
  const paymentRows = useMemo(() => {
      let filtered = enrollments;

      // Filter by Class (if selected) OR filter by filteredClasses (if class is 'all')
      if (selectedClassId !== 'all') {
          filtered = filtered.filter(e => e.class_id === selectedClassId);
      } else {
          // If no specific class selected, restrict to classes available in current filters
          const allowedClassIds = filteredClasses.map(c => c.class_id);
          filtered = filtered.filter(e => allowedClassIds.includes(e.class_id));
      }

      return filtered.map(enr => {
          const student = students.find(s => s.student_id === enr.student_id);
          const cls = classes.find(c => c.class_id === enr.class_id);
          
                  const isPaidAmount = Number(enr.paid_amount) >= (Number(enr.total_amount) - Number(enr.discount || 0));
          const dueDate = enr.payment_due_date || enr.payment_expired; // Fallback for legacy data
          // const isExpired = dueDate && new Date() > new Date(dueDate);
          
          let status = 'Unpaid';
          if (isPaidAmount) status = 'Paid';
          
          // if (isExpired) status = 'Overdue'; 
          
          if (enr.enrollment_status && enr.enrollment_status !== 'Active') {
              status = enr.enrollment_status; 
          } 

          return {
              id: enr.enrollment_id,
              studentName: student?.student_name || 'Unknown',
              studentCode: student?.student_code || 'N/A',
              className: cls?.className || 'Unknown',
              total: Number(enr.total_amount) || 0,
              paid: Number(enr.paid_amount) || 0,
              discount: Number(enr.discount) || 0,
              due_date: dueDate,
              status,
              studentImage: student?.image_url,
              term: enr.term
          };
      }).filter(row => 
          (row.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
          row.studentCode.toLowerCase().includes(searchQuery.toLowerCase())) &&
          row.studentName !== 'Unknown'
      );
  }, [enrollments, students, classes, searchQuery, selectedClassId, filteredClasses]);

  // Group by Student
  const groupedPayments = useMemo(() => {
      const groups: { [key: string]: any } = {};
      
      paymentRows.forEach(row => {
          // Use studentCode as fallback key if ID missing (shouldn't happen)
          const key = row.studentCode + row.studentName; 
          if (!groups[key]) {
              groups[key] = {
                  studentName: row.studentName,
                  studentCode: row.studentCode,
                  studentImage: row.studentImage,
                  items: [],
                  totalFee: 0,
                  totalPaid: 0,
                  totalDiscount: 0
              };
          }
          groups[key].items.push(row);
          groups[key].totalFee += (row.total || 0);
          groups[key].totalPaid += (row.paid || 0);
          groups[key].totalDiscount += (row.discount || 0);
      });

      return Object.values(groups);
  }, [paymentRows]);

  // Calculate Summary Stats
  const summaryStats = useMemo(() => {
      const totalStudents = groupedPayments.length;
      const totalCollected = groupedPayments.reduce((sum, g) => sum + g.totalPaid, 0);
      const totalOutstanding = groupedPayments.reduce((sum, g) => sum + (g.totalFee - g.totalDiscount - g.totalPaid), 0);
      return { totalStudents, totalCollected, totalOutstanding };
  }, [groupedPayments]);

  if (loading) {
      return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  }

  return (
    <div className="space-y-6 pb-20">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold mb-2">
            <ArrowLeft size={16} />
            <span>Back</span>
        </button>



        {/* Unified Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            {/* Search & Filters Group */}
            <div className="flex flex-wrap items-center gap-3 flex-1 w-full md:w-auto">
                 {/* Search */}
                <div className="relative w-full md:w-[310px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search students..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 flex-1">
                    <select
                        value={selectedBranchId}
                        onChange={(e) => {
                            setSelectedBranchId(e.target.value);
                            setSelectedProgramId('all');
                            setSelectedClassId('all');
                        }}
                        className="py-2.5 px-4 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all cursor-pointer hover:border-slate-300 flex-1 min-w-[140px]"
                    >
                        <option value="all">All Branches</option>
                        {branches.map(b => (
                            <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedProgramId}
                        onChange={(e) => {
                            setSelectedProgramId(e.target.value);
                            setSelectedClassId('all');
                        }}
                        disabled={selectedBranchId === 'all' && false} 
                        className="py-2.5 px-4 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all cursor-pointer hover:border-slate-300 flex-1 min-w-[140px]"
                    >
                        <option value="all">All Programs</option>
                        {programs
                            .filter(p => selectedBranchId === 'all' || p.branchId === selectedBranchId)
                            .map(p => (
                            <option key={p.id} value={p.id}>{p.program_name || p.name}</option>
                        ))}
                    </select>
                    
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="py-2.5 px-4 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all cursor-pointer hover:border-slate-300 flex-1 min-w-[140px]"
                    >
                        <option value="all">All Classes</option>
                        {filteredClasses.map(c => (
                            <option key={c.class_id} value={c.class_id}>{c.className}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Actions Group */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                 {selectedClassId !== 'all' && (
                     <button 
                        onClick={() => openBulkPayModal(selectedClassId)}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                        title="Mark all students in this class as Paid"
                     >
                         <CheckCircle size={16} />
                         <span>Mark Class Paid</span>
                     </button>
                 )}
                 <button 
                    onClick={() => handlePrint()}
                    className="px-4 py-2.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-2"
                 >
                     <Download size={16} />
                     <span>Export</span>
                 </button>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div ref={componentRef} className="p-2">
                {/* Print Header */}
                <div className="hidden print:block text-center mb-8 pt-4">
                    <h1 className="text-2xl font-bold text-slate-900">Payment Status Report</h1>
                    <p className="text-slate-500">{new Date().toLocaleDateString()}</p>
                    {selectedClassId !== 'all' && <p className="text-sm font-bold mt-1">Class: {classes.find(c => c.class_id === selectedClassId)?.className}</p>}
                </div>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">Student</th>
                            <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">Class</th>
                            <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Balance Due</th>
                            <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Due Date</th>
                            <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Status</th>
                            <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-wider text-right print:hidden">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {groupedPayments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">No payments found.</td>
                            </tr>
                        ) : (
                            groupedPayments.map((group, idx) => (
                                <PaymentGroupRow 
                                    key={idx} 
                                    group={group} 
                                    onUpdate={handleUpdatePayment}
                                    onDelete={handleDelete}
                                    onEdit={setEditingPayment}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Edit Payment Modal */}
        {editingPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900">Update Payment</h2>
                        <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-600"><div className="p-2 hover:bg-slate-100 rounded-full"><Loader2 size={0} className="hidden" /> <span className="text-xl">×</span></div></button>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                                {editingPayment.studentName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{editingPayment.studentName}</h3>
                                <p className="text-xs text-slate-500 font-medium">Total Fee: ${editingPayment.total}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Paid Amount ($)</label>
                                    <button 
                                        onClick={() => {
                                            const input = document.getElementById('modal-paid-amount') as HTMLInputElement;
                                            if (input) input.value = (Number(editingPayment.total) - Number(editingPayment.discount || 0)).toString();
                                        }}
                                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                                    >
                                        Set Full Amount
                                    </button>
                                </div>
                                <input 
                                    type="number" 
                                    defaultValue={editingPayment.paid}
                                    id="modal-paid-amount"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Payment Expiry Date</label>
                                <input 
                                    type="date" 
                                    defaultValue={editingPayment.due_date}
                                    id="modal-due-date"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                             <button 
                                onClick={async () => {
                                    const paidInput = document.getElementById('modal-paid-amount') as HTMLInputElement;
                                    const dateInput = document.getElementById('modal-due-date') as HTMLInputElement;
                                    const newPaid = Number(paidInput.value);
                                    const newDate = dateInput.value;

                                    if (isNaN(newPaid)) return alert("Invalid Amount");
                                    
                                    await handleUpdatePayment(editingPayment.id, newPaid, newDate);
                                    setEditingPayment(null);
                                }}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {/* Bulk Pay Modal */}
        {bulkPayModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900">Mark Class as Paid</h2>
                        <button onClick={() => setBulkPayModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="text-xl">×</span></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Payment Expiry Date (Optional)</label>
                            <input 
                                type="date" 
                                value={bulkPayDate}
                                onChange={(e) => setBulkPayDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                            />
                            <p className="text-xs text-slate-400 font-medium ml-1">Leave empty to keep existing dates or set to none.</p>
                        </div>
                        <button 
                            onClick={performBulkPay}
                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                        >
                            Confirm Payment
                        </button>
                    </div>
                </div>
             </div>
        )}
    </div>
  );
}

function PaymentGroupRow({ group, onUpdate, onDelete, onEdit }: { group: any, onUpdate: any, onDelete: any, onEdit: any }) {
    const [expanded, setExpanded] = useState(false);
    
    // Derived Group Status
    const netTotal = group.totalFee - group.totalDiscount;
    const balanceDue = netTotal - group.totalPaid;
    const isFullyPaid = group.totalPaid >= netTotal;

    
    return (
        <>
            <tr 
                onClick={() => setExpanded(!expanded)} 
                className={`group cursor-pointer transition-all ${expanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
            >
                <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-lg transition-colors ${expanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white'}`}>
                           {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold overflow-hidden border border-slate-200">
                            {group.studentImage ? <img src={group.studentImage} className="w-full h-full object-cover" /> : group.studentName.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">{group.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{group.items.length} Enrollment{group.items.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </td>
                <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                        {group.items.map((item: any, i: number) => (
                            <span key={i} className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                {item.className}
                            </span>
                        ))}
                    </div>
                </td>
                <td className="py-4 px-6 text-right">
                    <div className="space-y-0.5">
                        <p className={`text-xs font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {isFullyPaid ? 'Paid' : `$${balanceDue.toLocaleString()}`}
                        </p>
                        {!isFullyPaid && <p className="text-[10px] text-slate-400 font-bold">of ${netTotal.toLocaleString()}</p>}
                    </div>
                </td>
                <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                        isFullyPaid 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                        {isFullyPaid ? 'Fully Paid' : 'Unpaid'}
                    </span>
                </td>
                <td className="py-4 px-6 text-right text-slate-400">
                    <div className="text-[10px] font-bold">
                        {expanded ? 'Click to Collapse' : 'Click to Expand'}
                    </div>
                </td>
                <td className="hidden"></td>
            </tr>
            {expanded && (
                <tr className="bg-indigo-50/20 border-b border-indigo-100">
                    <td colSpan={6} className="p-0">
                        <div className="px-14 py-4 space-y-2">
                             <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-1">
                                <div className="col-span-3">Class / Program</div>
                                <div className="col-span-2">Term</div>
                                <div className="col-span-2 text-right">Fee Details</div>
                                <div className="col-span-2 text-right">Due Date</div>
                                <div className="col-span-3 text-right">Actions</div>
                             </div>
                             {group.items.map((row: any) => (
                                 <div key={row.id} className="grid grid-cols-12 items-center bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-indigo-200 transition-colors">
                                     <div className="col-span-3">
                                         <p className="text-xs font-bold text-slate-900">{row.className}</p>
                                         <p className="text-[10px] text-slate-400">ID: {row.id.substring(0,8)}...</p>
                                     </div>
                                     <div className="col-span-2">
                                         <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200">
                                            {row.term || 'N/A'}
                                         </span>
                                     </div>
                                     <div className="col-span-2 text-right">
                                         <div className="space-y-0.5">
                                             <span className="text-xs font-bold text-slate-900">${(Number(row.total) - Number(row.discount || 0) - Number(row.paid)).toLocaleString()}</span>
                                             <span className="text-[10px] text-slate-400"> Due</span>
                                         </div>
                                     </div>
                                     <div className="col-span-2 text-right">
                                          {row.due_date ? (
                                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${row.status === 'Overdue' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                                                  <Calendar size={10} />
                                                  <span className="text-[10px] font-bold">{new Date(row.due_date).toLocaleDateString()}</span>
                                              </div>
                                          ) : (
                                              <span className="text-[10px] font-bold text-slate-300">-</span>
                                          )}
                                     </div>
                                     <div className="col-span-3 flex justify-end gap-2">
                                          <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Mark ${row.className} as paid?`)) {
                                                        const needed = Number(row.total) - Number(row.discount || 0);
                                                        onUpdate(row.id, needed, row.due_date);
                                                    }
                                                }}
                                                className={`p-1.5 rounded-lg transition-all ${row.status === 'Paid' ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                disabled={row.status === 'Paid'}
                                                title="Quick Pay"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></div>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
