import { db } from "@/lib/firebase";
import { Program } from "@/lib/types";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, where } from "firebase/firestore";

const COLLECTION_NAME = "programs";

export const programService = {
    // Get all programs
    getAll: async (branchId?: string): Promise<any[]> => {
        try {
            let q = query(collection(db, COLLECTION_NAME), orderBy("name"));
            if (branchId) {
                q = query(collection(db, COLLECTION_NAME), where("branchId", "==", branchId), orderBy("name"));
            }
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        } catch (error) {
            console.error("Error fetching programs:", error);
            return [];
        }
    },

    // Create a new program
    create: async (data: any): Promise<string> => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
            return docRef.id;
        } catch (error) {
            console.error("Error creating program:", error);
            throw error;
        }
    },

    // Subscribe to real-time changes
    subscribe: (callback: (programs: any[]) => void, branchId?: string) => {
        let q = query(collection(db, COLLECTION_NAME), orderBy("name"));
        if (branchId) {
            q = query(collection(db, COLLECTION_NAME), where("branchId", "==", branchId), orderBy("name"));
        }
        return onSnapshot(q, (snapshot) => {
            const programs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            callback(programs);
        }, (error) => {
            console.error("Error subscribing to programs:", error);
        });
    }
};
