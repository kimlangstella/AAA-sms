"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2, Calendar, Clock, Users } from "lucide-react";
import { Term } from "@/lib/types";
import { termService } from "@/services/termService";
import { programService } from "@/services/programService";

export default function ClassesPage() {
    const router = useRouter();
    const params = useParams();
    const termId = params.term_id as string;
    const programId = params.program_id as string;

    const [term, setTerm] = useState<Term | null>(null);
    const [program, setProgram] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch term and program details
                const termData = await termService.getById(termId);
                setTerm(termData);

                // Fetch program
                const unsubPrograms = programService.subscribe((programs) => {
                    const prog = programs.find(p => p.id === programId);
                    setProgram(prog || null);
                });

                setLoading(false);

                return () => {
                    unsubPrograms();
                };
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, [termId, programId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass p-3 px-5 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <BookOpen size={16} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Classes</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            {term && <span>{term.term_name}</span>}
                            {program && (
                                <>
                                    <span>•</span>
                                    <span>{program.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PLACEHOLDER - Classes will be shown here */}
            <div className="glass-panel p-16 text-center">
                <BookOpen className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Classes for {program?.name}</h3>
                <p className="text-slate-400 text-sm mb-4">
                    This page will display all classes for {program?.name} in {term?.term_name}.
                </p>
                <p className="text-slate-400 text-xs">
                    Click on a class to view and mark attendance.
                </p>
            </div>
        </div>
    );
}
