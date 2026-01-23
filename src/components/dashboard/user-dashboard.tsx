"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { AppUser, Ticket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TicketList } from "@/components/tickets/ticket-list";
import { PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserDashboardProps {
  user: AppUser;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const firestore = useFirestore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const ticketsQuery = useMemoFirebase(() => 
    firestore && user.uid
      ? query(
          collection(firestore, "tickets"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        )
      : null,
    [firestore, user.uid]
  );

  useEffect(() => {
    if (!ticketsQuery) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(ticketsQuery, (querySnapshot) => {
      const userTickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      setTickets(userTickets);
      setLoading(false);
    },
    (err) => {
        const contextualError = new FirestorePermissionError({
            operation: 'list',
            path: 'tickets'
        });
        errorEmitter.emit('permission-error', contextualError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [ticketsQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold">Seus Chamados</h1>
          <p className="text-muted-foreground">Veja e gerencie os chamados que você abriu.</p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Chamado
          </Link>
        </Button>
      </div>

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
  );
}
