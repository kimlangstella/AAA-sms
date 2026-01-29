"use client";

import { useState, useEffect } from "react";
import { PolicyCard } from "@/components/insurance/PolicyCard";
import { InsurancePolicy } from "@/types/insurance";
import { 
  ShieldCheck, 
  AlertCircle, 
  Users, 
  Plus, 
  Search, 
  Filter 
} from "lucide-react";

import { AddInsuranceModal } from "@/components/modals/AddInsuranceModal";
import { subscribeToStudents } from "@/lib/services/schoolService";
import { Student } from "@/lib/types";

export default function InsurancePage() {
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Policies from Students
  useEffect(() => {
    const unsubscribe = subscribeToStudents((students) => {
        const extractedPolicies = students
            .filter(s => s.insurance_info) // Only students with insurance
            .map(s => {
                const info = s.insurance_info!;
                
                // Fix: Normalize dates to compare without time
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const endDate = new Date(info.end_date);
                endDate.setHours(0, 0, 0, 0); // Normalize to start of day
                
                // User requirement: "expire top one is expired because it today"
                // So if endDate is today, it is expired.
                const isExpired = endDate <= today;
                
                const thirtyDaysFromNow = new Date(today);
                thirtyDaysFromNow.setDate(today.getDate() + 30);

                // Expiring soon if active but ends within 30 days
                const isExpiringSoon = !isExpired && endDate <= thirtyDaysFromNow;

                return {
                    id: s.student_id, // Use student ID as key for now
                    studentId: s.student_code,
                    studentName: s.student_name,
                    policyNumber: info.policy_number,
                    provider: info.provider,
                    type: info.type,
                    startDate: info.start_date,
                    endDate: info.end_date,
                    coverageAmount: info.coverage_amount,
                    status: isExpired ? 'Expired' : 'Active'
                };
            })
            .sort((a, b) => {
                // Sort Expired first
                if (a.status === 'Expired' && b.status !== 'Expired') return -1;
                if (a.status !== 'Expired' && b.status === 'Expired') return 1;
                return 0; // Keep original order otherwise
            });
        setPolicies(extractedPolicies);
        setLoading(false);
    });

    return () => unsubscribe();
  }); 

  const filteredPolicies = policies.filter(p => {
      // Step 1: Filter by Status Tab
      if (filter !== 'All' && p.status !== filter) return false;

      // Step 2: Filter by Search Query
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
              p.studentName.toLowerCase().includes(query) ||
              p.studentId.toLowerCase().includes(query) ||
              p.policyNumber.toLowerCase().includes(query) ||
              p.provider.toLowerCase().includes(query)
          );
      }

      return true;
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Insurance</h1>
          <p className="text-slate-500 font-medium mt-1">Manage policies and coverage details</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="primary flex items-center gap-2 shadow-indigo-500/20 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold"
        >
          <Plus size={18} />
          <span>New Policy</span>
        </button>
      </div>

      <AddInsuranceModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
            // Data updates automatically via subscription
        }}
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-6 items-center justify-between bg-transparent">
         {/* Custom Rounded Search UI */}
         <div className="flex items-center w-full sm:w-80 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500 transition-all">
            <Search size={14} className="text-slate-400" />
            <div className="w-px h-3 mx-2 bg-slate-200" />
            <input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 p-0" 
            />
         </div>

         {/* Filter Tabs */}
         <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {['All', 'Active', 'Expired'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all
                        ${filter === tab 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'text-slate-500 hover:bg-slate-50'
                        }
                    `}
                >
                    {tab}
                </button>
            ))}
         </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Insurance No.</th>
                        <th className="px-6 py-4">Start Date</th>
                        <th className="px-6 py-4">Expired Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredPolicies.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                                No insurance policies found.
                            </td>
                        </tr>
                    ) : filteredPolicies.map((policy) => (
                        <tr key={policy.id} className="group hover:bg-slate-50/50 transition-colors">
                             <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                         {policy.studentName.charAt(0)}
                                     </div>
                                     <div>
                                         <p className="font-bold text-slate-800 text-sm">{policy.studentName}</p>
                                         <p className="text-[10px] text-slate-400 font-bold">{policy.studentId}</p>
                                     </div>
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <span className="font-bold text-slate-700 text-xs">{policy.policyNumber}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                 {policy.startDate}
                             </td>
                             <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                 {policy.endDate}
                             </td>
                             <td className="px-6 py-4">
                                 <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                     policy.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                     policy.status === 'Expired' ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                     'bg-amber-50 text-amber-600 border border-amber-100'
                                 }`}>
                                     {policy.status}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Details">
                                         <Search size={16} />
                                     </button>
                                     <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                         <Filter size={16} /> 
                                     </button>
                                 </div>
                             </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, trend, icon, color }: any) {
    return (
        <div className={`p-6 rounded-2xl border ${color} transition-all hover:-translate-y-1 hover:shadow-lg`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                    {icon}
                </div>
                {trend && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/50 text-slate-600 border border-slate-200/50">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-wide">{title}</p>
                <h3 className="text-3xl font-black text-slate-800 mt-1">{value}</h3>
            </div>
        </div>
    )
}
