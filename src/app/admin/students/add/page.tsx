"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { 
  UserPlus, 
  Upload, 
  ChevronLeft, 
  ChevronDown,
  Loader2, 
  Save, 
  User,
  CreditCard,
  BookOpen,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  School,
  MapPin,
  Phone,
  Mail,
  ShieldAlert,
  Plus,
  X,
  Edit2,
  Trash2,
  Eye,
  Printer
} from "lucide-react";
import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";
import { termService } from "@/services/termService";
import { addStudent, uploadImage, getClasses, addEnrollment, subscribeToSchoolDetails } from "@/lib/services/schoolService";
import { Branch, Class, PaymentType, School as SchoolType, Term } from "@/lib/types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COUNTRIES } from "@/lib/constants";

export default function AddStudentPage() {
  const router = useRouter();
  const [school, setSchool] = useState<SchoolType | null>(null);

  useEffect(() => {
    const unsub = subscribeToSchoolDetails(setSchool);
    return () => unsub();
  }, []);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  
  // Step State
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Form Data State
  const [formData, setFormData] = useState({
      // Step 1: Student
      first_name: "",
      last_name: "",
      student_code: "",
      gender: "",
      dob: "",
      pob: "",
      nationality: "Cambodian",
      phone: "",
      email: "",
      address: "",
      
      // Step 1: Parent
      father_name: "",
      mother_name: "",
      parent_phone: "",
      
      // Step 2: Enrollment (Managed by selectedPrograms now)
      branch_id: "",
      status: "Active",
      admission_date: new Date().toISOString().split('T')[0],

      // Step 3: Payment
      payment_type: "Cash" as PaymentType,
      discount: "0",
      paid_amount: "0",
      total_amount: "0",
      payment_due_date: "", // Initialize
  });

  // Multiple Programs State
  const [selectedPrograms, setSelectedPrograms] = useState<any[]>([]);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [editingProgramIndex, setEditingProgramIndex] = useState<number | null>(null);
  
  // Temporary state for the "Add Program" sub-modal
  const [newProgramData, setNewProgramData] = useState({
      program_id: "",
      class_id: "",
      start_session: "1",
      include_next_term: false,
      admission_date: new Date().toISOString().split('T')[0]
  });

  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Duplicate Check State
  const [duplicateCheck, setDuplicateCheck] = useState<{
      isChecking: boolean;
      exists: boolean;
      message: string;
  }>({ isChecking: false, exists: false, message: "" });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const validatePhone = (phone: string) => {
      // Allow 9-10 digits, starting with 0
      // e.g. 012345678 (9) or 0123456789 (10)
      const phoneRegex = /^0\d{8,9}$/; 
      return phoneRegex.test(phone.replace(/\s/g, ''));
  };
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateStudents, setDuplicateStudents] = useState<any[]>([]);
  
  // Step 4 State
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [createdStudent, setCreatedStudent] = useState<any>(null);
  const [createdEnrollments, setCreatedEnrollments] = useState<any[]>([]);
  const invoiceRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: createdStudent ? `Invoice-${createdStudent.student_code}` : 'Invoice',
  });

  const [terms, setTerms] = useState<Term[]>([]);

  useEffect(() => {
    const unsub = branchService.subscribe(setBranches);
    const unsubTerms = termService.subscribe(setTerms);
    return () => { unsub(); unsubTerms(); };
  }, []);

  // Fetch classes and programs when branch changes
  useEffect(() => {
      // Clear selections when branch changes
      setSelectedPrograms([]);
      setPrograms([]);
      
      if (formData.branch_id) {
          // Fetch Programs
          programService.getAll(formData.branch_id).then(setPrograms).catch(console.error);
          // Classes will be fetched when program is selected in sub-modal or we can fetch all for branch
          getClasses(formData.branch_id).then(setClasses).catch(console.error); 
      } else {
          setClasses([]);
          setPrograms([]);
      }
  }, [formData.branch_id]);

  // Update total amount when selectedPrograms changes
  useEffect(() => {
    const total = selectedPrograms.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
    setFormData(prev => ({ 
        ...prev, 
        total_amount: total.toString(),
        // Default to Unpaid (0) or keep previous logic? 
        // Let's NOT auto-update paid_amount here to avoid overwriting user input if they go back/forth.
    }));
  }, [selectedPrograms]);
  
  const [paymentStatusOption, setPaymentStatusOption] = useState<'Paid' | 'Unpaid'>('Unpaid');

  const handlePaymentStatusChange = (status: 'Paid' | 'Unpaid') => {
      setPaymentStatusOption(status);
      if (status === 'Paid') {
          setFormData(prev => ({ ...prev, paid_amount: prev.total_amount }));
      } else if (status === 'Unpaid') {
          setFormData(prev => ({ ...prev, paid_amount: "0" }));
      }
      // Partial leaves it as is (or clears it? Let's leave it)
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => setImagePreview(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Clear error when typing
      if (validationErrors[name]) {
          setValidationErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[name];
              return newErrors;
          });
      }
  };

  const handleAddProgram = () => {
    if (!newProgramData.program_id || !newProgramData.class_id) {
        alert("Please fill in all program details");
        return;
    }

    const program = programs.find(p => p.id === newProgramData.program_id);
    const cls = classes.find(c => c.class_id === newProgramData.class_id);

    if (program && cls) {
        // Calculate Fee
        const startSession = parseInt(newProgramData.start_session) || 1;
        const totalSessions = cls.totalSessions || 12; // Default 12 if not set
        const remainingSessions = Math.max(0, totalSessions - startSession + 1);
        
        // Fee Logic:
        // 1. If program has specific session_fee, use it.
        // 2. Else calculate per-session from total price / total sessions.
        let feePerSession = 0;
        if (program.session_fee) {
            feePerSession = Number(program.session_fee);
        } else {
            feePerSession = Number(program.price) / totalSessions;
        }

        let calculatedPrice = feePerSession * remainingSessions;

        // Add next term if selected
        if (newProgramData.include_next_term) {
             calculatedPrice += Number(program.price);
        }

        if (editingProgramIndex !== null) {
            // Edit existing
            setSelectedPrograms(prev => {
                const newArr = [...prev];
                newArr[editingProgramIndex] = {
                    ...newProgramData,
                    program_name: program.name,
                    class_name: cls.className,
                    price: calculatedPrice.toFixed(2),
                    // Store for re-edit
                    start_session: newProgramData.start_session,
                    include_next_term: newProgramData.include_next_term
                };
                return newArr;
            });
            setEditingProgramIndex(null);
        } else {
            // Add new
            setSelectedPrograms(prev => [...prev, {
                ...newProgramData,
                program_name: program.name,
                class_name: cls.className,
                price: calculatedPrice.toFixed(2),
                // Store for re-edit
                start_session: newProgramData.start_session,
                include_next_term: newProgramData.include_next_term
            }]);
        }
        
        // Reset and close
        setNewProgramData({
            program_id: "",
            class_id: "",
            start_session: "1",
            include_next_term: false,
            admission_date: new Date().toISOString().split('T')[0]
        });
        setIsAddingProgram(false);
    }
  };

  const handleEditProgram = (index: number) => {
      const prog = selectedPrograms[index];
      setNewProgramData({
          program_id: prog.program_id,
          class_id: prog.class_id,
          start_session: prog.start_session || "1",
          include_next_term: prog.include_next_term || false,
          admission_date: prog.admission_date || new Date().toISOString().split('T')[0]
      });
      setEditingProgramIndex(index);
      setIsAddingProgram(true);
  };

  const handleRemoveProgram = (index: number) => {
      if (window.confirm("Are you sure you want to remove this program?")) {
        setSelectedPrograms(prev => prev.filter((_, i) => i !== index));
      }
  };

  const validateStep = (step: number) => {
      const errors: { [key: string]: string } = {};

      if (step === 1) {
          if (!formData.first_name) errors.first_name = "First name is required";
          if (!formData.last_name) errors.last_name = "Last name is required";
          if (!formData.gender) errors.gender = "Gender is required";
          if (!formData.dob) errors.dob = "Date of birth is required";
          if (!formData.branch_id) errors.branch_id = "Branch is required";
          if (!formData.nationality) errors.nationality = "Nationality is required";

          // Phone Validation
          if (formData.phone && !validatePhone(formData.phone)) {
               errors.phone = "Invalid format. Use 9-10 digits starting with 0";
          }
          if (formData.parent_phone && !validatePhone(formData.parent_phone)) {
               errors.parent_phone = "Invalid format. Use 9-10 digits starting with 0";
          }

          if (Object.keys(errors).length > 0) {
              setValidationErrors(errors);
              // alert("Please fix the errors before proceeding.");
              return false;
          }
      }
      if (step === 2) {
          if (selectedPrograms.length === 0) {
              alert("Please add at least one program.");
              return false;
          }
      }
      if (step === 3) {
           if (!formData.total_amount || !formData.paid_amount || !formData.payment_type) {
               alert("Please fill in payment details.");
               return false;
           }
      }
      return true;
  };

  const nextStep = async () => {
      if (!validateStep(currentStep)) return;

      // Step 1: Check for duplicates before proceeding to Enrollment
      if (currentStep === 1) {
          const studentName = `${formData.first_name} ${formData.last_name}`.trim();
          if (studentName) {
            try {
                // Check if user is trying to bypass warning
                // Note: If we want to strictly force check every time, we do this.
                // If user already saw modal and clicked "Continue Anyway", we need a way to bypass this check.
                // However, "Continue Anyway" sets currentStep to 2 directly, so it won't hit this logic again for Step 1 -> 2 transition.
                
                const duplicateQuery = query(
                    collection(db, "students"),
                    where("student_name", "==", studentName)
                );

                const duplicateSnap = await getDocs(duplicateQuery);
                if (!duplicateSnap.empty) {
                    const duplicates = duplicateSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setDuplicateStudents(duplicates);
                    setShowDuplicateModal(true);
                    return; // Stop here
                }
            } catch (error) {
                console.error("Error checking duplicates:", error);
            }
          }
      }

      if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
      if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  async function handleSubmit(e: React.FormEvent) {
      e?.preventDefault(); 
      if (!validateStep(3)) return;

      setSubmitting(true);

      try {
          
          // 0. Check for duplicates (only if not already confirmed)
          const studentName = `${formData.first_name} ${formData.last_name}`.trim();
          
          // Simple normalization for check
          const duplicateQuery = query(
              collection(db, "students"), 
              where("student_name", "==", studentName)
          );
          
          const duplicateSnap = await getDocs(duplicateQuery);
          if (!duplicateSnap.empty) {
              const duplicates = duplicateSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setDuplicateStudents(duplicates);
              setShowDuplicateModal(true);
              setSubmitting(false);
              return;
          }

          await createStudent();
          
      } catch (error) {
          console.error("Error checking duplicates:", error);
          alert("Failed to validate student data");
          setSubmitting(false);
      }
  }

  const createStudent = async () => {
      setSubmitting(true);
      try {
          // 1. Upload Image
          let imageUrl = "";
          if (imageFile) {
              imageUrl = await uploadImage(imageFile, `students/${Date.now()}_${imageFile.name}`);
          }

          // 2. Create Student
          const studentPayload: any = {
              first_name: formData.first_name,
              last_name: formData.last_name,
              student_name: `${formData.first_name} ${formData.last_name}`.trim(),
              student_code: formData.student_code || `STU-${Date.now().toString().slice(-6)}`,
              age: calculateAge(formData.dob),
              gender: formData.gender,
              dob: formData.dob,
              pob: formData.pob,
              nationality: formData.nationality,
              branch_id: formData.branch_id, 
              address: formData.address,
              phone: formData.phone,
              email: formData.email,
              
              parent_phone: formData.parent_phone,
              mother_name: formData.mother_name,
              father_name: formData.father_name,
              
              status: formData.status,
              admission_date: formData.admission_date,
              image_url: imageUrl,
          };

          const newStudent = await addStudent(studentPayload);
          const newEnrollments = [];





          // Distribute paid amount across programs (if multiple)
          // If Skip Payment, we force remainingPaid to 0.
          let remainingPaid = Number(formData.paid_amount);

          for (const prog of selectedPrograms) {
               const price = Number(prog.price);
               const amountAllocated = Math.min(remainingPaid, price);
               remainingPaid -= amountAllocated;

               // Find the active term
               const activeTerm = terms.find(t => t.status === 'Active');
               
               const enrollmentPayload = {
                  student_id: newStudent.id,
                  class_id: prog.class_id,
                  total_amount: price,
                  discount: 0, 
                  paid_amount: amountAllocated, 
                  payment_status: amountAllocated >= price ? 'Paid' : 'Unpaid', 
                  payment_type: formData.payment_type,
                  enrollment_status: 'Active',

                  session_fee: Number(prog.price),
                  start_session: Number(prog.start_session || 1),
                  include_next_term: prog.include_next_term || false,
                  term: activeTerm?.term_name || '',
                  term_id: activeTerm?.term_id || '',
                  payment_due_date: formData.payment_due_date || "" 
              };
              
              const enrId = await addEnrollment(enrollmentPayload);
              newEnrollments.push({ enrollment_id: enrId, ...enrollmentPayload });
          }

          // Success! Move to Step 4 (Invoice)
          setCreatedStudent({ student_id: newStudent.id, ...studentPayload, student_code: newStudent.student_code || studentPayload.student_code });
          setCreatedEnrollments(newEnrollments);
          if (generateInvoice) {
              setCurrentStep(4);
          } else {
              router.push('/admin/students?action=success');
          }
          
      } catch (error) {
          console.error("Error creating student:", error);
          alert("Failed to create student");
      } finally {
          setSubmitting(false);
          setShowDuplicateModal(false);
      }
  };

  const handleSaveEarly = async () => {
      alert("This feature is only available after completing the full admission process.");
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

  const handleHeaderBack = () => {
    if (currentStep > 1) {
        prevStep();
    } else {
        router.back();
    }
  };

  return (
    <div className="max-w-[70rem] mx-auto space-y-6 pb-24 px-4 font-sans relative">
        
        {/* Header */}
        <div className="flex items-center gap-4 py-6">
            <button onClick={handleHeaderBack} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 transition-all shadow-sm border border-slate-100">
                <ChevronLeft size={20} />
            </button>
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">New Admission</h1>
                <p className="text-slate-500 text-sm font-medium">Create a new student profile and enrollment</p>
            </div>
        </div>

        {/* Stepper */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-8">
            <Stepper currentStep={currentStep} />
        </div>

        <form onSubmit={(e) => e.preventDefault()}> 
            
            {/* STEP 1: Student & Parent */}
            {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     
                     {/* Student Info Card */}
                     <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                                <User size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Student Information</h3>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
                            
                            {/* Photo Upload */}
                            <div className="md:col-span-3 flex flex-col pt-2">
                                <div className="relative group w-full aspect-[3/4] rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <Upload size={20} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-500">Upload Photo</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                                <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                                
                                <Select label="Branch Name" name="branch_id" value={formData.branch_id} onChange={handleInputChange} required>
                                    <option value="">Select Branch</option>
                                    {branches.map(b => (
                                        <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                                    ))}
                                </Select>
                                
                                <Select label="Gender" name="gender" value={formData.gender} onChange={handleInputChange} required>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </Select>

                                <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleInputChange} required />
                                <Input label="Place of Birth" name="pob" value={formData.pob} onChange={handleInputChange} icon={<MapPin size={16} />} />
                                
                                <Select label="Nationality" name="nationality" value={formData.nationality} onChange={handleInputChange} required>
                                    <option value="">Select Nationality</option>
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                                    ))}
                                </Select>

                                <Input 
                                    label="Phone Number" 
                                    name="phone" 
                                    value={formData.phone} 
                                    onChange={handleInputChange} 
                                    icon={<Phone size={16} />} 
                                    error={validationErrors.phone}
                                />
                                <div className="md:col-span-2">
                                     <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} icon={<Mail size={16} />} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Parent Info Card */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                         <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                                <ShieldAlert size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Guardian Information</h3>
                        </div>
                        <div className="p-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Father's Name" name="father_name" value={formData.father_name} onChange={handleInputChange} />
                                <Input label="Mother's Name" name="mother_name" value={formData.mother_name} onChange={handleInputChange} />
                                <Input label="Contact Number" name="parent_phone" value={formData.parent_phone} onChange={handleInputChange} required icon={<Phone size={16} />} />
                                <Input label="Address" name="address" value={formData.address} onChange={handleInputChange} icon={<MapPin size={16} />} />
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* STEP 2: Enrollment */}
            {currentStep === 2 && (
                <div className="max-w-3xl mx-auto bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                            <BookOpen size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Enrollment Details</h3>
                    </div>

                    <div className="p-8 space-y-6">
                        {/* Program List */}
                        <div className="space-y-3">
                            {selectedPrograms.map((prog, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl group transition-all hover:bg-indigo-50/30 hover:border-indigo-100">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            {prog.program_name}
                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">ACTIVE</span>
                                        </h4>
                                        <div className="flex gap-4 mt-1">
                                            <p className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">Class: {prog.class_name}</p>
                                        </div>
                                        <p className="text-xs text-indigo-600 font-bold mt-2">${prog.price}</p>
                                    </div>
                                     <div className="flex items-center gap-1">
                                         <button 
                                            onClick={() => handleEditProgram(idx)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Details"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleRemoveProgram(idx)}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Remove Program"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                             {selectedPrograms.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-3">
                                        <BookOpen size={20} />
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium">No programs added yet.</p>
                                    <p className="text-slate-400 text-xs">Click "Add Program" to enroll student.</p>
                                </div>
                            )}

                            <button 
                                onClick={() => setIsAddingProgram(true)}
                                className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl font-bold text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={18} />
                                <span>Add Program</span>
                            </button>
                        </div>

                         <Select label="Global Status" name="status" value={formData.status} onChange={handleInputChange} required>
                            <option value="Active">Active</option>
                            <option value="Hold">Hold</option>
                        </Select>
                    </div>
                </div>
            )}

            {/* STEP 3: Payment */}
            {currentStep === 3 && (
                 <div className="max-w-3xl mx-auto bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                            <CreditCard size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Initial Payment</h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 gap-6">
                         <div className="bg-slate-900 p-6 rounded-2xl flex justify-between items-center text-white shadow-xl shadow-slate-200">
                             <span className="font-medium opacity-80">Total Tuition Fee</span>
                             <span className="text-2xl font-black">${formData.total_amount || '0.00'}</span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-6">
                            <Input label="Total Amount ($)" name="total_amount" type="number" value={formData.total_amount} onChange={handleInputChange} required />
                            <Input label="Discount ($)" name="discount" type="number" value={formData.discount} onChange={handleInputChange} />
                         </div>

                         <div className="grid grid-cols-2 gap-6">
                             {/* Payment Status Toggle */}
                             <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Status</label>
                                <div className="flex bg-slate-100 p-1 rounded-2xl">
                                    {['Unpaid', 'Paid'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => handlePaymentStatusChange(status as any)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${paymentStatusOption === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                             </div>

                            <Select label="Payment Method" name="payment_type" value={formData.payment_type} onChange={handleInputChange} required>
                                 <option value="Cash">Cash</option>
                                 <option value="ABA">ABA</option>
                             </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Amount Paid ($)" name="paid_amount" type="number" value={formData.paid_amount} onChange={(e: any) => {
                                handleInputChange(e);
                                // Removed auto-switch to Partial
                            }} required />

                            
                             <Input 
                                label="Payment Due Date (Expiry)" 
                                name="payment_due_date" 
                                type="date" 
                                value={formData.payment_due_date} 
                                onChange={handleInputChange} 
                             />
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                             <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                             <p className="text-[10px] text-amber-600 font-bold">
                                System will mark student as "Unpaid" automatically after the due date.
                             </p>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: Invoice */}
            {currentStep === 4 && createdStudent && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    <div className="flex justify-center gap-4 py-4 print:hidden">
                        <button
                            onClick={handlePrint}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                            <Printer size={18} />
                            <span>Print Invoice</span>
                        </button>
                        <button
                            onClick={() => router.push('/admin/students')}
                            className="bg-white text-slate-600 px-6 py-3 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                            Finish & Return
                        </button>
                    </div>

                    {/* Invoice Paper Preview */}
                    <div ref={invoiceRef} className="bg-white p-12 rounded-[24px] shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-8">
                        
                         {/* Invoice Header */}
                        <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm print:border-slate-300">
                                    {school?.logo_url ? (
                                        <img src={school.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-2xl font-black text-indigo-600">{school?.school_name?.charAt(0) || "A"}</span>
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">{school?.school_name || "Authentic Advanced Academy"}</h1>
                                    <div className="text-xs font-medium text-slate-400 mt-1 space-y-0.5">
                                        <p className="flex items-center gap-1"><MapPin size={12} /> {school?.address || "1st Floor, Boeung Snor Food Village"}</p>
                                        <p className="flex items-center gap-1"><Phone size={12} /> {(school as any)?.phone || "089 284 3984"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-4xl font-black text-slate-200 tracking-tighter uppercase print:text-slate-400">Invoice</h2>
                                <p className="font-mono text-sm font-bold text-slate-500 mt-2">#{Math.floor(Math.random() * 100000).toString().padStart(6, '0')}</p>
                                <p className="text-sm font-medium text-slate-400 mt-1">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Bill To */}
                        <div className="flex justify-between mb-12">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Bill To</p>
                                <h3 className="text-xl font-bold text-slate-800">{createdStudent.first_name} {createdStudent.last_name}</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">ID: {createdStudent.student_code}</p>
                                <p className="text-sm font-medium text-slate-500">{createdStudent.phone}</p>
                                <p className="text-sm font-medium text-slate-500">{createdStudent.address}</p>
                            </div>
                        </div>

                        {/* Table */}
                        <table className="w-full mb-12">
                            <thead className="bg-slate-50 border-y border-slate-100 print:bg-slate-100 print:border-slate-300">
                                <tr>
                                    <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="py-3 px-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Session</th>
                                    <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                                {createdEnrollments.map((enr, idx) => (
                                    <tr key={idx}>
                                        <td className="py-4 px-4">
                                            <p className="font-bold text-slate-700">Tuition Fee</p>
                                            <p className="text-xs text-slate-400">Term: {enr.term}</p>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="font-bold text-slate-600">-</span>
                                        </td>
                                        <td className="py-4 px-4 text-right font-bold text-slate-700">
                                            ${Number(enr.total_amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end border-t border-slate-100 pt-8 print:border-slate-300">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-sm font-medium text-slate-500">
                                    <span>Total Due</span>
                                    <span>${createdEnrollments.reduce((sum, e) => sum + Number(e.total_amount), 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium text-slate-500">
                                    <span>Paid Amount</span>
                                    <span>-${createdEnrollments.reduce((sum, e) => sum + Number(e.paid_amount), 0).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-slate-100 pt-3 flex justify-between items-center print:border-slate-300">
                                    <span className="font-black text-slate-800 text-lg">Balance Due</span>
                                    <span className="font-black text-indigo-600 text-2xl">
                                        ${(createdEnrollments.reduce((sum, e) => sum + Number(e.total_amount), 0) - createdEnrollments.reduce((sum, e) => sum + Number(e.paid_amount), 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                         {/* Footer */}
                        <div className="mt-20 pt-8 border-t border-dashed border-slate-200 text-center print:mt-10">
                            <p className="text-slate-400 text-xs font-medium">Thank you for choosing Authentic Advanced Academy!</p>
                        </div>

                    </div>
                    
                </div>
            )}
            

            {/* Add Program Dialog/Modal */}
            {isAddingProgram && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="bg-indigo-50/50 p-6 border-b border-indigo-100 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <BookOpen size={20} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">{editingProgramIndex !== null ? 'Edit Program' : 'Add Program'}</h3>
                        </div>
                        <button onClick={() => { setIsAddingProgram(false); setEditingProgramIndex(null); }} className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm">
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                    <div className="p-6 space-y-5">
                        <Select 
                            label="Program" 
                            name="program_id" 
                            value={newProgramData.program_id} 
                            onChange={(e: any) => setNewProgramData(prev => ({ ...prev, program_id: e.target.value }))}
                            required
                        >
                            <option value="">Select Program</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                            ))}
                        </Select>

                        <Select 
                            label="Class" 
                            name="class_id" 
                            value={newProgramData.class_id} 
                            onChange={(e: any) => setNewProgramData(prev => ({ ...prev, class_id: e.target.value }))}
                            required
                        >
                            <option value="">Select Class</option>
                            {classes
                                .filter(c => !newProgramData.program_id || c.programId === newProgramData.program_id) 
                                .map(c => (
                                <option key={c.class_id} value={c.class_id}>{c.className}</option>
                            ))}
                        </Select>


                        <div className="grid grid-cols-2 gap-5">
                            <Input 
                                label="Start Session" 
                                name="start_session" 
                                type="number" 
                                min="1"
                                max="50"
                                value={newProgramData.start_session} 
                                onChange={(e: any) => setNewProgramData(prev => ({ ...prev, start_session: e.target.value }))}
                                required 
                            />
                            
                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-6">
                                <input 
                                    type="checkbox" 
                                    id="includeNextTerm"
                                    checked={newProgramData.include_next_term || false}
                                    onChange={(e) => setNewProgramData(prev => ({ ...prev, include_next_term: e.target.checked }))}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <label htmlFor="includeNextTerm" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                    Include Next Term
                                </label>
                            </div>
                        </div>

                        <Input 
                            label="Admission Date" 
                            name="admission_date" 
                            type="date" 
                            value={newProgramData.admission_date} 
                            onChange={(e: any) => setNewProgramData(prev => ({ ...prev, admission_date: e.target.value }))}
                            required 
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button 
                            onClick={() => { setIsAddingProgram(false); setEditingProgramIndex(null); }}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold text-xs"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddProgram}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700"
                        >
                             {editingProgramIndex !== null ? 'Update Program' : 'Add Program'}
                        </button>
                    </div>
                </div>
                </div>
            )}

            {showDuplicateModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Duplicate Student Detected</h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    We found students with the name <span className="font-bold text-slate-800">"{formData.first_name} {formData.last_name}"</span> already in the system.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Existing Records</h4>
                            <div className="space-y-3">
                                {duplicateStudents.map((stu) => (
                                    <div key={stu.id} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                         <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-white shadow-sm">
                                            {stu.image_url ? (
                                                <img src={stu.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={20} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h5 className="font-bold text-slate-800">{stu.student_name}</h5>
                                                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{stu.student_code}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                <span>{stu.gender}</span>
                                                <span>•</span>
                                                <span>{stu.dob}</span>
                                                <span>•</span>
                                                <span>{stu.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">

                            <button
                                onClick={() => { setShowDuplicateModal(false); setSubmitting(false); }}
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors w-full"
                            >
                                Close & Edit Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-40 flex justify-center">
                <div className="w-full max-w-[70rem] flex justify-end items-center px-4 gap-3">
                    <button 
                        type="button" 
                        onClick={prevStep} 
                        disabled={currentStep === 1 || currentStep === 4}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all order-1 ${currentStep === 1 || currentStep === 4 ? 'hidden' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>

                    <div className="flex items-center gap-3 order-2">
                        {/* Removed Save Draft as per new requirements or kept as placeholder? 
                            Let's keep it but make it validate first? Or disable.
                            User said "can't next step until we put the data first".
                            Save Draft typically BYPASSES validation.
                            I will disable Save Draft or remove logic for now to enforce strictness.
                            Actually, the user said "can't next step until we put the data",
                            Save Draft is not Next Step.
                            I implemented handleSaveEarly to just alert for now.
                        */}
                        
                        {currentStep < 3 ? (
                            <button 
                                type="button" 
                                onClick={nextStep}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                            >
                                <span>{currentStep === 3 ? 'Review Enrollment' : 'Next Step'}</span>
                                <ArrowRight size={18} />
                            </button>
                        ) : currentStep === 3 ? (
                            <button 
                                type="button" 
                                onClick={(e) => handleSubmit(e as any)}
                                disabled={submitting}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
                                <span>Complete Admission</span>
                            </button>
                        ) : null}

                    </div>
                 </div>
            </div>

        </form>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, label: "Student Info" },
    { id: 2, label: "Enrollment" },
    { id: 3, label: "Payment" },
    { id: 4, label: "Invoice" },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center w-full">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step Circle & Label Container */}
              <div className="relative flex flex-col items-center group">
                <div 
                  className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 z-10
                      ${isActive 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110" 
                          : isCompleted 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-white border-slate-200 text-slate-400"
                      }
                  `}
                >
                  {isCompleted ? <Check size={18} strokeWidth={3} /> : step.id}
                </div>
                
                {/* Absolute Label to prevent layout shift */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-max text-center">
                    <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {step.label}
                    </span>
                </div>
              </div>

              {/* Connecting Line (Not for last item) */}
              {!isLast && (
                <div className="flex-1 mx-4 h-[2px] bg-slate-100 relative">
                    <div 
                        className="absolute inset-0 bg-indigo-600 transition-all duration-500 ease-out origin-left"
                        style={{ transform: `scaleX(${isCompleted ? 1 : 0})` }}
                    />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Spacer for labels */}
      <div className="h-12" /> 
    </div>
  );
}

function Input({ label, name, type = "text", required, placeholder, value, onChange, icon }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
                <input 
                    name={name} 
                    type={type} 
                    required={required} 
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`w-full ${icon ? 'pr-12 pl-4' : 'px-4'} py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-sm text-slate-700 placeholder:text-slate-300 shadow-sm`}
                />
                {icon && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}

function Select({ label, name, required, children, value, onChange, icon }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
                <select 
                    name={name} 
                    required={required} 
                    value={value}
                    onChange={onChange}
                    className={`w-full ${icon ? 'pl-20' : 'pl-4'} pr-10 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-sm text-slate-700 appearance-none cursor-pointer shadow-sm`}
                >
                    {children}
                </select>
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                        {icon}
                    </div>
                )}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    )
}
