
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
    // Se o estado inicial do Firebase Auth ainda estiver carregando, mantemos o estado de loading.
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Se não há usuário autenticado no Firebase, paramos o carregamento e limpamos o usuário.
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Se temos usuário mas o Firestore ainda não está disponível, aguardamos.
    if (!firestore || !firebaseAuth) {
        return;
    }

    // Inscreve-se para mudanças no documento de perfil do usuário no Firestore.
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as AppUser;
        
        // Verifica se a conta está suspensa.
        if (userData.status === 'suspended') {
            toast({
                title: "Conta Suspensa",
                description: "Sua conta foi suspensa. Entre em contato com o administrador.",
                variant: "destructive"
            });
            signOut(firebaseAuth);
            setUser(null);
        } else {
            // Sucesso: atualiza o estado local com os dados do Firestore.
            setUser({
              uid: firebaseUser.uid,
              ...userData
            });
        }
      } else {
        // Se o documento não existe, NÃO deslogamos o usuário do Firebase Auth.
        // Isso evita deslogues em massa por erros de rede ou atrasos na criação do documento.
        // O layout ou as páginas tratarão o estado user=null redirecionando se necessário.
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
        // Em caso de erro de permissão ou rede, apenas registramos no console.
        // Não forçamos o logout para não quebrar a sessão por falhas temporárias.
        console.error("Error fetching user document in useAuth:", error);
        setUser(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, authLoading, firestore, firebaseAuth, toast]);

  return { user, loading };
};
