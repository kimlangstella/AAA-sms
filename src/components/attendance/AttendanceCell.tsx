"use client";

import { useState, useEffect } from "react";
import { AttendanceStatus, Attendance } from "@/lib/types";
import { X, Check } from "lucide-react";

interface AttendanceCellProps {
  record?: Attendance;
  onChange: (status: AttendanceStatus | "", reason?: string) => void;
  readOnly?: boolean;
}

export function AttendanceCell({ record, onChange, readOnly }: AttendanceCellProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [makeupDate, setMakeupDate] = useState("");

  // Initialize from record
  useEffect(() => {
    if (record) {
      // Check if it's a Make-up class
      if (record.status === 'Present' && (record.reason?.startsWith('Make-up') || record.reason?.includes('Make-up'))) {
        setSelectedStatus("Make-up");
        
        // Parse reason for date and note
        // Format: "Make-up for MM/DD/YYYY - Note" or "Make-up Class - Note"
        if (record.reason) {
            const parts = record.reason.split(' - ');
            const mainPart = parts[0]; // "Make-up for ..." or "Make-up Class"
            const notePart = parts.slice(1).join(' - '); // Rest is note
            
            setNoteValue(notePart || "");
            
            if (mainPart.includes('for ')) {
                const dateStr = mainPart.split('for ')[1];
                // Try to parse date to YYYY-MM-DD for input
                try {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        setMakeupDate(date.toISOString().split('T')[0]);
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }
        }
      } else {
        setSelectedStatus(record.status);
        if (record.status === 'Permission' && record.reason) {
            setNoteValue(record.reason);
        } else {
            setNoteValue("");
        }
      }
    } else {
      setSelectedStatus("");
      setNoteValue("");
      setMakeupDate("");
    }
  }, [record]);

  const saveLeaveNote = () => {
    const trimmedNote = noteValue.trim();
    if (selectedStatus === "Make-up") {
        let finalReason = "Make-up Class";
        if (makeupDate) {
            // Format date nicely
            const d = new Date(makeupDate);
            finalReason = `Make-up for ${d.toLocaleDateString('en-US')}`;
        }
        if (trimmedNote) {
            finalReason += ` - ${trimmedNote}`;
        }
        onChange("Present", finalReason);
    } else {
        onChange('Permission', trimmedNote || "");
    }
    setShowNotePopup(false);
  };

  const cancelLeaveNote = () => {
    setShowNotePopup(false);
    // Revert to previous status
    if (record) {
      setSelectedStatus(record.status);
    } else {
      setSelectedStatus("");
    }
  };

  // Determine styling based on status
  const getStyle = () => {
    // Check for specific reasons first
    if ((selectedStatus === "Present" || record?.status === "Present") && (record?.reason === "Make-up" || record?.reason === "Make-up Class" || noteValue.includes("Make-up"))) {
       return "bg-blue-50 border-blue-300 text-blue-700 font-black";
    }

    if (selectedStatus === "Present") return "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold";
    if (selectedStatus === "Absent") return "bg-rose-50 border-rose-300 text-rose-700 font-bold";
    if (selectedStatus === "Permission") return "bg-amber-50 border-amber-300 text-amber-700 font-bold";
    return "bg-white border-slate-200 text-slate-400";
  };

  const getDisplayText = () => {
    // Check for Make-up
    if (selectedStatus === 'Make-up' || (record?.status === "Present" && (record?.reason?.includes("Make-up")))) {
        return "M";
    }

    if (selectedStatus === "Present") return "P";
    if (selectedStatus === "Absent") return "A";
    if (selectedStatus === "Permission") return "L";
    return "-";
  };

  const getStatusLabel = () => {
    // Check for Make-up
    if (selectedStatus === 'Make-up' || (record?.status === "Present" && (record?.reason?.includes("Make-up")))) {
        return "Make-up";
    }

    if (selectedStatus === "Present") return "Present";
    if (selectedStatus === "Absent") return "Absent";
    if (selectedStatus === "Permission") return "Leave";
    return "No Status";
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    
    if (newStatus === "Make-up") {
       setSelectedStatus("Make-up");
       setNoteValue("");
       setMakeupDate(""); 
       setShowNotePopup(true);
       return;
    }

    if (newStatus === "") {
      setSelectedStatus("");
      onChange(""); // Clear status
      return;
    }

    // If selecting Leave/Permission, show popup
    if (newStatus === "Permission") {
      setSelectedStatus(newStatus);
      setShowNotePopup(true);
      setNoteValue(record?.reason || "");
    } else {
      setSelectedStatus(newStatus);
      // Clear reason if switching to standard Present/Absent
      onChange(newStatus as AttendanceStatus, "");
    }
  };

  return (
    <div className="flex justify-center relative">
      <div className="relative">
        <div 
            className={`w-16 h-10 flex items-center justify-center font-bold text-sm rounded-lg border-2 transition-all ${getStyle()}`}
            title={getStatusLabel()}
        >
          {getDisplayText()}
        </div>
        
        <select
          value={record?.status === "Present" && (record?.reason === "Make-up" || record?.reason === "Make-up Class") ? "Make-up" : selectedStatus}
          onChange={handleStatusChange}
          disabled={readOnly}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <option value="">-</option>
          <option value="Present">Present (P)</option>
          <option value="Absent">Absent (A)</option>
          <option value="Permission">Leave (L)</option>
          <option value="Make-up">Make-up (M)</option>
        </select>

        {record?.reason && (
          <div 
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white z-20 cursor-pointer transition-all hover:scale-125 ${
                (record.status === 'Present' && (record.reason === 'Make-up' || record.reason?.includes('Make-up'))) ? 'bg-blue-500' : 'bg-amber-500'
            }`}
            title={record.reason}
            onClick={(e) => {
                e.stopPropagation(); // Prevent bubbling if needed
                setShowNotePopup(true);
            }}
          />
        )}
      </div>

      {showNotePopup && (
        <>
            <div 
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" 
                onClick={cancelLeaveNote}
            />
            {/* Centered Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 w-80 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedStatus === 'Make-up' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                    {selectedStatus === 'Make-up' ? 'Make-up Reason' : 'Leave Reason'}
                </div>
            </div>
            {selectedStatus === 'Make-up' && (
                <div className="mb-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Original Class Date
                    </label>
                    <input 
                        type="date"
                        className="w-full text-xs font-bold text-slate-700 p-2 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        value={makeupDate}
                        onChange={(e) => setMakeupDate(e.target.value)}
                        autoFocus
                    />
                </div>
            )}
            <textarea 
                className="w-full text-sm font-medium text-slate-700 p-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 resize-none mb-3 placeholder:text-slate-400"
                placeholder={selectedStatus === 'Make-up' ? "Add a note (optional)..." : "Enter reason for leave..."}
                rows={selectedStatus === 'Make-up' ? 2 : 3}
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveLeaveNote();
                } else if (e.key === 'Escape') {
                    cancelLeaveNote();
                }
                }}
            />
            <div className="flex justify-end gap-2">
                <button 
                onClick={cancelLeaveNote} 
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                <X size={14} /> Cancel
                </button>
                <button 
                onClick={saveLeaveNote} 
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-1.5"
                >
                <Check size={14} strokeWidth={2.5} /> Save Note
                </button>
            </div>
            </div>
        </>
      )}
    </div>
  );
}
