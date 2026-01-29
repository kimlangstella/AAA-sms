import { useState, useEffect } from "react";
import { X, Save, Shield, Search, CheckCircle2, Plus } from "lucide-react";
import { updateStudent, subscribeToStudents } from "@/lib/services/schoolService";
import { Student } from "@/lib/types";

interface AddInsuranceModalProps {
  studentId?: string; // Optional now
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInsuranceModal({ studentId: propStudentId, isOpen, onClose, onSuccess }: AddInsuranceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Subscribe to all students on open
  useEffect(() => {
    if (!isOpen || propStudentId) return;

    console.log("Subscribing to students in modal...");
    const unsubscribe = subscribeToStudents((data) => {
        console.log("Students loaded in modal:", data.length);
        setAllStudents(data);
        if (!searchQuery) {
            setSearchResults(data.slice(0, 5));
        }
    });

    return () => unsubscribe();
  }, [isOpen, propStudentId]);

  // Filter students locally
  useEffect(() => {
    // If no query, show recent 5 (or valid subset)
    if (!searchQuery) {
        setSearchResults(allStudents.slice(0, 5));
        return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allStudents.filter(s => {
        const name = (s.student_name || "").toLowerCase();
        const first = (s.first_name || "").toLowerCase();
        const last = (s.last_name || "").toLowerCase();
        const code = (s.student_code || "").toLowerCase();
        
        return name.includes(query) || 
               first.includes(query) || 
               last.includes(query) || 
               code.includes(query);
    });
    setSearchResults(filtered.slice(0, 5));
  }, [searchQuery, allStudents]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      
      const finalStudentId = propStudentId || selectedStudent?.student_id;

      if (!finalStudentId) {
          alert("Please select a student first.");
          return;
      }

      setSubmitting(true);
      
      const formData = new FormData(e.currentTarget);
      const insuranceInfo = {
          provider: "School Standard", // Default
          policy_number: formData.get("ins_policy_number") as string,
          type: "General", // Default
          coverage_amount: 0, // Default
          start_date: formData.get("ins_start_date") as string,
          end_date: formData.get("ins_end_date") as string,
      };

      try {
          await updateStudent(finalStudentId, { insurance_info: insuranceInfo });
          onSuccess();
          onClose();
          // Reset state
          setSelectedStudent(null);
          setSearchQuery("");
      } catch (error) {
          console.error("Error adding insurance:", error);
          alert("Failed to add insurance.");
      } finally {
          setSubmitting(false);
      }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl animate-in zoom-in-95 relative"> 
            {/* Removed overflow-hidden above to allow dropdown to exist freely */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Add Insurance Policy</h3>
                        {selectedStudent && <p className="text-xs text-slate-500 font-medium">For: <span className="text-indigo-600 font-bold">{selectedStudent.student_name}</span></p>}
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Student Search (Show only if no propId) */}
                {!propStudentId && !selectedStudent && (
                    <div className="space-y-4 mb-6">
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                            <h4 className="text-sm font-bold text-amber-800 mb-2">Select Student</h4>
                             <div className="group relative flex items-center bg-white border border-slate-200 rounded-full px-2 shadow-sm focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                                <Search className="text-slate-400 ml-2" size={18} />
                                <div className="w-px h-5 bg-slate-200 mx-3" />
                                <input 
                                    type="text"
                                    placeholder="Search student name..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400 py-3"
                                    autoFocus
                                />
                                {showDropdown && (
                                     <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden divide-y divide-slate-50 z-[100] max-h-[200px] overflow-y-auto">
                                         {searchResults.length > 0 ? searchResults.map(s => (
                                             <button 
                                                key={s.student_id}
                                                type="button"
                                                onClick={() => { 
                                                    setSelectedStudent(s); 
                                                    setSearchQuery(""); 
                                                    setShowDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                                             >
                                                 <div>
                                                     <p className="text-sm font-bold text-slate-800">{s.student_name}</p>
                                                     <p className="text-xs text-slate-400 font-medium">{s.student_code}</p>
                                                 </div>
                                                 <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <Plus size={14} />
                                                 </div>
                                             </button>
                                         )) : (
                                             <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
                                                 {searchQuery ? "No students found." : "Start typing to search..."}
                                             </div>
                                         )}
                                         <div className="px-4 py-2 bg-slate-50 text-[10px] text-slate-400 text-center border-t border-slate-100">
                                            Loaded {allStudents.length} students available
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
                
                {/* Change selected student */}
                {!propStudentId && selectedStudent && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                 {selectedStudent.student_name.charAt(0)}
                             </div>
                             <div>
                                 <p className="text-sm font-bold text-indigo-900">{selectedStudent.student_name}</p>
                                 <p className="text-[10px] text-indigo-600 font-bold">{selectedStudent.student_code}</p>
                             </div>
                        </div>
                        <button type="button" onClick={() => setSelectedStudent(null)} className="text-xs font-bold text-indigo-500 hover:text-indigo-700">Change</button>
                    </div>
                )}

                <div className="space-y-4 mb-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Policy Number</label>
                        <input 
                            name="ins_policy_number" 
                            required 
                            placeholder="e.g. POL-2024-001" 
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm border border-slate-200" 
                        />
                    </div>
                </div>

                <div className={`grid grid-cols-2 gap-4 ${(!propStudentId && !selectedStudent) ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Start Date</label>
                        <input name="ins_start_date" type="date" required className="w-full px-3 py-2 rounded-lg bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500">Valid Until</label>
                        <input name="ins_end_date" type="date" required className="w-full px-3 py-2 rounded-lg bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button 
                        type="submit" 
                        disabled={submitting || (!propStudentId && !selectedStudent)}
                        className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 size={16} />
                        Save Policy
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}
