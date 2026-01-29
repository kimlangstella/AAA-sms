"use client";

import { useAuth } from "@/lib/useAuth";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar,
  Shield,
  User,
  Medal
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  // Mock Staff Data - ideally fetched from a 'staff' collection linked to auth user
  const staffDetails = {
      role: "Administrator",
      department: "Management",
      employeeId: "EMP-2024-001",
      joiningDate: "2024-01-15",
      phone: "+855 12 345 678",
      address: "Phnom Penh, Cambodia",
      bio: "Senior administrator overseeing school operations and student management. responsible for system configuration and staff oversight."
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header / Cover */}
        <div className="relative rounded-[2.5rem] overflow-hidden bg-white shadow-sm border border-slate-200">
            {/* Cover Image */}
            <div className="h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="px-8 pb-8 flex flex-col md:flex-row items-end md:items-end gap-6 -mt-12">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-32 h-32 rounded-[2rem] bg-white p-1.5 shadow-lg">
                        <div className="w-full h-full rounded-[1.7rem] bg-indigo-50 flex items-center justify-center overflow-hidden">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-4xl font-black text-indigo-300">
                                    {(user.displayName || "U").charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                </div>

                {/* Name & Role */}
                <div className="flex-1 mb-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{user.displayName || "Staff Member"}</h1>
                            <p className="text-slate-500 font-bold flex items-center gap-2">
                                <Shield size={16} className="text-indigo-500" />
                                {staffDetails.role}
                            </p>
                        </div>
                        <div className="flex gap-3">
                             <button className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200">
                                Edit Profile
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Personal Info */}
            <div className="md:col-span-2 space-y-8">
                
                {/* About Section */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <User size={20} className="text-indigo-500" />
                        About
                    </h3>
                    <p className="text-slate-500 leading-relaxed font-medium">
                        {staffDetails.bio}
                    </p>
                </div>

                {/* Detailed Info Grid */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        <Building2 size={20} className="text-pink-500" />
                        Staff Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                         <InfoItem 
                            label="Employee ID" 
                            value={staffDetails.employeeId} 
                            icon={<Medal size={18} />} 
                         />
                         <InfoItem 
                            label="Department" 
                            value={staffDetails.department} 
                            icon={<Building2 size={18} />} 
                         />
                         <InfoItem 
                            label="Email Address" 
                            value={user.email} 
                            icon={<Mail size={18} />} 
                         />
                         <InfoItem 
                            label="Phone Number" 
                            value={staffDetails.phone} 
                            icon={<Phone size={18} />} 
                         />
                         <InfoItem 
                            label="Joining Date" 
                            value={staffDetails.joiningDate} 
                            icon={<Calendar size={18} />} 
                         />
                         <InfoItem 
                            label="Location" 
                            value={staffDetails.address} 
                            icon={<MapPin size={18} />} 
                         />
                    </div>
                </div>

            </div>

            {/* Right Column: Quick Stats or Status */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4">Account Status</h4>
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-sm font-bold text-emerald-700">Active Status</span>
                    </div>
                     <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <Shield size={16} className="text-indigo-600" />
                        <span className="text-sm font-bold text-indigo-700">Admin Privileges</span>
                    </div>
                </div>

                 <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] shadow-lg text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-2">Security</h4>
                        <p className="font-bold text-lg mb-4">Last Login: Today</p>
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors">
                            Change Password
                        </button>
                    </div>
                    {/* Decor */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl"></div>
                </div>
            </div>
        </div>
    </div>
  );
}

function InfoItem({ label, value, icon }: any) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                <p className="font-bold text-slate-800">{value || "N/A"}</p>
            </div>
        </div>
    )
}
