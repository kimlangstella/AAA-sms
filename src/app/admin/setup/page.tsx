"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Building2, 
  GraduationCap, 
  Landmark, 
  Plus, 
  School, 
  BookOpen, 
  Calendar, 
  Settings, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Save, 
  Loader2, 
  Users,
  MoreVertical,
  Check,
  Camera
} from "lucide-react";
import { 
  getSchoolDetails, 
  updateSchoolDetails, 
  createSchoolDetails, 
  subscribeToSchoolDetails, 
  subscribeToClasses, 
  subscribeToStudents, 
  subscribeToEnrollments,
  uploadImage 
} from "@/lib/services/schoolService";
import { branchService } from "@/services/branchService";
import { programService } from "@/services/programService";
import { School as SchoolType, Branch, Class, Enrollment } from "@/lib/types";
import { Suspense } from "react";

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="h-96 flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}>
        <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as string;
  
  const [activeTab, setActiveTab] = useState(tabParam || 'branches');
  const [showAddForm, setShowAddForm] = useState(false);
  const [school, setSchool] = useState<SchoolType | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    const unsubSchool = subscribeToSchoolDetails(setSchool);
    const unsubBranches = branchService.subscribe(setBranches);
    const unsubClasses = subscribeToClasses(setClasses);
    const unsubEnrollments = subscribeToEnrollments(setEnrollments);
    return () => {
        unsubSchool();
        unsubBranches();
        unsubClasses();
        unsubEnrollments();
    };
  }, []);

  useEffect(() => {
    if (!searchParams.get('tab')) {
        router.replace('/admin/setup?tab=branches', { scroll: false });
    } else if (tabParam !== activeTab) {
        setActiveTab(tabParam);
    }
  }, [searchParams, activeTab, router, tabParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowAddForm(false);
    router.push(`/admin/setup?tab=${tab}`, { scroll: false });
  };

  const hasSchool = !!school?.school_id;
  const hasBranches = branches.length > 0;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
          <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Academic Setup</h1>
              <p className="text-slate-500 font-medium mt-2 text-lg">Configure your school's structural entities.</p>
          </div>
          <div className="flex glass p-1.5 rounded-2xl shadow-sm">
             <TabButton 
                active={activeTab === 'branches'} 
                onClick={() => handleTabChange('branches')} 
                icon={<Building2 size={18} />} 
                label="Branches" 
             />
             <TabButton 
                active={activeTab === 'programs'} 
                onClick={() => handleTabChange('programs')} 
                icon={<GraduationCap size={18} />} 
                label="Programs" 
                disabled={!hasBranches}
             />
             <TabButton 
                active={activeTab === 'identity'} 
                onClick={() => handleTabChange('identity')} 
                icon={<Landmark size={18} />} 
                label="School" 
             />
          </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'branches' && (
              <div className="space-y-6">
                   {!hasSchool ? (
                       <SetupRequired message="Please configure your School Identity first." action={() => handleTabChange('identity')} />
                   ) : showAddForm ? (
                       <div className="max-w-3xl mx-auto">
                            <CreateBranchForm school={school} onCancel={() => setShowAddForm(false)} />
                       </div>
                   ) : (
                       <BranchList branches={branches} enrollments={enrollments} onAdd={() => setShowAddForm(true)} />
                   )}
              </div>
          )}

          {activeTab === 'programs' && (
              <div className="space-y-6">
                  {!hasBranches ? (
                       <SetupRequired message="Please create at least one Branch first." action={() => handleTabChange('branches')} />
                   ) : showAddForm ? (
                       <div className="max-w-3xl mx-auto">
                           <CreateProgramForm branches={branches} onCancel={() => setShowAddForm(false)} />
                       </div>
                   ) : (
                       <ProgramList classes={classes} enrollments={enrollments} onAdd={() => setShowAddForm(true)} />
                   )}
              </div>
          )}

          {activeTab === 'identity' && (
               <div className="max-w-4xl mx-auto">
                    <SchoolSettingsForm school={school} />
               </div>
          )}
      </div>
    </div>
  );
}

// --- Components ---

function TabButton({ active, onClick, icon, label, disabled }: any) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                active 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : disabled 
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}

function SetupRequired({ message, action }: { message: string, action: () => void }) {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-2">
                <Landmark size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800">Setup Required</h3>
            <p className="text-slate-500 font-medium">{message}</p>
            <button onClick={action} className="mt-4 text-blue-600 font-bold hover:underline">
                Go to configuration &rarr;
            </button>
        </div>
    );
}

// --- Forms & Lists ---

