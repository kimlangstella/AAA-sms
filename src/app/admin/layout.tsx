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
              <div className="flex items-center w-full max-w-md px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500 transition-all">
                  <Search size={14} className="text-slate-400" />
                  <div className="w-px h-3 mx-2 bg-slate-200" />
                  <input 
                      type="text" 
                      placeholder="Search..." 
                      className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 p-0"
                  />
              </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
             <button className="relative p-3 bg-white text-slate-400 hover:text-indigo-600 transition hover:shadow-lg hover:shadow-indigo-100 rounded-2xl border-2 border-slate-50 hover:border-white group">
                <Bell size={20} className="group-hover:animate-pulse" />
                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
             </button>
             <ProfileDropdown />
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 px-6 md:px-10 pb-10 relative">
           <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
}

function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setIsOpen(false);
    router.replace("/login");
  };

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-12 h-12 rounded-2xl transition-all duration-300 ${isOpen ? 'ring-4 ring-indigo-100 shadow-lg' : 'hover:shadow-md hover:scale-105 active:scale-95'}`}
      >
        <div className="w-full h-full rounded-2xl bg-slate-100 overflow-hidden border-2 border-white flex items-center justify-center text-slate-400 shadow-sm">
             {user?.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
             )}
        </div>
        
        {/* Status Indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute right-0 top-full mt-4 w-72 bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] border border-white/50 p-2 z-50 transform transition-all duration-300 origin-top-right ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
      >
           <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-[1.5rem] mb-2 border border-indigo-100/50">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-xs uppercase">
                    {displayName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">{displayName}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{user?.email}</p>
                </div>
             </div>
           </div>
           
           <div className="space-y-1 px-1">
               <Link 
                  href="/admin/profile" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 text-sm font-bold text-slate-600 transition-colors group"
               >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm flex items-center justify-center transition-all">
                        <User size={16} /> 
                    </div>
                    <span>My Profile</span>
               </Link>
               <Link 
                  href="/admin/settings" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 text-sm font-bold text-slate-600 transition-colors group"
               >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm flex items-center justify-center transition-all">
                        <Settings size={16} /> 
                    </div>
                    <span>Settings</span>
               </Link>
               
               <div className="h-px bg-slate-100 my-1 mx-2"></div>

               <button 
                  onClick={handleSignOut} 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50 text-sm font-bold text-slate-600 hover:text-rose-600 transition-colors text-left group"
               >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-rose-500 group-hover:shadow-sm flex items-center justify-center transition-all">
                        <LogOut size={16} /> 
                    </div>
                    <span>Sign Out</span>
               </button>
           </div>
      </div>
    </div>
  );
}
