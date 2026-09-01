
'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { AppUser, Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TicketList } from '@/components/tickets/ticket-list';
import { TicketDetailsClient } from '@/components/tickets/ticket-details-client';
import { PlusCircle, Star, Search, ShoppingCart, TicketIcon, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectGroup, 
    SelectItem, 
    SelectLabel, 
    SelectSeparator, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '../ui/scroll-area';

interface UserDashboardProps {
  user: AppUser;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const firestore = useFirestore();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

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

  const departments = useMemo(() => {
    const deps = new Set(allTickets.map(t => t.department).filter(Boolean));
    return Array.from(deps).sort();
  }, [allTickets]);

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
    
    if (statusFilter === 'purchases') {
        tickets = tickets.filter(ticket => ticket.type === 'purchase');
    } else if (statusFilter === 'all') {
        // Trata chamados legados (sem type) como suporte
        tickets = tickets.filter(ticket => ticket.type !== 'purchase');
    } else {
        const isPurchaseStatus = ['in_quotation', 'purchased', 'delivered'].includes(statusFilter);
        tickets = tickets.filter(ticket => 
            ticket.status === statusFilter && 
            (isPurchaseStatus ? ticket.type === 'purchase' : ticket.type !== 'purchase')
        );
    }

    if (departmentFilter !== 'all') {
      tickets = tickets.filter(t => t.department === departmentFilter);
    }

    return tickets.sort((a, b) => {
        if (sortBy === 'status') {
            const statusOrder = { 
                'in_progress': 1, 
                'in_quotation': 1,
                'purchased': 1,
                'awaiting_support': 1, 
                'open': 2, 
                'awaiting_user': 3, 
                'resolved': 4,
                'delivered': 4 
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

  }, [allTickets, statusFilter, searchTerm, sortBy, departmentFilter]);

  const unratedTickets = useMemo(() => {
    return allTickets.filter(ticket => (ticket.status === 'resolved' || ticket.status === 'delivered') && !ticket.rating);
  }, [allTickets]);

  const selectedTicket = useMemo(() => {
    return allTickets.find(t => t.id === selectedTicketId) || null;
  }, [allTickets, selectedTicketId]);

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
                      <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectGroup>
                          <SelectLabel>Geral</SelectLabel>
                          <SelectItem value="all">Todos os Chamados</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                          <SelectLabel>Suporte</SelectLabel>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="in_progress">Em Atendimento</SelectItem>
                          <SelectItem value="awaiting_user">Aguardando Você</SelectItem>
                          <SelectItem value="awaiting_support">Aguardando Suporte</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                          <SelectLabel>Compras</SelectLabel>
                          <SelectItem value="purchases">Todas as Compras</SelectItem>
                          <SelectItem value="in_quotation">Em Cotação</SelectItem>
                          <SelectItem value="purchased">Comprado</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                      </SelectGroup>
                  </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <div className="flex items-center gap-2">
                        <Filter className="h-3 w-3 text-muted-foreground" />
                        <SelectValue placeholder="Setor" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Setores</SelectItem>
                    {departments.map(dep => (
                        <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Ordenar" />
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
                      placeholder="Pesquisar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-10"
                  />
              </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
            <div className="lg:col-span-4 xl:col-span-3">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                    <ScrollArea className="h-[750px] overflow-hidden">
                        <TicketList 
                            tickets={filteredTickets} 
                            selectedId={selectedTicketId}
                            onSelect={setSelectedTicketId}
                        />
                    </ScrollArea>
                )}
            </div>
            
            <div className="hidden lg:block lg:col-span-8 xl:col-span-9 bg-muted/20 rounded-xl border border-dashed p-1 min-h-[750px] overflow-hidden">
                {selectedTicket ? (
                    <ScrollArea className="h-[750px]">
                        <div className="p-4">
                            <TicketDetailsClient initialTicket={selectedTicket} isPreview />
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <div className="bg-muted p-6 rounded-full mb-4">
                            <TicketIcon className="h-10 w-10 opacity-20" />
                        </div>
                        <h3 className="text-lg font-bold font-headline">Selecione um registro</h3>
                        <p className="text-sm">Seus chamados e compras aparecerão aqui para leitura rápida.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
