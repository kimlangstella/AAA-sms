"use client";

import { useState, useRef, useEffect } from "react";
import { AttendanceStatus, Attendance } from "@/lib/types";
import { Check, X } from "lucide-react";

interface AttendanceCellProps {
  record?: Attendance;
  onChange: (status: AttendanceStatus, reason?: string) => void;
  readOnly?: boolean;
}

export function AttendanceCell({ record, onChange, readOnly }: AttendanceCellProps) {
  // Input value state
  const [value, setValue] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [hasPendingChange, setHasPendingChange] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<AttendanceStatus | null>(null);
  const [pendingReason, setPendingReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Make-up Note State
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  // Initialize value from record
  useEffect(() => {
    let initialValue = "";
    if (record) {
      if (record.status === 'Present') initialValue = record.reason?.includes("Make up") ? "M" : "P";
      else if (record.status === 'Absent') initialValue = "A";
      else if (record.status === 'Permission') initialValue = "L"; 
    }
    setValue(initialValue);
    setOriginalValue(initialValue);
    setHasPendingChange(false);
  }, [record]);

  const handleBlur = () => {
    if (showNotePopup) return; // Don't process if popup is active

    const raw = value.trim().toUpperCase();
    
    // Check for Make Up trigger
    if (raw.startsWith("M") || raw === "MAKEUP") {
        setShowNotePopup(true);
        setNoteValue(record?.reason?.replace("Make up: ", "") || "");
        return;
    }

    let status: AttendanceStatus | null = null;
    let reason = "";

    if (raw.startsWith("P") || raw === "PRESENT") {
        status = "Present";
    } else if (raw.startsWith("A") || raw === "ABSENT") {
        status = "Absent";
    } else if (raw.startsWith("L") || raw === "LEAVE" || raw === "PERMISSION") {
        status = "Permission";
    }

    if (status) {
        // Check if this is different from current record
        const isDifferent = record?.status !== status || (reason && record?.reason !== reason);
        
        if (isDifferent) {
            // Set pending change instead of saving immediately
            setPendingStatus(status);
            setPendingReason(reason);
            setHasPendingChange(true);
            
            // Update display value
            if (status === 'Present') setValue("P");
            else if (status === 'Absent') setValue("A");
            else if (status === 'Permission') setValue("L");
        }
    } else {
        // Revert to current state if invalid
        setValue(originalValue);
    }
  };

  const handleSave = () => {
    if (pendingStatus) {
        onChange(pendingStatus, pendingReason);
        setOriginalValue(value);
        setHasPendingChange(false);
        setPendingStatus(null);
        setPendingReason("");
    }
  };

  const handleCancel = () => {
    setValue(originalValue);
    setHasPendingChange(false);
    setPendingStatus(null);
    setPendingReason("");
  };

  const saveMakeUp = () => {
      const finalReason = `Make up: ${noteValue}`;
      onChange('Present', finalReason);
      setValue("M");
      setOriginalValue("M");
      setShowNotePopup(false);
  };

  const cancelMakeUp = () => {
      setShowNotePopup(false);
      setValue(originalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          inputRef.current?.blur();
      } else if (e.key === 'Escape') {
          handleCancel();
          inputRef.current?.blur();
      }
  }

  // Determine styling based on current VALUE (optimistic UI)
  const getStyle = () => {
      const v = value.trim().toUpperCase();
      if (v.startsWith("P")) return "bg-emerald-100 text-emerald-700 border-emerald-300";
      if (v.startsWith("A")) return "bg-rose-100 text-rose-700 border-rose-300";
      if (v.startsWith("L")) return "bg-amber-100 text-amber-700 border-amber-300";
      if (v.startsWith("M")) return "bg-blue-100 text-blue-700 border-blue-300";
      return "bg-white border-slate-200 text-slate-900";
  }

  return (
    <div className="flex justify-center relative group">
        <div className="relative">
            <input 
                ref={inputRef}
                className={`w-10 h-10 text-center uppercase font-bold text-sm rounded-lg border-2 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all ${getStyle()} ${hasPendingChange ? 'ring-2 ring-amber-400' : ''}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                maxLength={6} 
                placeholder="-"
            />
            
            {/* Show tiny indicator if reason exists */}
            {record?.reason && !showNotePopup && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white z-10" title={record.reason} />
            )}
        </div>

        {/* Save/Cancel Buttons for Pending Changes */}
        {hasPendingChange && !showNotePopup && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-white p-2 rounded-xl shadow-xl border border-slate-200 flex gap-2 animate-in zoom-in-95 duration-200">
                <button 
                    onClick={handleCancel} 
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                    <X size={14} /> Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
                >
                    <Check size={14} /> Save
                </button>
            </div>
        )}

        {/* Note Popup for Make-up */}
        {showNotePopup && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-white p-3 rounded-xl shadow-xl border border-slate-100 w-64 animate-in zoom-in-95 duration-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Make-up Class Note</div>
                <textarea 
                    autoFocus
                    className="w-full text-xs font-medium text-slate-700 p-2 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 resize-none mb-2"
                    placeholder="E.g. Recovering class 12/05..."
                    rows={2}
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveMakeUp();
                        }
                    }}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={cancelMakeUp} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={14} />
                    </button>
                    <button onClick={saveMakeUp} className="px-3 py-1 rounded-md bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 flex items-center gap-1">
                        <Check size={12} /> Save
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
