'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { AppUser, Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TicketList } from '@/components/tickets/ticket-list';
import { PlusCircle, Star, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserDashboardProps {
  user: AppUser;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const firestore = useFirestore();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const ticketsQuery = useMemoFirebase(
    () =>
      firestore && user.uid
        ? query(collection(firestore, 'tickets'), where('userId', '==', user.uid))
        : null,
    [firestore, user.uid]
  );

  useEffect(() => {
    if (!ticketsQuery) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (querySnapshot) => {
        const userTickets = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ticket));
        setAllTickets(userTickets);
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

  const stats = useMemo(() => {
    const open = allTickets.filter((t) => t.status === 'open').length;
    const inProgress = allTickets.filter((t) => ['in_progress', 'awaiting_user', 'awaiting_support'].includes(t.status)).length;
    const resolved = allTickets.filter((t) => t.status === 'resolved').length;
    return { open, inProgress, resolved };
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    let tickets = [...allTickets]; // Create a new array to avoid mutating the original

    if (searchTerm.trim()) {
      const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
      tickets = tickets.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(lowercasedSearchTerm) ||
          String(ticket.ticketNumber).includes(lowercasedSearchTerm) ||
          (ticket.assignedUserName && ticket.assignedUserName.toLowerCase().includes(lowercasedSearchTerm))
      );
    }
    
    let statusFilteredTickets;
    switch (statusFilter) {
      case 'open':
        statusFilteredTickets = tickets.filter((ticket) => ticket.status === 'open');
        break;
      case 'in_progress':
        statusFilteredTickets = tickets.filter((ticket) =>
          ['in_progress', 'awaiting_user', 'awaiting_support'].includes(ticket.status)
        );
        break;
      case 'resolved':
        statusFilteredTickets = tickets.filter((ticket) => ticket.status === 'resolved');
        break;
      case 'all':
      default:
        statusFilteredTickets = tickets;
        break;
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

  }, [allTickets, statusFilter, searchTerm, sortBy]);

  const unratedTickets = useMemo(() => {
    return allTickets.filter(ticket => ticket.status === 'resolved' && !ticket.rating);
  }, [allTickets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold">Seus Chamados</h1>
          <p className="text-muted-foreground">Veja e gerencie os chamados que você abriu.</p>
        </div>
        {unratedTickets.length > 0 ? (
            <Button asChild variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 hover:text-primary animate-pulse">
                <Link href={`/tickets/new`}>
                    <Star className="mr-2 h-4 w-4" />
                    Avaliar {unratedTickets.length} chamado{unratedTickets.length > 1 ? 's' : ''} pendente{unratedTickets.length > 1 ? 's' : ''}
                </Link>
            </Button>
        ) : (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/tickets/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Chamado
              </Link>
            </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Tabs defaultValue="in_progress" onValueChange={setStatusFilter} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="all">Todos ({loading ? '...' : allTickets.length})</TabsTrigger>
                    <TabsTrigger value="open">Abertos ({loading ? '...' : stats.open})</TabsTrigger>
                    <TabsTrigger value="in_progress">Em Atend. ({loading ? '...' : stats.inProgress})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidos ({loading ? '...' : stats.resolved})</TabsTrigger>
                </TabsList>
            </Tabs>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Pesquisar por nº, título ou responsável..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                  />
              </div>
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
