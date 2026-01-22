"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { useToast } from './use-toast';

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

export const useAuth = (): AuthContextType => {
  const { user: firebaseUser, isUserLoading: authLoading } = useUser();
  const firestore = useFirestore();
  const firebaseAuth = useFirebaseAuth();
  const { toast } = useToast();
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
        const userData = docSnap.data() as AppUser;
        if (userData.status === 'suspended') {
            toast({
                title: "Conta Suspensa",
                description: "Sua conta foi suspensa. Entre em contato com o administrador.",
                variant: "destructive"
            });
            signOut(firebaseAuth);
            setUser(null);
        } else {
            setUser({
              uid: firebaseUser.uid,
              ...userData
            });
        }
      } else {
        // This can happen if the user exists in Auth but not in Firestore.
        // The login/signup flow should handle creating the doc, but as a fallback,
        // we sign them out to prevent being in a broken state.
        signOut(firebaseAuth);
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching user document in useAuth:", error);
        setUser(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, authLoading, firestore, firebaseAuth, toast]);

  return { user, loading };
};
