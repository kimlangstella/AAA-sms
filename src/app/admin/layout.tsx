"use client";

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  HelpCircle,
  LogOut,
  ChevronDown,
  Search,
  Settings,
  Plus
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/lib/useAuth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sidebar } from '@/components/layout/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 rounded-full border-t-transparent"></div></div>;
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      {/* Sidebar Component - Responsive */}
      <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content - Pushed right by sidebar width on Desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-72 transition-all duration-300">
        
        {/* Header */}
        <header className="h-24 px-6 md:px-10 flex items-center justify-between sticky top-0 z-20 bg-[#F3F4F6]/80 backdrop-blur-md">
          
          <div className="flex items-center gap-4 flex-1">
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200"
              >
                  <Menu size={20} />
              </button>
              
              {/* Search Bar */}
              {/* <div className="flex items-center w-full max-w-md px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500 transition-all">
                  <Search size={14} className="text-slate-400" />
                  <div className="w-px h-3 mx-2 bg-slate-200" />
                  <input 
                      type="text" 
                      placeholder="Search..." 
                      className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 p-0"
                  />
              </div> */}
          </div>

          <div className="flex items-center gap-3 md:gap-4">
             <button className="relative p-3 bg-white text-slate-400 hover:text-indigo-600 transition hover:shadow-lg hover:shadow-indigo-100 rounded-2xl border-2 border-slate-50 hover:border-white group">
                <Bell size={20} className="group-hover:animate-pulse" />
                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
             </button>
             <UserProfile />
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 px-4 md:px-10 pb-10 relative">
           <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
}

function UserProfile() {
  const { user, profile } = useAuth();

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <div 
      className="flex items-center gap-3 p-1.5 pr-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white transition-all group select-none"
    >
      <div className="relative w-10 h-10">
        <div className="w-full h-full rounded-xl bg-slate-100 overflow-hidden border-2 border-white flex items-center justify-center text-slate-400 shadow-sm relative z-10">
             {user?.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
             ) : (
                <User size={20} className="text-slate-400" />
             )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full z-20"></div>
      </div>
      
      <div className="hidden sm:block text-left">
          <p className="text-xs font-black text-slate-800 leading-none group-hover:text-slate-900 transition-colors uppercase tracking-tight">{displayName}</p>
      </div>
    </div>
  );
}
