'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Ticket } from '@/lib/types';
import { format } from 'date-fns';

import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Star, Loader2 } from 'lucide-react';


export default function NewTicketPage() {
    const { user, loading: authLoading } = useAuth();
    const firestore = useFirestore();

    const resolvedTicketsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'tickets'),
            where('userId', '==', user.uid),
            where('status', '==', 'resolved')
        );
    }, [firestore, user]);

    const { data: resolvedTickets, isLoading: ticketsLoading } = useCollection<Ticket>(resolvedTicketsQuery);

    const unratedTickets = useMemo(() => {
        if (!resolvedTickets) return [];
        return resolvedTickets
            .filter(ticket => !ticket.rating)
            .sort((a, b) => (a.createdAt.toMillis() || 0) - (b.createdAt.toMillis() || 0));
    }, [resolvedTickets]);

    const isLoading = authLoading || ticketsLoading;

    if (isLoading) {
         return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (unratedTickets.length > 0) {
        return (
             <div className="mx-auto w-full max-w-2xl pt-8">
                <Card className="border-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline"><Star className="text-yellow-400 fill-yellow-400" /> Avaliações Pendentes</CardTitle>
                        <CardDescription>Para abrir um novo chamado, por favor, avalie os atendimentos resolvidos abaixo.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                       <ul className="divide-y divide-border -mx-6">
                            {unratedTickets.map(ticket => (
                                <li key={ticket.id} className="py-3 px-6 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">#{ticket.ticketNumber} - {ticket.title}</p>
                                        {ticket.updatedAt && <p className="text-sm text-muted-foreground">Resolvido em {format(ticket.updatedAt.toDate(), "dd/MM/yyyy")}</p>}
                                    </div>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/tickets/${ticket.id}`}>
                                            Avaliar
                                        </Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-3xl">
            <Card>
                <CardHeader>
                <CardTitle className="font-headline text-2xl">Abrir Novo Chamado</CardTitle>
                <CardDescription>
                    Descreva seu problema ou solicitação em detalhes para que nossa equipe possa ajudar.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <NewTicketForm />
                </CardContent>
            </Card>
        </div>
    );
}
