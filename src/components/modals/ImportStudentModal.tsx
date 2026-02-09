"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Search, Download, Edit2, Check, AlertTriangle, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Student, Branch, Gender, StudentStatus, Program, Class, Term } from "@/lib/types";
import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";
import { termService } from "@/services/termService";
import { addStudent, getClasses, addEnrollment } from "@/lib/services/schoolService";

interface ImportStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedStudent {
    student_name: string;
    first_name: string;
    last_name: string;
    gender: Gender;
    dob: string;
    pob: string;
    nationality: string;
    phone: string;
    parent_phone: string;
    branch_name: string;
    branch_id?: string;
    program_name: string;
    program_id?: string;
    class_name: string;
    class_id?: string;
    address: string;
    status: StudentStatus;
    father_name: string;
    mother_name: string;
    isValid: boolean;
    errors: string[];
}

type ImportStep = 'upload' | 'preview' | 'confirm' | 'importing' | 'summary';

export default function ImportStudentModal({ isOpen, onClose, onSuccess }: ImportStudentModalProps) {
    const [step, setStep] = useState<ImportStep>('upload');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState({ success: 0, failed: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editing state
    const [editingCell, setEditingCell] = useState<{ index: number; field: keyof ParsedStudent } | null>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        
        if (isOpen) {
            branchService.getAll().then(setBranches);
            programService.getAll().then(setPrograms);
            getClasses().then(setClasses);
            termService.subscribe(setTerms);
        } else {
            // Reset state when closing
            setStep('upload');
            setParsedData([]);
            setResults({ success: 0, failed: 0 });
            setEditingCell(null);
        }

        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let file: File | undefined;
        if ('files' in e.target && e.target.files) {
            file = e.target.files[0];
        } else if ('dataTransfer' in e && e.dataTransfer.files) {
            file = e.dataTransfer.files[0];
        }

        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            
            processImportData(data);
        };
        reader.readAsBinaryString(file);
    };

    const validateStudent = (student: Partial<ParsedStudent>) => {
        const errors: string[] = [];
        if (!student.student_name && (!student.first_name || !student.last_name)) errors.push('Name is required');
        if (!student.branch_name) errors.push('Branch is required');
        
        // Check if branch exists
        const branch = branches.find(b => b.branch_name.toLowerCase() === student.branch_name?.toLowerCase());
        if (student.branch_name && !branch) {
            errors.push(`Branch "${student.branch_name}" not found`);
        } else if (branch) {
            student.branch_id = branch.branch_id;
        }

        // Program Validation
        if (student.program_name) {
            const program = programs.find(p => p.name.toLowerCase() === student.program_name?.toLowerCase() && (!branch || p.branchId === branch.branch_id));
            if (!program) {
                errors.push(`Program "${student.program_name}" not found in this branch`);
                student.program_id = undefined;
            } else {
                student.program_id = program.id;
                
                // Class Validation within Branch & Program
                if (student.class_name) {
                    const cls = classes.find(c => 
                        c.className.toLowerCase() === student.class_name?.toLowerCase() &&
                        c.branchId === branch?.branch_id &&
                        c.programId === program.id
                    );
                    if (!cls) {
                        errors.push(`Class "${student.class_name}" not found in this Branch/Program`);
                        student.class_id = undefined;
                    } else {
                        student.class_id = cls.class_id;
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    const processImportData = (data: any[]) => {
        const processed = data.map((row: any) => {
            const name = (row['Name'] || row['student_name'] || '').toString().trim();
            const firstName = (row['First Name'] || row['first_name'] || '').toString().trim();
            const lastName = (row['Last Name'] || row['last_name'] || '').toString().trim();
            const branchName = (row['Branch'] || row['branch_name'] || '').toString().trim();
            const programName = (row['Program'] || row['program_name'] || '').toString().trim();
            const className = (row['Class'] || row['class_name'] || '').toString().trim();
            
            // Gender mapping
            let gender: Gender = 'Male';
            const genderInput = (row['Gender'] || row['gender'] || '').toString().toLowerCase();
            if (genderInput.startsWith('f')) gender = 'Female';

            const student: ParsedStudent = {
                student_name: name || `${firstName} ${lastName}`.trim(),
                first_name: firstName || name.split(' ')[0] || '',
                last_name: lastName || name.split(' ').slice(1).join(' ') || '',
                gender,
                dob: (row['DOB'] || row['dob'] || '').toString(),
                pob: (row['POB'] || row['pob'] || row['Place of Birth'] || '').toString(),
                nationality: (row['Nationality'] || row['nationality'] || 'Cambodian').toString(),
                phone: (row['Phone'] || row['phone'] || '').toString(),
                parent_phone: (row['Parent Phone'] || row['parent_phone'] || '').toString(),
                branch_name: branchName,
                program_name: programName,
                class_name: className,
                address: (row['Address'] || row['address'] || '').toString(),
                status: 'Active' as StudentStatus,
                father_name: (row['Father Name'] || row['father_name'] || '').toString(),
                mother_name: (row['Mother Name'] || row['mother_name'] || '').toString(),
                isValid: false,
                errors: []
            };

            const validation = validateStudent(student);
            student.isValid = validation.isValid;
            student.errors = validation.errors;

            return student;
        });

        setParsedData(processed);
        setStep('preview');
    };

    const handleEditCell = (index: number, field: keyof ParsedStudent, value: any) => {
        const newData = [...parsedData];
        let student = { ...newData[index], [field]: value };
        
        // Reset dependent fields if parent field changes
        if (field === 'branch_name') {
            const branch = branches.find(b => b.branch_name === value);
            student.branch_id = branch?.branch_id;
            student.program_name = '';
            student.program_id = undefined;
            student.class_name = '';
            student.class_id = undefined;
        } else if (field === 'program_name') {
            const program = programs.find(p => p.name === value && p.branchId === student.branch_id);
            student.program_id = program?.id;
            student.class_name = '';
            student.class_id = undefined;
        } else if (field === 'class_name') {
            const cls = classes.find(c => c.className === value && c.branchId === student.branch_id && c.programId === student.program_id);
            student.class_id = cls?.class_id;
        }

        // Re-validate
        const validation = validateStudent(student);
        student.isValid = validation.isValid;
        student.errors = validation.errors;
        
        newData[index] = student;
        setParsedData(newData);
    };

    const handleDeleteRow = (index: number) => {
        const newData = [...parsedData];
        newData.splice(index, 1);
        setParsedData(newData);
    };

    const handleImport = async () => {
        setStep('importing');
        setImportProgress({ current: 0, total: parsedData.length });
        
        let successCount = 0;
        let failedCount = 0;

        for (const item of parsedData) {
            try {
                const branchId = item.branch_id || branches.find(b => b.branch_name.toLowerCase() === item.branch_name.toLowerCase())?.branch_id;
                if (!branchId) throw new Error(`Branch "${item.branch_name}" not found`);

                // Create Student
                const studentCode = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
                const newStudent = await addStudent({
                    student_code: studentCode,
                    student_name: item.student_name,
                    first_name: item.first_name,
                    last_name: item.last_name,
                    gender: item.gender,
                    dob: item.dob,
                    pob: item.pob,
                    nationality: item.nationality,
                    branch_id: branchId,
                    address: item.address,
                    phone: item.phone,
                    parent_phone: item.parent_phone,
                    father_name: item.father_name,
                    mother_name: item.mother_name,
                    status: 'Active',
                    admission_date: new Date().toISOString().split('T')[0],
                    age: calculateAge(item.dob)
                }) as any;

                // Handle Enrollment if Program and Class are specified
                if (item.program_id && item.class_id) {
                    const program = programs.find(p => p.id === item.program_id);
                    const activeTerm = terms.find(t => t.status === 'Active' && t.branch_id === branchId) || terms[0];

                    if (activeTerm) {
                        await addEnrollment({
                            student_id: newStudent.id,
                            class_id: item.class_id,
                            term_id: activeTerm.term_id,
                            term: activeTerm.term_name,
                            total_amount: program?.price || 0,
                            discount: 0,
                            paid_amount: 0,
                            payment_status: 'Unpaid',
                            payment_type: 'Cash',
                            enrollment_status: 'Active',
                            start_session: 1,
                            enrolled_at: new Date().toISOString()
                        });
                    }
                }

                successCount++;
            } catch (err) {
                console.error("Import failed for student:", item.student_name, err);
                failedCount++;
            }
            setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setResults({ success: successCount, failed: failedCount });
        setStep('summary');
        onSuccess();
    };

    const calculateAge = (dob: string) => {
        if (!dob) return 0;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const downloadTemplate = () => {
        const template = [
            {
                'Name': 'John Doe',
                'Gender': 'Male',
                'DOB': '2015-05-15',
                'POB': 'Phnom Penh',
                'Branch': branches[0]?.branch_name || 'Main Branch',
                'Program': programs[0]?.name || 'English for Kids',
                'Class': classes.find(c => c.branchId === branches[0]?.branch_id)?.className || 'Room 101',
                'Phone': '012345678',
                'Parent Phone': '098765432',
                'Nationality': 'Cambodian',
                'Address': 'Phnom Penh',
                'Father Name': 'Doe Senior',
                'Mother Name': 'Jane Doe'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, "student_import_template.xlsx");
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className={`bg-white rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500 ${step === 'preview' ? 'w-[98%] max-w-[90rem]' : 'w-full max-w-2xl'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Import Students</h2>
                            <p className="text-sm text-slate-500 font-bold">Standardize your data via Excel/CSV</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div 
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative border-4 border-dashed rounded-[2rem] p-16 text-center transition-all cursor-pointer ${
                                    isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50'
                                }`}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileUpload} 
                                />
                                <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto mb-6">
                                    <FileText size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">Click or Drag to Upload</h3>
                                <p className="text-slate-500 font-bold max-w-sm mx-auto">
                                    Support Excel (.xlsx, .xls) and CSV files. Make sure your columns match our system.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                        <Download size={18} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-600">Need a starting point?</p>
                                </div>
                                <button 
                                    onClick={downloadTemplate}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    Download Template
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-800">
                                    Preview & Edit Data <span className="text-indigo-600 ml-2">({parsedData.length} Students)</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black shadow-sm border border-emerald-100">
                                        <CheckCircle2 size={16} />
                                        <span>{parsedData.filter(d => d.isValid).length} Valid</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black shadow-sm border border-rose-100">
                                        <AlertCircle size={16} />
                                        <span>{parsedData.filter(d => !d.isValid).length} Invalid</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                                <AlertTriangle className="text-amber-600" size={20} />
                                <p className="text-xs font-bold text-amber-700">Click on any cell to edit. Ensure Branch and Program match for correct enrollment.</p>
                            </div>

                            <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm max-h-[500px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Gender</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">DOB</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Branch</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Program</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Class</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Phone</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {parsedData.map((student, idx) => (
                                            <tr key={idx} className={`${student.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/30'} transition-all group`}>
                                                {/* Name Cell */}
                                                <td className="p-4 min-w-[180px]">
                                                    <div className="flex items-center gap-2">
                                                        {student.isValid ? (
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                        ) : (
                                                            <AlertCircle className="text-rose-500 shrink-0" size={14} />
                                                        )}
                                                        {editingCell?.index === idx && editingCell?.field === 'student_name' ? (
                                                            <input 
                                                                autoFocus
                                                                className="w-full text-sm font-bold text-slate-800 bg-white border border-indigo-300 rounded px-2 py-1 outline-none"
                                                                value={student.student_name}
                                                                onChange={(e) => handleEditCell(idx, 'student_name', e.target.value)}
                                                                onBlur={() => setEditingCell(null)}
                                                            />
                                                        ) : (
                                                            <div onClick={() => setEditingCell({ index: idx, field: 'student_name' })} className="flex items-center justify-between w-full cursor-pointer hover:bg-slate-100 rounded px-2 py-1">
                                                                <span className="text-sm font-bold text-slate-700">{student.student_name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Gender Cell */}
                                                <td className="p-4">
                                                     <div onClick={() => setEditingCell({ index: idx, field: 'gender' })} className="cursor-pointer hover:bg-slate-100 rounded px-2 py-1 text-sm font-semibold text-slate-600">
                                                        {editingCell?.index === idx && editingCell?.field === 'gender' ? (
                                                            <select className="bg-white border border-indigo-300 rounded outline-none" value={student.gender} onChange={(e) => handleEditCell(idx, 'gender', e.target.value)} onBlur={() => setEditingCell(null)} autoFocus>
                                                                <option value="Male">Male</option>
                                                                <option value="Female">Female</option>
                                                            </select>
                                                        ) : student.gender}
                                                    </div>
                                                </td>

                                                {/* DOB Cell */}
                                                <td className="p-4">
                                                    {editingCell?.index === idx && editingCell?.field === 'dob' ? (
                                                        <input type="date" className="text-sm bg-white border border-indigo-300 rounded outline-none px-2 py-1" value={student.dob} onChange={(e) => handleEditCell(idx, 'dob', e.target.value)} onBlur={() => setEditingCell(null)} autoFocus />
                                                    ) : (
                                                        <div onClick={() => setEditingCell({ index: idx, field: 'dob' })} className="cursor-pointer hover:bg-slate-100 rounded px-2 py-1 text-sm font-semibold text-slate-600">
                                                            {student.dob || 'YYYY-MM-DD'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Branch Cell */}
                                                <td className="p-4">
                                                    {editingCell?.index === idx && editingCell?.field === 'branch_name' ? (
                                                        <select className="text-sm bg-white border border-indigo-300 rounded outline-none px-2 py-1" value={student.branch_name} onChange={(e) => handleEditCell(idx, 'branch_name', e.target.value)} onBlur={() => setEditingCell(null)} autoFocus>
                                                            <option value="">Select Branch</option>
                                                            {branches.map(b => <option key={b.branch_id} value={b.branch_name}>{b.branch_name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <div onClick={() => setEditingCell({ index: idx, field: 'branch_name' })} className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${branches.some(b => b.branch_name.toLowerCase() === student.branch_name.toLowerCase()) ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                                                            {student.branch_name || 'Select Branch'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Program Cell */}
                                                <td className="p-4">
                                                    {editingCell?.index === idx && editingCell?.field === 'program_name' ? (
                                                        <select className="text-sm bg-white border border-indigo-300 rounded outline-none px-2 py-1" value={student.program_name} onChange={(e) => handleEditCell(idx, 'program_name', e.target.value)} onBlur={() => setEditingCell(null)} autoFocus>
                                                            <option value="">Select Program</option>
                                                            {programs
                                                                .filter(p => !student.branch_id || p.branchId === student.branch_id)
                                                                .map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                                                            }
                                                        </select>
                                                    ) : (
                                                        <div onClick={() => setEditingCell({ index: idx, field: 'program_name' })} className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${programs.some(p => p.name.toLowerCase() === (student.program_name || '').toLowerCase() && (!student.branch_id || p.branchId === student.branch_id)) ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                                            {student.program_name || 'Optional'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Class Cell */}
                                                <td className="p-4">
                                                    {editingCell?.index === idx && editingCell?.field === 'class_name' ? (
                                                        <select className="text-sm bg-white border border-indigo-300 rounded outline-none px-2 py-1" value={student.class_name} onChange={(e) => handleEditCell(idx, 'class_name', e.target.value)} onBlur={() => setEditingCell(null)} autoFocus>
                                                            <option value="">Select Class</option>
                                                            {classes
                                                                .filter(c => 
                                                                    (!student.branch_id || c.branchId === student.branch_id) && 
                                                                    (!student.program_id || c.programId === student.program_id)
                                                                )
                                                                .map(c => <option key={c.class_id} value={c.className}>{c.className}</option>)
                                                            }
                                                        </select>
                                                    ) : (
                                                        <div onClick={() => setEditingCell({ index: idx, field: 'class_name' })} className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${classes.some(c => c.className.toLowerCase() === (student.class_name || '').toLowerCase() && (!student.branch_id || c.branchId === student.branch_id) && (!student.program_id || c.programId === student.program_id)) ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                                            {student.class_name || 'Optional'}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-4 text-sm font-semibold text-slate-600">{student.phone || '-'}</td>

                                                {/* Status Cell */}
                                                <td className="p-4">
                                                    {!student.isValid ? (
                                                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-100 whitespace-nowrap">{student.errors[0]}</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 uppercase tracking-tighter">Ready</span>
                                                    )}
                                                </td>

                                                {/* Action Cell */}
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => handleDeleteRow(idx)}
                                                        className="p-2 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-xl transition-all"
                                                        title="Delete row"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <button onClick={() => setStep('upload')} className="px-6 py-3 text-slate-400 font-bold text-sm hover:text-slate-600 flex items-center gap-2">
                                    <X size={16} /> Back to Upload
                                </button>
                                <button onClick={() => setStep('confirm')} disabled={parsedData.some(d => !d.isValid)} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
                                    <span>Process Import</span> <CheckCircle2 size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="py-8 space-y-8 animate-in fade-in zoom-in-95 duration-300 text-center">
                            <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800">Review & Confirm</h3>
                            <p className="text-slate-500 font-bold max-w-sm mx-auto">
                                You are about to import <span className="text-indigo-600">{parsedData.length} students</span>. Automatically creating enrollments for Program & Class study.
                            </p>

                            <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 space-y-4 max-w-md mx-auto">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500">Students to Import</span>
                                    <span className="text-xl font-black text-slate-800">{parsedData.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500">Scheduled Enrollments</span>
                                    <span className="text-xl font-black text-indigo-600">{parsedData.filter(d => d.program_name && d.class_name).length}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                <button onClick={() => setStep('preview')} className="py-4 bg-white border border-slate-200 text-slate-600 rounded-[1.5rem] font-black hover:border-slate-300">Back</button>
                                <button onClick={handleImport} className="py-4 bg-slate-800 text-white rounded-[1.5rem] font-black hover:bg-slate-900 shadow-xl flex items-center justify-center gap-2">
                                    <Check size={20} /> Confirm
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="py-12 text-center space-y-6">
                            <div className="relative w-32 h-32 mx-auto">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 * (1 - importProgress.current / importProgress.total)} className="text-indigo-600 transition-all duration-300" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-black text-slate-800">{Math.round((importProgress.current / importProgress.total) * 100)}%</span></div>
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Processing Import...</h3>
                            <p className="text-slate-500 font-bold mt-1">Importing {importProgress.current} of {importProgress.total} students</p>
                        </div>
                    )}

                    {step === 'summary' && (
                        <div className="py-12 text-center space-y-8">
                            <div className="w-24 h-24 rounded-[2rem] bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto"><CheckCircle2 size={48} /></div>
                            <h3 className="text-3xl font-black text-slate-800">Import Complete!</h3>
                            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100"><h4 className="text-2xl font-black text-emerald-700">{results.success}</h4><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Successful</p></div>
                                <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100"><h4 className="text-2xl font-black text-rose-700">{results.failed}</h4><p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Failed</p></div>
                            </div>
                            <button onClick={onClose} className="w-full max-w-xs py-4 bg-slate-800 text-white rounded-2xl font-black shadow-xl">Continue</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
