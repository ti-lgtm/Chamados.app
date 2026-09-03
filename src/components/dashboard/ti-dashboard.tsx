'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from '@/firebase';
import type { AppUser, Ticket } from '@/lib/types';
import { TicketList } from '@/components/tickets/ticket-list';
import { TicketDetailsClient } from '@/components/tickets/ticket-details-client';
import { StatsCard } from './stats-card';
import {
  Circle as CircleIcon,
  GanttChart,
  CheckCircle,
  Search,
  User,
  ShoppingCart,
  TicketIcon,
  Filter,
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '../ui/scroll-area';

interface TiDashboardProps {
  user: AppUser;
}

export function TiDashboard({ user }: TiDashboardProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('my_in_progress');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('status');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const prevTicketsRef = useRef<Ticket[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Define o som a partir das configurações do usuário ou o padrão
  const notificationSoundUrl = user.notificationSoundUrl || 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3';

  useEffect(() => {
    audioRef.current = new Audio(notificationSoundUrl);
    audioRef.current.volume = 0.5;
  }, [notificationSoundUrl]);

  const stats = useMemo(() => {
    const openAll = allTickets.filter((t) => t.status === 'open');
    const openSupport = openAll.filter(t => t.type !== 'purchase').length;
    
    const inProgressSupport = allTickets.filter((t) => 
        t.type !== 'purchase' && 
        (t.status === 'in_progress' || t.status === 'awaiting_user' || t.status === 'awaiting_support')
    ).length;
    
    const activePurchases = allTickets.filter(t => t.type === 'purchase' && t.status !== 'delivered').length;
    const mySupportTickets = allTickets.filter((t) => t.type !== 'purchase' && t.assignedTo === user.uid).length;

    return {
      open: openSupport,
      inProgress: inProgressSupport,
      myTickets: mySupportTickets,
      totalPurchases: activePurchases,
    };
  }, [allTickets, user.uid]);

  const departments = useMemo(() => {
    const deps = new Set(allTickets.map(t => t.department).filter(Boolean));
    return Array.from(deps).sort();
  }, [allTickets]);

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
        const ticketsData = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Ticket)
        );

        if (
          !loading &&
          prevTicketsRef.current.length > 0 &&
          ticketsData.length > prevTicketsRef.current.length
        ) {
          const newTickets = ticketsData.filter(
            (t) => !prevTicketsRef.current.some((pt) => pt.id === t.id)
          );

          if (newTickets.length > 0) {
            const lastNewTicket = newTickets.sort(
              (a, b) =>
                (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
            )[0];
            
            if (audioRef.current) {
              audioRef.current.play().catch((e) => {
                if (e.name !== 'AbortError') {
                  console.warn(
                    'A reprodução do som de notificação foi bloqueada pelo navegador.',
                    e
                  );
                }
              });
            }

            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              const notification = new Notification('Novo chamado recebido!', {
                body: `#${lastNewTicket.ticketNumber} - ${lastNewTicket.title}`,
                icon: '/icon.svg',
                tag: lastNewTicket.id,
              });

              notification.onclick = () => {
                router.push(`/tickets/${lastNewTicket.id}`);
                window.focus();
              };
            }
          }
        }

        setAllTickets(ticketsData);
        prevTicketsRef.current = ticketsData;
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
  }, [ticketsQuery, loading, router]);

  const filteredTickets = useMemo(() => {
    let tickets = [...allTickets];

    if (searchTerm.trim()) {
      const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
      tickets = tickets.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(lowercasedSearchTerm) ||
          String(ticket.ticketNumber).includes(lowercasedSearchTerm) ||
          (ticket.userName &&
            ticket.userName.toLowerCase().includes(lowercasedSearchTerm)) ||
          (ticket.assignedUserName &&
            ticket.assignedUserName
              .toLowerCase()
              .includes(lowercasedSearchTerm))
      );
    }

    let statusFilteredTickets;
    switch (statusFilter) {
      case 'mine':
        statusFilteredTickets = tickets.filter(
          (ticket) => ticket.type !== 'purchase' && ticket.assignedTo === user.uid
        );
        break;
      case 'my_in_progress':
        statusFilteredTickets = tickets.filter(
          (ticket) =>
            ticket.assignedTo === user.uid &&
            ticket.type !== 'purchase' &&
            (ticket.status === 'in_progress' ||
              ticket.status === 'awaiting_user' ||
              ticket.status === 'awaiting_support')
        );
        break;
      case 'in_progress':
        statusFilteredTickets = tickets.filter(
          (ticket) =>
            ticket.type !== 'purchase' &&
            (ticket.status === 'in_progress' ||
             ticket.status === 'awaiting_user' ||
             ticket.status === 'awaiting_support')
        );
        break;
      case 'purchases':
        statusFilteredTickets = tickets.filter(
          (ticket) => ticket.type === 'purchase' && ticket.status !== 'delivered'
        );
        break;
      case 'open':
        statusFilteredTickets = tickets.filter(t => t.type !== 'purchase' && t.status === 'open');
        break;
      case 'in_quotation':
      case 'purchased':
      case 'delivered':
        statusFilteredTickets = tickets.filter(t => t.type === 'purchase' && t.status === statusFilter);
        break;
      case 'awaiting_user':
      case 'awaiting_support':
      case 'resolved':
        statusFilteredTickets = tickets.filter(t => t.type !== 'purchase' && t.status === statusFilter);
        break;
      default:
        statusFilteredTickets = tickets.filter(
          (ticket) => ticket.type !== 'purchase'
        );
        break;
    }

    if (departmentFilter !== 'all') {
      statusFilteredTickets = statusFilteredTickets.filter(t => t.department === departmentFilter);
    }

    return statusFilteredTickets.sort((a, b) => {
      if (sortBy === 'status') {
        const statusOrder = {
          in_progress: 1,
          in_quotation: 1,
          purchased: 1,
          awaiting_support: 1,
          open: 2,
          awaiting_user: 3,
          resolved: 4,
          delivered: 4,
        };
        const statusA =
          statusOrder[a.status as keyof typeof statusOrder] || 99;
        const statusB =
          statusOrder[b.status as keyof typeof statusOrder] || 99;

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
  }, [allTickets, statusFilter, searchTerm, user.uid, sortBy, departmentFilter]);

  const selectedTicket = useMemo(() => {
    return allTickets.find(t => t.id === selectedTicketId) || null;
  }, [allTickets, selectedTicketId]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Meus Chamados"
          value={loading ? <Skeleton className="h-6 w-10" /> : stats.myTickets}
          icon={User}
          onClick={() => { setStatusFilter('mine'); setDepartmentFilter('all'); }}
        />
        <StatsCard
          title="Chamados Abertos"
          value={loading ? <Skeleton className="h-6 w-10" /> : stats.open}
          icon={CircleIcon}
          variant={!loading && stats.open > 0 ? 'destructive' : 'default'}
          onClick={() => { setStatusFilter('open'); setDepartmentFilter('all'); }}
        />
        <StatsCard
          title="Atendimento"
          value={
            loading ? <Skeleton className="h-6 w-10" /> : stats.inProgress
          }
          icon={GanttChart}
          onClick={() => { setStatusFilter('in_progress'); setDepartmentFilter('all'); }}
        />
        <StatsCard
          title="Compras Ativas"
          value={loading ? <Skeleton className="h-6 w-10" /> : stats.totalPurchases}
          icon={ShoppingCart}
          onClick={() => { setStatusFilter('purchases'); setDepartmentFilter('all'); }}
        />
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                    <SelectLabel>Geral</SelectLabel>
                    <SelectItem value="my_in_progress" className="text-xs">Meus em Atendimento</SelectItem>
                    <SelectItem value="mine" className="text-xs">Meus Chamados (Histórico)</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>Suporte Técnico</SelectLabel>
                    <SelectItem value="open" className="text-xs">Abertos</SelectItem>
                    <SelectItem value="in_progress" className="text-xs">Em Atendimento</SelectItem>
                    <SelectItem value="awaiting_user" className="text-xs">Aguardando Usuário</SelectItem>
                    <SelectItem value="awaiting_support" className="text-xs">Aguardando Suporte</SelectItem>
                    <SelectItem value="resolved" className="text-xs">Resolvidos</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>Compras de TI</SelectLabel>
                    <SelectItem value="purchases" className="text-xs">Compras Ativas</SelectItem>
                    <SelectItem value="in_quotation" className="text-xs">Em Cotação</SelectItem>
                    <SelectItem value="purchased" className="text-xs">Comprado</SelectItem>
                    <SelectItem value="delivered" className="text-xs">Entregue</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3 text-muted-foreground" />
                    <SelectValue placeholder="Setor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os Setores</SelectItem>
                {departments.map(dep => (
                    <SelectItem key={dep} value={dep} className="text-xs">{dep}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs">Mais recentes</SelectItem>
                <SelectItem value="oldest" className="text-xs">Mais antigos</SelectItem>
                <SelectItem value="status" className="text-xs">Em atendimento primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
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
            
            <div className="hidden lg:block lg:col-span-8 xl:col-span-9 bg-muted/10 rounded-xl border border-dashed p-1 min-h-[750px] overflow-hidden">
                {selectedTicket ? (
                    <ScrollArea className="h-[750px]">
                        <div className="p-4">
                            <TicketDetailsClient initialTicket={selectedTicket} isPreview />
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <div className="bg-muted p-6 rounded-full mb-4">
                            <TicketIcon className="h-8 w-8 opacity-20" />
                        </div>
                        <h3 className="text-base font-bold font-headline">Selecione um chamado</h3>
                        <p className="text-xs">Clique em um registro na lista à esquerda para ver os detalhes.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
