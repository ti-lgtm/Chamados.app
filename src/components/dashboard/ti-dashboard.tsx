'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  const prevTicketsRef = useRef<Ticket[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // The sound is from a reliable open-source assets library.
    audioRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const stats = useMemo(() => {
    const open = allTickets.filter((t) => t.status === 'open').length;
    const inProgress = allTickets.filter((t) => ['in_progress', 'awaiting_user', 'awaiting_support'].includes(t.status)).length;
    const resolved = allTickets.filter((t) => t.status === 'resolved').length;
    const myTickets = allTickets.filter((t) => t.assignedTo === user.uid).length;
    return { open, inProgress, resolved, myTickets };
  }, [allTickets, user.uid]);

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

  useEffect(() => {
    if (prevTicketsRef.current.length > 0 && allTickets.length > prevTicketsRef.current.length) {
        const newTickets = allTickets.filter(
            (t) => !prevTicketsRef.current.some((pt) => pt.id === t.id)
        );

        if (newTickets.length > 0 && audioRef.current) {
            audioRef.current.play().catch(e => {
                console.warn("A reprodução do som de notificação foi bloqueada pelo navegador. Interaja com a página para ativar o som.", e);
            });
        }
    }
    prevTicketsRef.current = allTickets;
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;
    
    if (statusFilter === 'mine') {
      tickets = tickets.filter(ticket => ticket.assignedTo === user.uid);
    } else if (statusFilter !== 'all') {
      if (statusFilter === 'in_progress') {
        tickets = tickets.filter(ticket => ['in_progress', 'awaiting_user', 'awaiting_support'].includes(ticket.status));
      } else {
        tickets = tickets.filter(ticket => ticket.status === statusFilter);
      }
    }
    
    if (searchTerm.trim()) {
        const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
        tickets = tickets.filter(ticket =>
            ticket.title.toLowerCase().includes(lowercasedSearchTerm) ||
            String(ticket.ticketNumber).includes(lowercasedSearchTerm) ||
            (ticket.userName && ticket.userName.toLowerCase().includes(lowercasedSearchTerm))
        );
    }

    return tickets;
  }, [allTickets, statusFilter, searchTerm, user.uid]);

  return (
    <div className="space-y-6">
      { user.role === 'ti' && (
        <div>
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
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
                    <TabsTrigger value="all">Todos ({loading ? '...' : allTickets.length})</TabsTrigger>
                    <TabsTrigger value="mine">Meus Chamados ({loading ? '...' : stats.myTickets})</TabsTrigger>
                    <TabsTrigger value="open">Abertos ({loading ? '...' : stats.open})</TabsTrigger>
                    <TabsTrigger value="in_progress">Em Atend. ({loading ? '...' : stats.inProgress})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidos ({loading ? '...' : stats.resolved})</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Pesquisar por nº, título ou solicitante..."
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
