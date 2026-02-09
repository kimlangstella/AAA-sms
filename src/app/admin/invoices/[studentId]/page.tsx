"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  School,
  Mail,
  Phone,
  MapPin 
} from "lucide-react";
import { subscribeToEnrollments } from "@/lib/services/schoolService";
import { Student, Enrollment } from "@/lib/types";
import { useReactToPrint } from "react-to-print";

// Mock retrieving single student if service doesn't have it exposed directly as a promise yet
// For now we will try to reuse existing patterns or just fetch from firestore directly if needed
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function InvoicePage() {
  const { studentId } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Invoice-${studentId}`,
  });

  useEffect(() => {
    if (!studentId) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Student
        const studentRef = doc(db, "students", studentId as string);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          // Manually cast as verified structure, or use Partial
          setStudent({ id: studentSnap.id, ...studentSnap.data() } as any);
        }

        // 2. Fetch Enrollments
        const unsub = subscribeToEnrollments((allEnrollments) => {
             const studentEnrollments = allEnrollments.filter(e => e.student_id === studentId);
             setEnrollments(studentEnrollments);
             setLoading(false);
        });

        return () => unsub();

      } catch (error) {
        console.error("Error fetching invoice data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading Invoice...</div>;
  }

  if (!student) {
      return <div className="min-h-screen flex items-center justify-center text-rose-500">Student not found</div>;
  }

  const totalAmount = enrollments.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  const totalPaid = enrollments.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);
  const totalDiscount = enrollments.reduce((sum, e) => sum + Number(e.discount || 0), 0);
  const balance = totalAmount - totalPaid - totalDiscount;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      {/* Actions Header */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
        >
            <ArrowLeft size={18} />
            <span className="font-bold text-sm">Back</span>
        </button>
        <div className="flex gap-3">
            <button 
                onClick={handlePrint}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
                <Printer size={18} />
                <span>Print Invoice</span>
            </button>
        </div>
      </div>

      {/* Invoice Paper */}
      <div ref={componentRef} className="max-w-4xl mx-auto bg-white p-12 rounded-[24px] shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0">
        
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 border border-slate-100 shadow-sm">
                   {/* Logo Placeholder */}
                   <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} /> 
                   <div className="w-full h-full flex items-center justify-center bg-indigo-50 rounded-2xl text-2xl font-black">A</div>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Authentic Advanced Academy</h1>
                    <div className="text-xs font-medium text-slate-400 mt-1 space-y-0.5">
                        <p className="flex items-center gap-1"><MapPin size={12} /> 1st Floor, Boeung Snor Food Village, Phnom Penh</p>
                        <p className="flex items-center gap-1"><Phone size={12} /> 089 284 3984</p>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-4xl font-black text-slate-200 tracking-tighter uppercase">Invoice</h2>
                <p className="font-mono text-sm font-bold text-slate-500 mt-2">#{Math.floor(Math.random() * 100000).toString().padStart(6, '0')}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">{new Date().toLocaleDateString()}</p>
            </div>
        </div>

        {/* Bill To */}
        <div className="flex justify-between mb-12">
            <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Bill To</p>
                <h3 className="text-xl font-bold text-slate-800">{student.student_name}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">ID: {student.student_code}</p>
                <p className="text-sm font-medium text-slate-500">{student.phone}</p>
                <p className="text-sm font-medium text-slate-500">{student.address}</p>
            </div>
            <div className="text-right">
                 {/* Optional: Payment Status or Summary */}
                 <div className={`inline-block px-4 py-2 rounded-xl border ${balance <= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                     <p className={`text-[10px] uppercase font-bold tracking-wider ${balance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Payment Status</p>
                     <p className={`text-lg font-black ${balance <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{balance <= 0 ? 'PAID' : 'UNPAID'}</p>
                 </div>
            </div>
        </div>

        {/* Table */}
        <table className="w-full mb-12">
            <thead className="bg-slate-50 border-y border-slate-100">
                <tr>
                    <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="py-3 px-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Session</th>
                    <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {enrollments.map((enr, idx) => (
                    <tr key={idx}>
                        <td className="py-4 px-4">
                            <p className="font-bold text-slate-700">Tuition Fee</p>
                            <p className="text-xs text-slate-400">Class ID: {enr.class_id}</p>
                        </td>
                         <td className="py-4 px-4 text-center">
                            <span className="font-bold text-slate-600">{enr.start_session}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-slate-700">
                            ${Number(enr.total_amount).toFixed(2)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end border-t border-slate-100 pt-8">
            <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Subtotal</span>
                    <span>${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Discount</span>
                    <span>-${totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Paid</span>
                    <span>-${totalPaid.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span className="font-black text-slate-800 text-lg">Balance Due</span>
                    <span className="font-black text-indigo-600 text-2xl">${Math.max(0, balance).toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-dashed border-slate-200 text-center">
            <p className="text-slate-400 text-xs font-medium">Thank you for choosing Authentic Advanced Academy!</p>
            <p className="text-slate-300 text-[10px] mt-2">www.aaa.edu.kh</p>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="max-w-4xl mx-auto mt-6 flex justify-center print:hidden">
            <button 
                onClick={() => router.push('/admin/students')}
                className="bg-white text-slate-600 px-8 py-3 rounded-xl font-bold text-sm shadow-md border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2"
            >
                <span>OK, Return to Students</span>
            </button>
      </div>
    </div>
  );
}
