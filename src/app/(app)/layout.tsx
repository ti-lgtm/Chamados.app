
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/layout/header';
import { Loader2 } from 'lucide-react';
import { useScheduledTicketsRunner } from '@/hooks/useScheduledTicketsRunner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Inicia o executor de chamados automáticos (apenas para TI/Admin)
  useScheduledTicketsRunner(user);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background print:bg-white">
      <AppHeader />
      <main className="flex-1 p-4 sm:px-6 sm:py-4 md:gap-8 print:block print:p-0">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground w-full">
        Desenvolvido por Thulio Costa e AMLMF com Firebase Studio
      </footer>
    </div>
  );
}
