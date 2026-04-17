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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserDashboardProps {
  user: AppUser;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const firestore = useFirestore();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
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

  const filteredTickets = useMemo(() => {
    let tickets = [...allTickets]; 

    if (searchTerm.trim()) {
      const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
      tickets = tickets.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(lowercasedSearchTerm) ||
          String(ticket.ticketNumber).includes(lowercasedSearchTerm) ||
          (ticket.assignedUserName && ticket.assignedUserName.toLowerCase().includes(lowercasedSearchTerm))
      );
    }
    
    if (statusFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.status === statusFilter);
    }

    return tickets.sort((a, b) => {
        if (sortBy === 'status') {
            const statusOrder = { 
                'in_progress': 1, 
                'awaiting_support': 1, 
                'open': 2, 
                'awaiting_user': 3, 
                'resolved': 4 
            };
            const statusA = statusOrder[a.status as keyof typeof statusOrder] || 99;
            const statusB = statusOrder[b.status as keyof typeof statusOrder] || 99;

            if (statusA !== statusB) {
                return statusA - statusB;
            }
        }

        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        if (sortBy === 'oldest') {
            return dateA - dateB;
        }
        return dateB - dateA; // 'newest' is default
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
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em Atendimento</SelectItem>
                      <SelectItem value="awaiting_user">Aguardando Você</SelectItem>
                      <SelectItem value="awaiting_support">Aguardando Suporte</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="newest">Mais recentes</SelectItem>
                      <SelectItem value="oldest">Mais antigos</SelectItem>
                      <SelectItem value="status">Em atendimento primeiro</SelectItem>
                  </SelectContent>
              </Select>
            </div>
             <div className="relative w-full sm:w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Pesquisar por nº, título ou responsável..."
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
