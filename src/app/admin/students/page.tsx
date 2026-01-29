"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UserPlus, Plus, Search, Filter, Loader2, Upload, X, Pencil, Trash2, Eye, ChevronDown, Book, Settings2, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, AlertCircle, Users, CheckCircle2, ChevronRight, ShieldCheck, Calendar, CreditCard, Wallet, ChevronsRight, Check } from "lucide-react";
import { Student, Branch, Class } from "@/lib/types";
import { getStudents, addStudent, updateStudent, deleteStudent, uploadImage, subscribeToStudents, subscribeToClasses, addEnrollment } from "@/lib/services/schoolService";
import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";
import { AddInsuranceModal } from "@/components/modals/AddInsuranceModal";

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();


  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Edit State
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState(""); // For legacy/list filter if needed, or re-use

  const [classes, setClasses] = useState<Class[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  // Insurance Modal State
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  
  // Advanced Features State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student | 'branch_name'; direction: 'asc' | 'desc' } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['action', 'name', 'gender', 'nationality', 'dob', 'phone', 'branch']);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  
  // Controlled State for Student Profile (Step 1)
  const [studentForm, setStudentForm] = useState({
      first_name: "",
      last_name: "",
      gender: "",
      dob: "",
      pob: "",
      nationality: "Cambodian",
      phone: "",
      email: "",
      mother_name: "",
      address: "",
      parent_phone: "",
      status: "Active",
      admission_date: new Date().toISOString().split('T')[0]
  });

  // Controlled State for Enrollment (Step 2 & 3)
  const [enrollmentData, setEnrollmentData] = useState({
      branchId: "",
      programId: "",
      classId: "",
      start_session: 1,
      total_amount: "", // string to allow empty
      discount: "",
      paid_amount: "",
      payment_type: "Cash",
      payment_expired: ""
  });

  // Real-time Subscriptions
  useEffect(() => {
    const unsubStudents = subscribeToStudents((data) => {
        setStudents(data);
        setLoading(false);
    });
    const unsubClasses = subscribeToClasses(setClasses);
    const unsubBranches = branchService.subscribe(setBranches);
    const unsubPrograms = programService.subscribe(setPrograms);
    
    return () => {
        unsubStudents();
        unsubClasses();
        unsubBranches();
        unsubPrograms();
    };
  }, []);

  // Filter Classes for Step 2
  const availableClasses = useMemo(() => {
      return classes.filter(c => 
          (!enrollmentData.branchId || c.branchId === enrollmentData.branchId) &&
          (!enrollmentData.programId || c.programId === enrollmentData.programId)
      );
  }, [classes, enrollmentData.branchId, enrollmentData.programId]);

  // Auto-open form
  useEffect(() => {
    if (searchParams.get('action') === 'add' && !showForm) {
      openAdd();
    }
  }, [searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const openAdd = () => {
      setEditStudent(null);
      setImageFile(null);
      setImagePreview(null);
      // Reset State
      setCurrentStep(1);
      setStudentForm({
          first_name: "", last_name: "", gender: "", dob: "", pob: "", nationality: "Cambodian",
          phone: "", email: "", mother_name: "", address: "", parent_phone: "", status: "Active",
          admission_date: new Date().toISOString().split('T')[0]
      });
      setEnrollmentData({
        branchId: "", programId: "", classId: "", start_session: 1, 
        total_amount: "", discount: "", paid_amount: "", payment_type: 'Cash', payment_expired: ""
      });
      setShowForm(true);
      setShowSuccessModal(false);
  }

  const openEdit = (student: Student) => {
      setEditStudent(student);
      setImagePreview(student.image_url || null);
      setImageFile(null); 
      setCurrentStep(1);
      // Populate Form
      setStudentForm({
          first_name: student.first_name || "",
          last_name: student.last_name || "",
          gender: student.gender || "",
          dob: student.dob || "",
          pob: student.pob || "",
          nationality: student.nationality || "Cambodian",
          phone: student.phone || "",
          email: student.email || "",
          mother_name: student.mother_name || "",
          address: student.address || "",
          parent_phone: student.parent_phone || "",
          status: student.status || "Active",
          admission_date: student.admission_date || new Date().toISOString().split('T')[0]
      });
      // Existing students might have enrollment? For now, we only edit Profile in this wizard context conceptually
      // We will set branchId for context if available
      setEnrollmentData(prev => ({...prev, branchId: student.branch_id || ""}));

      setShowForm(true);
      setShowSuccessModal(false);
  }

  const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this student?")) return;
      try {
          await deleteStudent(id);
      } catch (error) {
          console.error(error);
          alert("Failed to delete");
      }
  }

  const handleStudentChange = (e: any) => {
      setStudentForm(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleEnrollmentChange = (e: any) => {
    setEnrollmentData(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleNext = () => {
      if (currentStep === 1) {
          // Validate Step 1
          if (!studentForm.first_name || !studentForm.last_name || !studentForm.gender || !studentForm.dob) {
              alert("Please fill in all required fields (Name, Gender, DOB).");
              return;
          }
          setCurrentStep(2);
      } else if (currentStep === 2) {
          // Validate Step 2
          if (!enrollmentData.classId) {
              alert("Please select a class to enroll.");
              return;
          }
          setCurrentStep(3);
      }
  };

  const handleBack = () => {
      setCurrentStep(prev => prev - 1);
  };

  async function handleWizardSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSubmitting(true);
      try {
            // 1. Upload Image
            let imageUrl = editStudent?.image_url || "";
            if (imageFile) {
                imageUrl = await uploadImage(imageFile, `students/${Date.now()}_${imageFile.name}`);
            }

            // 2. Prepare Student Data
            const studentData: any = {
                ...studentForm,
                student_name: `${studentForm.first_name} ${studentForm.last_name}`.trim(),
                student_code: editStudent?.student_code || `STU-${Date.now().toString().slice(-6)}`,
                age: new Date().getFullYear() - new Date(studentForm.dob).getFullYear(),
                branch_id: enrollmentData.branchId, // Link to selected branch
                image_url: imageUrl,
            };

            let studentId = "";

            if (editStudent) {
                await updateStudent(editStudent.student_id, studentData);
                studentId = editStudent.student_id;
            } else {
                studentData.created_at = new Date().toISOString();
                const ref = await addStudent(studentData);
                studentId = ref.id;
            }

            // 3. Create Enrollment (Rule: Always create enrollment for New Admission)
            // If editing, maybe we don't want to re-enroll? 
            // The prompt "after we create student next step is enrollment" implies New Admission flow.
            // If editing existing student, usually we skip enrollment or handle in separate tab.
            // But let's support it if classId is picked.
            if (enrollmentData.classId) {
                await addEnrollment({
                    class_id: enrollmentData.classId,
                    student_id: studentId,
                    start_session: Number(enrollmentData.start_session),
                    total_amount: Number(enrollmentData.total_amount) || 0,
                    discount: Number(enrollmentData.discount) || 0,
                    paid_amount: Number(enrollmentData.paid_amount) || 0,
                    payment_status: (Number(enrollmentData.paid_amount) >= (Number(enrollmentData.total_amount) - Number(enrollmentData.discount))) && Number(enrollmentData.total_amount) > 0 ? 'Paid' : 'Unpaid',
                    payment_type: enrollmentData.payment_type,
                    payment_expired: enrollmentData.payment_expired,
                    payment_date: new Date().toISOString()
                });
            }

            setShowForm(false);
            setCreatedStudentId(studentId);

      } catch (error) {
          console.error(error);
          alert("Failed to submit.");
      } finally {
          setSubmitting(false);
      }
  }

  const getBranchName = (branchId: string) => {
      return branches.find(b => b.branch_id === branchId)?.branch_name || "Unknown Branch";
  };

  const filteredStudents = useMemo(() => {
     const enriched = students.map(s => ({
         ...s,
         branch_name: branches.find(b => b.branch_id === s.branch_id)?.branch_name || ""
     }));

     if (!searchQuery) return enriched;
     
     const query = searchQuery.toLowerCase();
     return enriched.filter(s => 
        (s.student_name && s.student_name.toLowerCase().includes(query)) ||
        (s.student_code && s.student_code.toLowerCase().includes(query)) ||
        (s.phone && s.phone.toLowerCase().includes(query)) ||
        (s.nationality && s.nationality.toLowerCase().includes(query)) ||
        (s.dob && s.dob.toLowerCase().includes(query)) ||
        (s.branch_name && s.branch_name.toLowerCase().includes(query))
     );
  }, [students, branches, searchQuery]);


  const toggleSort = (key: keyof Student | 'branch_name') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: keyof Student | 'branch_name') => {
      if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="opacity-30" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const columns = [
      { id: 'action', label: 'Action' },
      { id: 'name', label: 'Name', sortKey: 'student_name' },
      { id: 'gender', label: 'Gender', sortKey: 'gender' },
      { id: 'status', label: 'Status', sortKey: 'status' },
      { id: 'nationality', label: 'Nationality', sortKey: 'nationality' },
      { id: 'dob', label: 'Date of Birth', sortKey: 'dob' },
      { id: 'phone', label: 'Phone', sortKey: 'phone' },
      { id: 'branch', label: 'Branch', sortKey: 'branch_name' },
  ];

    return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass p-3 px-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Users size={16} />
            </div>
            <h1 className="text-lg font-bold text-slate-800">Students </h1>
        </div>
        <div className="flex gap-3">
        <div className="flex gap-3">
             <button 
                onClick={openAdd} 
                disabled={branches.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
                <UserPlus size={16} />
                <span>Admission</span>
            </button>
        </div>
        </div>
      </div>

       {/* SUCCESS MODAL */}
       {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={40} />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black text-slate-900">Admission Complete!</h3>
                      <p className="text-slate-500 font-medium mt-2">The student profile has been created successfully.</p>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                       <button 
                         onClick={() => router.push(`/admin/enrollments`)}
                         className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                       >
                          <span>Enroll in Class Now</span>
                          <ChevronRight size={16} />
                       </button>
                       <button 
                         onClick={() => setShowSuccessModal(false)}
                         className="w-full py-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                       >
                          Create Another / Close
                       </button>
                  </div>
             </div>
        </div>
      )}

      {/* INSURANCE MODAL */}
      <AddInsuranceModal 
        isOpen={showInsuranceModal} 
        onClose={() => setShowInsuranceModal(false)}
        studentId={selectedStudentId}
        onSuccess={() => {
            alert("Insurance added successfully!");
            // Optionally refresh students data if needed
        }} 
      />


      {showForm ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white w-full rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
                {/* WIZARD HEADER */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                             <UserPlus size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {editStudent ? "Edit Student Profile" : "New Admission"}
                            </h2>
                            <p className="text-xs font-bold text-slate-400">Step {currentStep} of 3</p>
                        </div>
                    </div>
                    {/* STEP INDICATOR */}
                    <div className="hidden md:flex items-center gap-2">
                         {[1, 2, 3].map(step => (
                             <div key={step} className={`h-2 rounded-full transition-all duration-300 ${step <= currentStep ? 'w-12 bg-indigo-500' : 'w-4 bg-slate-200'}`} />
                         ))}
                    </div>
                    <button 
                        onClick={() => setShowForm(false)} 
                        className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 bg-white min-h-[500px]">
                    <form onSubmit={handleWizardSubmit} className="space-y-8">
                        
                        {/* STEP 1: STUDENT PROFILE */}
                        <div style={{ display: currentStep === 1 ? 'block' : 'none' }} className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
                                {/* Photo Upload Section */}
                                <div className="flex justify-center border-b border-slate-100 pb-8">
                                     <div className="flex flex-col items-center gap-4">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/30 shadow-inner">
                                                {imagePreview || editStudent?.image_url ? (
                                                    <img src={imagePreview || editStudent?.image_url!} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                ) : (
                                                    <Upload className="text-slate-300 group-hover:text-indigo-400 transition-colors" size={24} />
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleImageChange}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                                />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 text-center mt-2 uppercase tracking-wider">Photo</p>
                                        </div>
                                     </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InputField name="first_name" label="First Name" required value={studentForm.first_name} onChange={handleStudentChange} />
                                    <InputField name="last_name" label="Last Name" required value={studentForm.last_name} onChange={handleStudentChange} />
                                    <SelectField name="gender" label="Gender" required value={studentForm.gender} onChange={handleStudentChange}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </SelectField>

                                    <InputField name="dob" type="date" label="Date of Birth" required value={studentForm.dob} onChange={handleStudentChange} />
                                    <InputField name="phone" label="Phone" required value={studentForm.phone} onChange={handleStudentChange} />
                                    
                                    <SelectField name="nationality" label="Nationality" required value={studentForm.nationality} onChange={handleStudentChange}>
                                        <option value="Cambodian">Cambodian</option>
                                        <option value="Other">Other</option>
                                    </SelectField>

                                    <SelectField name="status" label="Status" required value={studentForm.status} onChange={handleStudentChange}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Hold">Hold</option>
                                    </SelectField>

                                    <InputField name="address" label="Address" value={studentForm.address} onChange={handleStudentChange} />
                                    <InputField name="parent_phone" label="Parent's Contact" value={studentForm.parent_phone} onChange={handleStudentChange} />
                                </div>
                        </div>

                        {/* STEP 2: CLASS ENROLLMENT */}
                        {currentStep === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-6">
                                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                        <Book size={18} className="text-indigo-600" />
                                        Academic Details
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SelectField 
                                            label="Select Branch" 
                                            required 
                                            value={enrollmentData.branchId} 
                                            onChange={(e: any) => setEnrollmentData({...enrollmentData, branchId: e.target.value, classId: ""})}
                                        >
                                            <option value="">Choose Branch...</option>
                                            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                                        </SelectField>

                                        <SelectField 
                                            label="Select Program" 
                                            value={enrollmentData.programId} 
                                            onChange={(e: any) => setEnrollmentData({...enrollmentData, programId: e.target.value, classId: ""})}
                                        >
                                            <option value="">All Programs</option>
                                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </SelectField>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-wide">Select Class to Enroll</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                                            {availableClasses.length === 0 ? (
                                                <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold bg-white rounded-xl border border-dashed border-slate-200">
                                                    No classes found for selection (Select Branch first)
                                                </div>
                                            ) : availableClasses.map(cls => (
                                                <div 
                                                    key={cls.class_id}
                                                    onClick={() => setEnrollmentData({...enrollmentData, classId: cls.class_id!})}
                                                    className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center justify-between group ${enrollmentData.classId === cls.class_id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-200'}`}
                                                >
                                                    <div>
                                                        <p className={`text-xs font-bold ${enrollmentData.classId === cls.class_id ? 'text-indigo-700' : 'text-slate-700'}`}>{cls.className}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{cls.days} • {cls.startTime}</p>
                                                    </div>
                                                    {enrollmentData.classId === cls.class_id && <CheckCircle2 size={16} className="text-indigo-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {enrollmentData.classId && (
                                        <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                                            <InputField 
                                                label="Start Session" 
                                                type="number" 
                                                value={enrollmentData.start_session}
                                                onChange={(e: any) => setEnrollmentData({...enrollmentData, start_session: e.target.value})}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PAYMENT */}
                        {currentStep === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                                <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-6">
                                    <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                                        <Wallet size={18} className="text-amber-600" />
                                        Tuition Payment
                                    </h3>

                                    <div className="grid grid-cols-2 gap-6">
                                        <InputField 
                                            label="Total Amount ($)" 
                                            type="number" 
                                            value={enrollmentData.total_amount}
                                            onChange={(e: any) => setEnrollmentData({...enrollmentData, total_amount: e.target.value})}
                                        />
                                        <InputField 
                                            label="Discount ($)" 
                                            type="number" 
                                            value={enrollmentData.discount}
                                            onChange={(e: any) => setEnrollmentData({...enrollmentData, discount: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <InputField 
                                            label="Paid Amount ($)" 
                                            type="number" 
                                            value={enrollmentData.paid_amount}
                                            onChange={(e: any) => setEnrollmentData({...enrollmentData, paid_amount: e.target.value})}
                                        />
                                        <SelectField 
                                            label="Payment Type" 
                                            value={enrollmentData.payment_type}
                                            onChange={(e: any) => setEnrollmentData({...enrollmentData, payment_type: e.target.value})}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="ABA">ABA PayWay</option>
                                            <option value="Bank">Bank Transfer</option>
                                        </SelectField>
                                    </div>
                                    <InputField 
                                        label="Next Payment Due" 
                                        type="date" 
                                        value={enrollmentData.payment_expired}
                                        onChange={(e: any) => setEnrollmentData({...enrollmentData, payment_expired: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                            {currentStep === 1 ? (
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="px-6 py-3 rounded-xl text-indigo-600 font-bold text-xs hover:bg-indigo-50 border border-indigo-100 transition-all flex items-center gap-2 disabled:opacity-70"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    <span>Save Student Only</span>
                                </button>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={handleBack}
                                    className="px-6 py-3 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <ArrowUpDown className="rotate-90" size={14} /> Back
                                </button>
                            )}

                            <div className="flex gap-4">
                                {currentStep < 3 ? (
                                    <button 
                                        type="button" 
                                        onClick={handleNext}
                                        disabled={submitting}
                                        className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-70"
                                    >
                                        <span>{currentStep === 1 ? 'Proceed to Enrollment' : 'Next Step'}</span>
                                        <ChevronsRight size={16} />
                                    </button>
                                ) : (
                                    <button 
                                        type="submit"
                                        disabled={submitting} 
                                        className="px-10 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all flex items-center gap-2 disabled:opacity-70"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        <span>Confirm Admission</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden shadow-sm animate-in fade-in duration-500">
            {/* SEARCH & FILTERS */}
            {/* <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-center bg-slate-50/20">
                <div className="flex items-center w-full max-w-sm px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500 transition-all">
                    <Search size={14} className="text-slate-400" />
                    <div className="w-px h-3 mx-2 bg-slate-200" />
                    <input 
                        placeholder="Search..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 p-0" 
                    />
                </div>
                <div className="relative">
                    <button onClick={() => setShowColumnSettings(!showColumnSettings)} className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-all text-xs font-bold shadow-sm">
                        <Settings2 size={14} />
                        <span>Columns</span>
                    </button>
                    {showColumnSettings && (
                        <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-6 animate-in fade-in zoom-in-95 duration-200">
                             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Customize View</h3>
                             <div className="space-y-1">
                                {columns.map(col => (
                                    <label key={col.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                                        <input 
                                            type="checkbox" 
                                            checked={visibleColumns.includes(col.id)} 
                                            onChange={() => setVisibleColumns(prev => prev.includes(col.id) ? prev.filter(i => i !== col.id) : [...prev, col.id])}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                                        />
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{col.label}</span>
                                    </label>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </div> */}

            {loading ? (
                <div className="p-32 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>
            ) : (
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                {columns.filter(c => visibleColumns.includes(c.id)).map(col => (
                                    <th 
                                        key={col.id} 
                                        className={`px-8 py-5 font-bold whitespace-nowrap ${col.sortKey ? 'cursor-pointer hover:bg-slate-100/50 transition-colors' : ''}`}
                                        onClick={() => col.sortKey && toggleSort(col.sortKey as any)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{col.label}</span>
                                            {col.sortKey && renderSortIcon(col.sortKey as any)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map(s => (
                                <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors group">
                                    {visibleColumns.includes('action') && (
                                        <td className="px-8 py-4">
                                            <div className="flex gap-2 transition-opacity">
                                                <button onClick={() => openEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                                                    <Pencil size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStudentId(s.student_id);
                                                        setShowInsuranceModal(true);
                                                    }} 
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                    title="Add Insurance"
                                                >
                                                    <ShieldCheck size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(s.student_id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('name') && (
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs flex-shrink-0 overflow-hidden">
                                                    {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : s.student_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{s.student_name}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 tracking-wider">REF: {s.student_code}</div>
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('gender') && (
                                        <td className="px-8 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-bold w-12 inline-block text-center border ${
                                                s.gender === 'Female' ? 'bg-pink-50 text-pink-600 border-pink-100/50' : 'bg-blue-50 text-blue-600 border-blue-100/50'
                                            }`}>
                                                {s.gender}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('status') && (
                                        <td className="px-8 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-bold inline-block text-center border ${
                                                s.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 
                                                s.status === 'Hold' ? 'bg-amber-50 text-amber-600 border-amber-100/50' :
                                                'bg-slate-50 text-slate-600 border-slate-100/50'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('nationality') && <td className="px-8 py-4 text-slate-600">{s.nationality}</td>}
                                    {visibleColumns.includes('dob') && <td className="px-8 py-4 text-slate-600">{s.dob}</td>}
                                    {visibleColumns.includes('phone') && <td className="px-8 py-4 text-slate-500 font-medium">{s.phone}</td>}
                                    {visibleColumns.includes('branch') && (
                                        <td className="px-8 py-4">
                                            <div className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-500 inline-block">
                                                {s.branch_name}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

function InputField({ label, name, type = "text", required = false, defaultValue, placeholder, value, onChange, disabled }: any) {
    return (
        <div className="space-y-2 group">
            <label className="block text-[10px] font-bold text-slate-400 ml-1 group-focus-within:text-indigo-600 transition-colors">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <input 
                name={name} 
                type={type} 
                required={required}
                defaultValue={defaultValue}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600/20 outline-none transition-all placeholder:text-slate-300 font-bold text-sm shadow-sm"
            />
        </div>
    )
}

function SelectField({ label, name, children, defaultValue, required = false, value, onChange, disabled }: any) {
    return (
        <div className="space-y-2 group">
            <label className="block text-[10px] font-bold text-slate-400 ml-1 group-focus-within:text-indigo-600 transition-colors">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
                <select 
                    name={name}
                    required={required}
                    value={value}
                    defaultValue={defaultValue}
                    onChange={onChange}
                    disabled={disabled}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600/20 outline-none transition-all font-bold text-sm shadow-sm appearance-none cursor-pointer disabled:opacity-50"
                >
                    {children}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={18} />
                </div>
            </div>
        </div>
    )
}
