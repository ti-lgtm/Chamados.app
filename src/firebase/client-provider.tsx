'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { getSdks } from '@/firebase';
import { firebaseConfig } from './config';
import { Loader2 } from 'lucide-react';

type FirebaseServices = ReturnType<typeof getSdks>;

const ConfigError = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
        <div className="max-w-2xl text-center border border-destructive/50 bg-destructive/10 p-8 rounded-lg">
            <h1 className="text-2xl font-bold text-destructive mb-4">Erro de Configuração do Firebase</h1>
            <p className="text-destructive/90 mb-2">
                Uma ou mais variáveis de ambiente essenciais do Firebase não estão definidas.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
                Por favor, siga os passos no arquivo <code className="bg-muted px-2 py-1 rounded-sm">.env.local.example</code> para configurar seu arquivo <code className="bg-muted px-2 py-1 rounded-sm">.env.local</code>. Se estiver fazendo o deploy na Vercel, certifique-se de que as variáveis de ambiente também foram adicionadas nas configurações do projeto.
            </p>
            <div className="text-left text-sm bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2">Variáveis Necessárias:</h3>
                <ul className="list-disc list-inside">
                    <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                    <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                    <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
                </ul>
            </div>
        </div>
    </div>
);

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null); // null = checking, true = ok, false = error

  useEffect(() => {
    // This effect runs only on the client, so process.env is available
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        setIsConfigured(false);
    } else {
        setIsConfigured(true);
        setFirebaseServices(initializeFirebase());
    }
  }, []);

  if (isConfigured === false) {
    return <ConfigError />;
  }
  
  // While checking config, you can show a loader, or nothing
  if (isConfigured === null) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

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