function BranchList({ branches, enrollments, onAdd }: any) {
    return (
        <div className="glass-panel overflow-hidden">
             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                     <h2 className="text-xl font-bold text-slate-800">Branch Campuses</h2>
                     <p className="text-slate-400 text-sm font-medium">Manage your physical locations.</p>
                </div>
                <button onClick={onAdd} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    <Plus size={18} />
                    <span>New Branch</span>
                </button>
            </div>
            
            <div className="overflow-x-auto">
                 <table className="w-full text-left">
                     <thead>
                         <tr className="bg-slate-50/50 border-b border-slate-100">
                             <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                             <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Contact</th>
                             <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Address</th>
                             <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Enrollment</th>
                             <th className="px-8 py-4"></th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                          {branches.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">No branches registered yet.</td>
                              </tr>
                          ) : branches.map((b: any) => (
                              <tr key={b.branch_id} className="hover:bg-blue-50/30 transition-colors group">
                                  <td className="px-8 py-5 font-bold text-slate-700">{b.branch_name}</td>
                                  <td className="px-8 py-5 text-sm text-slate-500">{b.phone}</td>
                                  <td className="px-8 py-5 text-sm text-slate-500 max-w-xs truncate">{b.address}</td>
                                  <td className="px-8 py-5 text-center">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                          {/* Placeholder count logic since strict mapping is complex in pure view */}
                                          {enrollments?.length > 0 ? 'Active' : '0'} 
                                      </span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                          <Settings size={16} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                     </tbody>
                 </table>
            </div>
        </div>
    )
}

function ProgramList({ classes, enrollments, onAdd }: any) {
    const [programs, setPrograms] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = programService.subscribe(setPrograms);
        return () => unsubscribe();
    }, []);

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-center md:justify-between bg-white flex-wrap gap-4">
                <div>
                     <h2 className="text-xl font-bold text-slate-800">Academic Programs</h2>
                     <p className="text-slate-400 text-sm font-medium">Curriculum and fee structures.</p>
                </div>
                <button onClick={onAdd} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                    <Plus size={18} />
                    <span>New Program</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 bg-slate-50/30">
                 {programs.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-400 font-medium">No programs found. Create one to get started.</div>
                 ) : programs.map(p => (
                      <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                           <div className="flex justify-between items-start mb-4">
                               <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                   <GraduationCap size={24} />
                               </div>
                               <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-bold">
                                   ${p.price}
                               </span>
                           </div>
                           <h3 className="text-lg font-bold text-slate-800 mb-1">{p.name}</h3>
                           <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                               <span className="flex items-center gap-1"><Calendar size={12}/> {p.durationSessions} Sessions</span>
                           </div>
                      </div>
                 ))}
                 
                 {/* Add New Card (Alternative to Top Button) */}
                 <button onClick={onAdd} className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all min-h-[160px]">
                      <Plus size={32} className="mb-2" />
                      <span className="font-bold text-sm">Add Another Program</span>
                 </button>
            </div>
        </div>
    )
}



function SchoolSettingsForm({ school }: any) {
    const [submitting, setSubmitting] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            let logoUrl = school?.logo_url;
            if (logoFile) {
                logoUrl = await uploadImage(logoFile, `school/logo_${Date.now()}`);
            }

            const data: any = {
                school_name: formData.get("school_name"),
                website: formData.get("website"),
                address: formData.get("address"),
                contact_info: formData.get("contact_info"),
                email: formData.get("email"),
                logo_url: logoUrl
            };

            if (school?.school_id) await updateSchoolDetails(school.school_id, data);
            else await createSchoolDetails(data);
            
            // Clear file state after successful save
            setLogoFile(null);
        } catch (error) {
            console.error(error);
            alert("Failed to save settings");
        } finally {
            setSubmitting(false);
        }
    }

    return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
             {/* Left Side: Edit Form */}
             <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                 <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                     <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Update Profile</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Required * Optional</p>
                     </div>
                 </div>
                 
                 <form onSubmit={handleSubmit} className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="relative p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group overflow-hidden">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleLogoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                />
                                {logoPreview || school?.logo_url ? (
                                    <img src={logoPreview || school.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover mb-2 ring-4 ring-white shadow-md transform group-hover:scale-110 transition-transform" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <School size={28} />
                                    </div>
                                )}
                                <span className="text-xs font-bold text-blue-600">
                                    {logoPreview || school?.logo_url ? 'Change Logo' : 'Upload Logo'}
                                </span>
                           </div>
                           <div className="space-y-6">
                                <InputGroup label="Phone Number" name="contact_info" defaultValue={school?.contact_info} required />
                                <InputGroup label="Website URL" name="website" defaultValue={school?.website} />
                           </div>
                           
                           <InputGroup label="Name of Institute" name="school_name" defaultValue={school?.school_name} required className="md:col-span-1" />
                           <InputGroup label="Address" name="address" defaultValue={school?.address} required className="md:col-span-1" />
                           
                           <InputGroup label="Institutional Email" name="email" defaultValue={school?.email} required className="md:col-span-2" />
                      </div>
                      
                      <div className="flex justify-end pt-2">
                           <button disabled={submitting} className="px-8 py-3 bg-orange-400 text-white rounded-xl font-bold text-sm hover:bg-orange-500 transition-all shadow-lg shadow-orange-100 disabled:opacity-50">
                               {submitting ? 'Saving...' : 'Update Profile'}
                           </button>
                      </div>
                 </form>
             </div>

             {/* Right Side: Profile Preview */}
             <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden p-8 flex flex-col items-center text-center relative">
                 <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-full">
                     Profile View
                 </div>
                 
                <div className="mt-8 mb-6 relative group">
                    <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-xl shadow-slate-200 border-4 border-slate-50 ring-1 ring-slate-100 overflow-hidden relative">
                         {logoPreview || school?.logo_url ? (
                             <img src={logoPreview || school.logo_url} alt="School Logo" className="w-full h-full object-cover" />
                         ) : school?.school_name ? (
                             <span className="text-3xl font-black uppercase">{school.school_name.charAt(0)}</span>
                         ) : (
                             <School size={48} />
                         )}
                         
                         {/* Hidden Input Trigger Overlay */}
                         <div 
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                         >
                            <Camera size={24} className="text-white" />
                         </div>
                    </div>
                </div>

                 <h2 className="text-xl font-black text-slate-800 leading-tight mb-1">
                     {school?.school_name || "Your Institute Name"}
                 </h2>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-8">
                     Institute Target Line
                 </p>

                 <div className="w-full space-y-4 text-left">
                     <PreviewItem icon={<Phone size={14} />} label="Phone No" value={school?.contact_info} />
                     <PreviewItem icon={<Mail size={14} />} label="Email" value={school?.email} />
                     <PreviewItem icon={<Globe size={14} />} label="Website" value={school?.website} />
                     <PreviewItem icon={<MapPin size={14} />} label="Address" value={school?.address} dashed />
                 </div>
             </div>
         </div>
    )
}

