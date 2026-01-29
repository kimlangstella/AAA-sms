import { db } from "@/lib/firebase";
import { Branch } from "@/lib/types";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore";

const COLLECTION_NAME = "branches";

export const branchService = {
    // Get all branches
    getAll: async (): Promise<Branch[]> => {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("branch_name"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                branch_id: doc.id,
                ...doc.data(),
            })) as Branch[];
        } catch (error) {
            console.error("Error fetching branches:", error);
            return [];
        }
    },

    // Create a new branch
    create: async (data: Omit<Branch, "branch_id">): Promise<string> => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
            return docRef.id;
        } catch (error) {
            console.error("Error creating branch:", error);
            throw error;
        }
    },

    // Update a branch
    update: async (branch_id: string, data: Partial<Branch>) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, branch_id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating branch:", error);
            throw error;
        }
    },

    // Delete a branch
    delete: async (branch_id: string) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, branch_id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting branch:", error);
            throw error;
        }
    },

    // Subscribe to real-time changes
    subscribe: (callback: (branches: Branch[]) => void) => {
        const q = query(collection(db, COLLECTION_NAME), orderBy("branch_name"));
        return onSnapshot(q, (snapshot) => {
            const branches = snapshot.docs.map((doc) => ({
                branch_id: doc.id,
                ...doc.data(),
            })) as Branch[];
            callback(branches);
        }, (error) => {
            console.error("Error subscribing to branches:", error);
        });
    }
};
