'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Ticket } from '@/lib/types';

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

    const oldestUnratedTicket = useMemo(() => {
        if (!resolvedTickets) return null;
        const unrated = resolvedTickets
            .filter(ticket => !ticket.rating)
            .sort((a, b) => (a.createdAt.toMillis() || 0) - (b.createdAt.toMillis() || 0));
        return unrated.length > 0 ? unrated[0] : null;
    }, [resolvedTickets]);

    const isLoading = authLoading || ticketsLoading;

    if (isLoading) {
         return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (oldestUnratedTicket) {
        return (
             <div className="mx-auto w-full max-w-2xl pt-8">
                <Card className="border-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline"><Star className="text-yellow-400 fill-yellow-400" /> Avaliação Pendente</CardTitle>
                        <CardDescription>Para abrir um novo chamado, por favor, avalie o atendimento do seu último chamado resolvido.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm">Chamado: <strong className="font-medium">#{oldestUnratedTicket.ticketNumber} - {oldestUnratedTicket.title}</strong>.</p>
                        <Button asChild className="w-full">
                            <Link href={`/tickets/${oldestUnratedTicket.id}`}>
                                Ir para Avaliação
                            </Link>
                        </Button>
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
