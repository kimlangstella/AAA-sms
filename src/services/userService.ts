import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppUser, UserRole } from "@/lib/types";

const COLLECTION_NAME = "users";

export const userService = {
    async createProxyProfile(uid: string, email: string, role: UserRole, name?: string) {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const profile: AppUser = {
            uid,
            email,
            role,
            name,
            createdAt: new Date().toISOString()
        };
        await setDoc(userRef, profile);
        return profile;
    },

    async updateRole(uid: string, role: UserRole) {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(userRef, { role });
    },

    async deleteProfile(uid: string) {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await deleteDoc(userRef);
    },

    subscribeToUsers(callback: (users: AppUser[]) => void) {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ ...doc.data() } as AppUser));
            callback(users);
        });
    },

    async getAllUsers(): Promise<AppUser[]> {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data() } as AppUser));
    }
};
