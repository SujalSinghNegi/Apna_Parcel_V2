"use client";

import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setLoading } = useAuthStore() as any;

  useEffect(() => {
    setLoading(true);
    
    // This listener fires automatically whenever the user logs in, logs out, or refreshes the page
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Get the custom profile data (name, userType, etc.) from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = { uid: firebaseUser.uid, ...userDoc.data() };
            const token = await firebaseUser.getIdToken();
            
            // 2. Save it to your global Zustand store
            setAuth(userData, token, null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          clearAuth();
        }
      } else {
        // User is fully logged out
        clearAuth();
      }
      setLoading(false);
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, [setAuth, clearAuth, setLoading]);

  return <>{children}</>;
}