'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { AppUser, Ticket } from '@/lib/types';
import { TicketList } from '@/components/tickets/ticket-list';
import { StatsCard } from './stats-card';
import { Circle, GanttChart, CheckCircle, Search } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface TiDashboardProps {
  user: AppUser;
}

export function TiDashboard({ user }: TiDashboardProps) {
  const firestore = useFirestore();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => ({
    open: allTickets.filter((t) => t.status === 'open').length,
    inProgress: allTickets.filter((t) => t.status === 'in_progress').length,
    resolved: allTickets.filter((t) => t.status === 'resolved').length,
  }), [allTickets]);

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tickets'));
  }, [firestore]);


  useEffect(() => {
    if (!ticketsQuery) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (querySnapshot) => {
        const ticketsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ticket));
        ticketsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setAllTickets(ticketsData);
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

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;
    
    if (statusFilter !== 'all') {
      tickets = tickets.filter(ticket => ticket.status === statusFilter);
    }
    
    if (searchTerm.trim()) {
        const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
        tickets = tickets.filter(ticket =>
            ticket.title.toLowerCase().includes(lowercasedSearchTerm) ||
            String(ticket.ticketNumber).includes(lowercasedSearchTerm)
        );
    }

    return tickets;
  }, [allTickets, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      { user.role === 'ti' && (
        <div>
            <h1 className="text-2xl font-headline font-bold">Painel de Controle TI</h1>
            <p className="text-muted-foreground">
                Visão geral de todos os chamados do sistema.
            </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Tabs defaultValue="in_progress" onValueChange={setStatusFilter} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="open">Abertos</TabsTrigger>
                    <TabsTrigger value="in_progress">Em Atend.</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Pesquisar por nº ou título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <TicketList tickets={filteredTickets} />
        )}
      </div>
    </div>
  );
}
