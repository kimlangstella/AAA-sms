"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex relative transition-all duration-300">
      {/* Mobile Menu Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar - Mobile Responsive Wrapper */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out md:relative
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}
        md:translate-x-0
      `}>
         <Sidebar isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className="flex-1 transition-all duration-300 w-full min-w-0">
         {/* Desktop Sidebar Toggle - Floating or in Header */}
         <div className="hidden md:flex items-center p-4 pb-0">
            <button
               onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
               className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
               {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
         </div>

        <main className={`w-full mx-auto animate-fade-in-up p-4 pt-4 md:p-8 transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
           {children}
        </main>
      </div>    
    </div>
  );
}
