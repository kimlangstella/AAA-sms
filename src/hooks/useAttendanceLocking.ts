import { useState, useCallback } from 'react';
import { Attendance } from '@/lib/types';

export function useAttendanceLocking() {
    // Map of ClassID -> SessionNumber -> Boolean
    const [lockedSessions, setLockedSessions] = useState<Record<string, Record<number, boolean>>>({});

    // Initialize locks based on attendance data
    // This should be called when attendance data is first loaded or significantly refreshed
    const initializeLocks = useCallback((classes: any[], allAttendance: Attendance[]) => {
        if (!allAttendance || allAttendance.length === 0) return;

        setLockedSessions(prev => {
            const newLocks: Record<string, Record<number, boolean>> = { ...prev };

            classes.forEach(cls => {
                const classAttendance = allAttendance.filter(a => a.class_id === cls.class_id);
                if (classAttendance.length > 0) {
                    if (!newLocks[cls.class_id]) {
                        newLocks[cls.class_id] = {};
                    }

                    const sessionsWithData = new Set(classAttendance.map(a => a.session_number));
                    sessionsWithData.forEach(num => {
                        // Only lock if we haven't explicitly set a state for it yet
                        // OR if we want to enforce auto-lock on load (which is the goal)
                        // Ideally we auto-lock only if it wasn't manually unlocked? 
                        // For now, let's strictly auto-lock on data presence to ensure safety.
                        if (newLocks[cls.class_id][num] === undefined) {
                            newLocks[cls.class_id][num] = true;
                        }
                    });
                }
            });
            return newLocks;
        });
    }, []);

    const toggleLock = useCallback((classId: string, sessionNumber: number) => {
        setLockedSessions(prev => ({
            ...prev,
            [classId]: {
                ...(prev[classId] || {}),
                [sessionNumber]: !prev[classId]?.[sessionNumber]
            }
        }));
    }, []);

    const isLocked = useCallback((classId: string, sessionNumber: number) => {
        return !!lockedSessions[classId]?.[sessionNumber];
    }, [lockedSessions]);

    return {
        lockedSessions,
        setLockedSessions, // Exposed for flexible updates if needed
        initializeLocks,
        toggleLock,
        isLocked
    };
}
