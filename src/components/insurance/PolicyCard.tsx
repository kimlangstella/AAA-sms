import { InsurancePolicy } from "@/types/insurance";
import { Shield, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

interface PolicyCardProps {
  policy: InsurancePolicy;
}

export function PolicyCard({ policy }: PolicyCardProps) {
  const isActive = policy.status === 'Active';
  const isExpired = policy.status === 'Expired';

  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Top Status Bar */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            isActive ? 'bg-indigo-50/50 text-indigo-600' : 
            isExpired ? 'bg-slate-100 text-slate-500' : 'bg-orange-50 text-orange-600'
          }`}>
             <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Provider</p>
            <p className="font-bold text-slate-800 leading-tight">{policy.provider}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1.5 ${
            isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            isExpired ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-orange-50 text-orange-600 border-orange-100'
        }`}>
            {isActive ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {policy.status}
        </div>
      </div>

      {/* Policy Details */}
      <div className="space-y-3 mb-6">
          <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-0.5">Policy Number</p>
              <p className="font-mono font-bold text-slate-600 text-lg tracking-tight bg-slate-50 inline-block px-2 py-0.5 rounded-md border border-slate-100">
                  {policy.policyNumber}
              </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Coverage</p>
                  <p className="font-bold text-slate-700">{policy.type}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Limit</p>
                  <p className="font-bold text-slate-700">${policy.coverageAmount.toLocaleString()}</p>
               </div>
          </div>
      </div>

      {/* Footer / Student Info */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Insured Student</p>
              <p className="font-bold text-sm text-slate-800">{policy.studentName}</p>
          </div>
          <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Valid Unitl</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Calendar size={12} />
                  {new Date(policy.endDate).toLocaleDateString()}
              </div>
          </div>
      </div>
      
      {/* Decorative colored strip at bottom */}
      <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${
          isActive ? 'bg-indigo-500' : isExpired ? 'bg-slate-300' : 'bg-orange-400'
      }`} />
    </div>
  );
}