function PreviewItem({ icon, label, value, dashed }: any) {
    return (
        <div className="group">
             <div className="flex items-center gap-2 text-slate-400 mb-1">
                 {icon}
                 <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
             </div>
             <p className={`text-sm font-bold text-slate-700 break-words ${dashed ? 'border-b border-dashed border-slate-300 pb-1' : ''}`}>
                 {value || "----------------"}
             </p>
        </div>
    )
}

function CreateBranchForm({ school, onCancel }: any) {
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // same logic as before, simpler for brevity in this rewrite
        const data = Object.fromEntries(new FormData(e.currentTarget));
        await branchService.create({ ...data, school_id: school.school_id } as any);
        onCancel();
    }

    return (
        <CardForm title="New Branch Campus" onCancel={onCancel} onSubmit={handleSubmit}>
             <div className="space-y-6">
                 <InputGroup label="Branch Name" name="branch_name" required placeholder="e.g. North Campus" />
                 <InputGroup label="Phone" name="phone" required placeholder="Contact Number" />
                 <InputGroup label="Address" name="address" required placeholder="Location Address" />
             </div>
        </CardForm>
    )
}

function CreateProgramForm({ branches, onCancel }: any) {
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        await programService.create(data as any);
        onCancel();
    }
    
    return (
        <CardForm title="New Academic Program" onCancel={onCancel} onSubmit={handleSubmit} submitLabel="Do it">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Campus</label>
                     <select name="branchId" required className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white outline-none font-bold text-slate-700 transition-all">
                         {branches.map((b: any) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                     </select>
                 </div>
                 <InputGroup label="Program Title" name="name" required placeholder="e.g. General English" />
                 <InputGroup label="Sessions" name="durationSessions" type="number" required defaultValue={24} />
                 <InputGroup label="Tuition Fee ($)" name="price" type="number" required placeholder="120.00" />
             </div>
        </CardForm>
    )
}

// --- Generic UI Helpers ---

function CardForm({ title, children, onCancel, onSubmit, submitLabel = "Create" }: any) {
    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-300">
             <div className="text-center mb-8">
                 <h2 className="text-2xl font-black text-slate-800">{title}</h2>
             </div>
             <form onSubmit={onSubmit}>
                 {children}
                 <div className="flex gap-4 mt-8">
                     <button type="button" onClick={onCancel} className="flex-1 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Cancel</button>
                     <button className="flex-1 py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200">{submitLabel}</button>
                 </div>
             </form>
        </div>
    )
}

function InputGroup({ label, name, type="text", required, defaultValue, placeholder, icon, className }: any) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 ml-1 uppercase tracking-wide">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10">
                        {icon}
                    </div>
                )}
                <input 
                    name={name}
                    type={type}
                    required={required}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    className={`w-full ${icon ? 'pl-14 pr-5' : 'px-5'} py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500/20 focus:bg-white outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all shadow-sm`}
                />
            </div>
        </div>
    )
}
