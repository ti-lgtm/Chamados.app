"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

export const useAuth = (): AuthContextType => {
  const { user: firebaseUser, isUserLoading: authLoading } = useUser();
  const firestore = useFirestore();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (!firestore) {
        return;
    }

    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUser({
          uid: firebaseUser.uid,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          createdAt: userData.createdAt,
          avatarUrl: userData.avatarUrl
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching user document in useAuth:", error);
        setUser(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, authLoading, firestore]);

  return { user, loading };
};
