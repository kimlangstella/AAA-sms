"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  UserPlus, 
  Upload, 
  ChevronLeft, 
  Loader2, 
  Shield, 
  Save, 
  User 
} from "lucide-react";
import { branchService } from "@/services/branchService";
import { addStudent, uploadImage } from "@/lib/services/schoolService";
import { Branch } from "@/lib/types";

export default function AddStudentPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const unsub = branchService.subscribe(setBranches);
    return () => unsub();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => setImagePreview(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setSubmitting(true);

      try {
          const formData = new FormData(e.currentTarget);
          
          let imageUrl = "";
          if (imageFile) {
              imageUrl = await uploadImage(imageFile, `students/${Date.now()}_${imageFile.name}`);
          }

          const studentData: any = {
              first_name: formData.get("first_name"),
              last_name: formData.get("last_name"),
              student_name: `${formData.get("first_name")} ${formData.get("last_name")}`.trim(),
              student_code: formData.get("student_code") || `STU-${Date.now().toString().slice(-6)}`,
              age: Number(formData.get("age")),
              gender: formData.get("gender"),
              dob: formData.get("dob"),
              pob: formData.get("pob"),
              nationality: formData.get("nationality"),
              branch_id: formData.get("branch_id"),
              address: formData.get("address"),
              phone: formData.get("phone"),
              email: formData.get("email"),
              
              // Parent Info
              parent_phone: formData.get("parent_phone"),
              mother_name: formData.get("mother_name"),
              father_name: formData.get("father_name"),
              
              status: formData.get("status") || 'Active',
              admission_date: formData.get("admission_date") || new Date().toISOString().split('T')[0],
              image_url: imageUrl,

              // Insurance Info
              insurance_info: {
                  provider: formData.get("ins_provider"),
                  policy_number: formData.get("ins_policy_number"),
                  type: formData.get("ins_type"),
                  coverage_amount: Number(formData.get("ins_coverage")),
                  start_date: formData.get("ins_start_date"),
                  end_date: formData.get("ins_end_date"),
              }
          };

          await addStudent(studentData);
          router.push('/admin/students?action=success');
          
      } catch (error) {
          console.error("Error creating student:", error);
          alert("Failed to create student");
      } finally {
          setSubmitting(false);
      }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <ChevronLeft size={24} />
            </button>
            <div>
                <h1 className="text-2xl font-black text-slate-800">New Student Admission</h1>
                <p className="text-slate-500 text-sm font-medium">Create a new student profile and insurance record.</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Personal Information */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-8">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Personal Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex justify-center md:col-span-2 mb-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/30">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="text-slate-300 group-hover:text-indigo-400" size={32} />
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                </div>
                                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">Upload Photo</p>
                            </div>
                        </div>

                        <Input label="First Name" name="first_name" required />
                        <Input label="Last Name" name="last_name" required />
                        
                        <Select label="Gender" name="gender" required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </Select>

                        <Input label="Date of Birth" name="dob" type="date" required />
                        <Input label="Place of Birth" name="pob" required />
                        
                        <Select label="Nationality" name="nationality" required defaultValue="Cambodian">
                            <option value="Cambodian">Cambodian</option>
                            <option value="Foreign">Foreign</option>
                        </Select>

                        <Input label="Phone Number" name="phone" />
                        <Input label="Email Address" name="email" type="email" />
                    </div>
                </div>

                {/* Insurance Information - New Section */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100%] pointer-events-none"></div>
                    
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-50 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Insurance Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <Input label="Insurance Provider" name="ins_provider" placeholder="e.g. Forte, Infinity" />
                        <Input label="Policy Number" name="ins_policy_number" placeholder="POL-XXX-XXX" />
                        
                        <Select label="Policy Type" name="ins_type">
                            <option value="">Select Type</option>
                            <option value="Health">Health</option>
                            <option value="Accident">Accident</option>
                            <option value="Life">Life</option>
                        </Select>

                        <Input label="Coverage Amount ($)" name="ins_coverage" type="number" placeholder="0.00" />
                        
                        <Input label="Start Date" name="ins_start_date" type="date" />
                        <Input label="Valid Until" name="ins_end_date" type="date" />
                    </div>
                </div>

            </div>

            {/* Right Column - Academic & Parent */}
            <div className="space-y-8">
                
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Academic Details</h3>
                    
                    <Select label="Campus Branch" name="branch_id" required>
                        <option value="">Select Branch</option>
                        {branches.map(b => (
                            <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                        ))}
                    </Select>

                    <Input label="Admission Date" name="admission_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                    
                    <Select label="Status" name="status" required defaultValue="Active">
                        <option value="Active">Active</option>
                        <option value="Hold">Hold</option>
                    </Select>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Parent / Guardian</h3>
                    
                    <Input label="Father's Name" name="father_name" />
                    <Input label="Mother's Name" name="mother_name" />
                    <Input label="Contact Number" name="parent_phone" required />
                    <Input label="Address" name="address" required />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                    {submitting ? <Loader2 className="animate-spin" /> : <><Save size={20} /> <span>Save Student Profile</span></>}
                </button>

            </div>

        </form>
    </div>
  );
}

function Input({ label, name, type = "text", required, placeholder, defaultValue }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>
            <input 
                name={name} 
                type={type} 
                required={required} 
                placeholder={placeholder}
                defaultValue={defaultValue}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-sm text-slate-700 placeholder:text-slate-300"
            />
        </div>
    )
}

function Select({ label, name, required, children, defaultValue }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>
            <div className="relative">
                <select 
                    name={name} 
                    required={required} 
                    defaultValue={defaultValue}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-sm text-slate-700 appearance-none cursor-pointer"
                >
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    )
}

