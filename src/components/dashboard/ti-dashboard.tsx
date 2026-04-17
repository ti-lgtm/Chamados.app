'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { AppUser, Ticket } from '@/lib/types';
import { TicketList } from '@/components/tickets/ticket-list';
import { StatsCard } from './stats-card';
import { Circle as CircleIcon, GanttChart, CheckCircle, Search, User } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TiDashboardProps {
  user: AppUser;
}

export function TiDashboard({ user }: TiDashboardProps) {
  const firestore = useFirestore();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const prevTicketsRef = useRef<Ticket[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // The sound is from a reliable open-source assets library.
    audioRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const stats = useMemo(() => {
    const open = allTickets.filter((t) => t.status === 'open').length;
    const inProgress = allTickets.filter((t) => t.status === 'in_progress').length;
    const awaitingUser = allTickets.filter((t) => t.status === 'awaiting_user').length;
    const awaitingSupport = allTickets.filter((t) => t.status === 'awaiting_support').length;
    const resolved = allTickets.filter((t) => t.status === 'resolved').length;
    const myTickets = allTickets.filter((t) => t.assignedTo === user.uid).length;
    const totalInProgress = inProgress + awaitingUser + awaitingSupport;
    return { open, inProgress, resolved, myTickets, awaitingUser, awaitingSupport, totalInProgress };
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
    let tickets = [...allTickets];
    
    if (searchTerm.trim()) {
        const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
        tickets = tickets.filter(ticket =>
            ticket.title.toLowerCase().includes(lowercasedSearchTerm) ||
            String(ticket.ticketNumber).includes(lowercasedSearchTerm) ||
            (ticket.userName && ticket.userName.toLowerCase().includes(lowercasedSearchTerm)) ||
            (ticket.assignedUserName && ticket.assignedUserName.toLowerCase().includes(lowercasedSearchTerm))
        );
    }

    let statusFilteredTickets;
    if (statusFilter === 'all') {
      statusFilteredTickets = tickets;
    } else if (statusFilter === 'mine') {
        statusFilteredTickets = tickets.filter(ticket => ticket.assignedTo === user.uid);
    } else {
        statusFilteredTickets = tickets.filter(ticket => ticket.status === statusFilter);
    }
    
    return statusFilteredTickets.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        if (sortBy === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

  }, [allTickets, statusFilter, searchTerm, user.uid, sortBy]);

  return (
    <div className="space-y-6">
      { user.role === 'ti' && (
        <div>
            <p className="text-muted-foreground">
                Visão geral de todos os chamados do sistema.
            </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Meus Chamados" value={loading ? <Skeleton className="h-8 w-12" /> : stats.myTickets} icon={User} />
        <StatsCard title="Abertos" value={loading ? <Skeleton className="h-8 w-12" /> : stats.open} icon={CircleIcon} />
        <StatsCard
          title="Total em Atendimento"
          value={loading ? <Skeleton className="h-8 w-12" /> : stats.totalInProgress}
          icon={GanttChart}
        />
        <StatsCard
          title="Resolvidos"
          value={loading ? <Skeleton className="h-8 w-12" /> : stats.resolved}
          icon={CheckCircle}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos ({loading ? '...' : allTickets.length})</SelectItem>
                        <SelectItem value="mine">Meus Chamados ({loading ? '...' : stats.myTickets})</SelectItem>
                        <SelectItem value="open">Abertos ({loading ? '...' : stats.open})</SelectItem>
                        <SelectItem value="in_progress">Em Atendimento ({loading ? '...' : stats.inProgress})</SelectItem>
                        <SelectItem value="awaiting_user">Aguardando Usuário ({loading ? '...' : stats.awaitingUser})</SelectItem>
                        <SelectItem value="awaiting_support">Aguardando Suporte ({loading ? '...' : stats.awaitingSupport})</SelectItem>
                        <SelectItem value="resolved">Resolvidos ({loading ? '...' : stats.resolved})</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Mais recentes</SelectItem>
                        <SelectItem value="oldest">Mais antigos</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="relative w-full sm:w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Pesquisar por nº, título, solicitante ou responsável..."
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
