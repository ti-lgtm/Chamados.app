'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { getSdks } from '@/firebase';

type FirebaseServices = ReturnType<typeof getSdks>;

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    // It's safe to access window and process.env here.
    setFirebaseServices(initializeFirebase());
  }, []);

  // During SSR and initial client render before useEffect, firebaseServices is null.
  // We pass nulls to the provider, which will handle them.
  return (
    <FirebaseProvider
      firebaseApp={firebaseServices?.firebaseApp}
      auth={firebaseServices?.auth}
      firestore={firebaseServices?.firestore}
      storage={firebaseServices?.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
