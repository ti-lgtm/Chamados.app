'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { AppUser, Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TicketList } from '@/components/tickets/ticket-list';
import { PlusCircle, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserDashboardProps {
  user: AppUser;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const firestore = useFirestore();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');

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
        userTickets.sort((a, b) => (b.createdAt.toMillis() || 0) - (a.createdAt.toMillis() || 0));
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
    if (statusFilter === 'all') {
      return allTickets;
    }
    return allTickets.filter(ticket => ticket.status === statusFilter);
  }, [allTickets, statusFilter]);

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
        <Tabs defaultValue="open" onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="open">Abertos</TabsTrigger>
                <TabsTrigger value="in_progress">Em Atend.</TabsTrigger>
                <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
            </TabsList>
        </Tabs>

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
