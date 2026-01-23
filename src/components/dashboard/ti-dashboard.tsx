'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { AppUser, Ticket } from '@/lib/types';
import { TicketList } from '@/components/tickets/ticket-list';
import { StatsCard } from './stats-card';
import { Circle, GanttChart, CheckCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface TiDashboardProps {
  user: AppUser;
}

export function TiDashboard({ user }: TiDashboardProps) {
  const firestore = useFirestore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = {
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  const isSupport = user.role === 'ti' || user.role === 'admin';

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;

    if (isSupport) {
      // TI and Admin users can see all tickets
      return query(collection(firestore, 'tickets'));
    }
    // Regular users are scoped to their own tickets.
    return query(collection(firestore, 'tickets'), where('userId', '==', user.uid));
  }, [firestore, user, isSupport]);


  useEffect(() => {
    if (!ticketsQuery) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (querySnapshot) => {
        const allTickets = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ticket));
        // Sort tickets by creation date, newest first.
        allTickets.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setTickets(allTickets);
        setLoading(false);
      },
      (err) => {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: 'tickets',
        });
        errorEmitter.emit('permission-error', contextualError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ticketsQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold">Painel de Controle TI</h1>
        <p className="text-muted-foreground">
          {isSupport
            ? 'Visão geral de todos os chamados do sistema.'
            : 'Visão geral dos seus chamados criados.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Abertos" value={loading ? <Skeleton className="h-8 w-12" /> : stats.open} icon={Circle} />
        <StatsCard
          title="Em Atendimento"
          value={loading ? <Skeleton className="h-8 w-12" /> : stats.inProgress}
          icon={GanttChart}
        />
        <StatsCard
          title="Resolvidos"
          value={loading ? <Skeleton className="h-8 w-12" /> : stats.resolved}
          icon={CheckCircle}
        />
      </div>

      <div>
        <h2 className="text-xl font-headline font-semibold mb-4">
          {isSupport ? 'Todos os Chamados' : 'Meus Chamados Criados'}
        </h2>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <TicketList tickets={tickets} />
        )}
      </div>
    </div>
  );
}
