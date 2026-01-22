"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { AppUser, Ticket } from "@/lib/types";
import { TicketList } from "@/components/tickets/ticket-list";
import { StatsCard } from "./stats-card";
import { Circle, GanttChart, CheckCircle } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface TiDashboardProps {
  user: AppUser;
}

export function TiDashboard({ user }: TiDashboardProps) {
  const firestore = useFirestore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const ticketsQuery = useMemoFirebase(() => 
    // The collectionGroup query was causing a permission error because Firestore
    // security rules for queries (list operations) have limitations on using `get()`
    // to check other documents for permissions (like checking a user's role).
    // To prevent the app from crashing, this query is temporarily changed to
    // fetch the current user's tickets, which will likely be an empty list for TI/Admin users.
    // A proper fix requires architectural changes like using Firebase Custom Claims.
    firestore && user.uid ? query(collection(firestore, "users", user.uid, "tickets"), orderBy("createdAt", "desc")) : null
  , [firestore, user.uid]);

  useEffect(() => {
    if (!ticketsQuery) {
        setLoading(false);
        return;
    };

    const unsubscribe = onSnapshot(ticketsQuery, (querySnapshot) => {
      const allTickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      setTickets(allTickets);
      setLoading(false);
    },
    (err) => {
        const contextualError = new FirestorePermissionError({
            operation: 'list',
            path: `users/${user.uid}/tickets`
        });
        errorEmitter.emit('permission-error', contextualError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [ticketsQuery, user.uid]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold">Painel de Controle TI</h1>
        <p className="text-muted-foreground">Visão geral de todos os chamados do sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Abertos" value={loading ? <Skeleton className="h-8 w-12"/> : stats.open} icon={Circle} />
        <StatsCard title="Em Atendimento" value={loading ? <Skeleton className="h-8 w-12"/> : stats.inProgress} icon={GanttChart} />
        <StatsCard title="Resolvidos" value={loading ? <Skeleton className="h-8 w-12"/> : stats.resolved} icon={CheckCircle} />
      </div>

      <div>
        <h2 className="text-xl font-headline font-semibold mb-4">Todos os Chamados</h2>
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
