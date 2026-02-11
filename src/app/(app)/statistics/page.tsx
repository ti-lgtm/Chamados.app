'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Ticket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart as BarChartIcon, ShieldAlert, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, BarChart } from 'recharts';
import { startOfWeek, startOfMonth, startOfYear, differenceInHours } from 'date-fns';


function StatisticsPageContent() {
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState('month');

    const ticketsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // Query all tickets, as we need to filter them on the client by date
        return query(collection(firestore, 'tickets'));
    }, [firestore]);

    const { data: allTickets, isLoading: ticketsLoading, error: ticketsError } = useCollection<Ticket>(ticketsQuery);

    const filteredTickets = useMemo(() => {
        if (!allTickets) return [];
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
            case 'week':
                startDate = startOfWeek(now);
                break;
            case 'year':
                startDate = startOfYear(now);
                break;
            case 'month':
            default:
                startDate = startOfMonth(now);
                break;
        }

        return allTickets.filter(ticket => ticket.createdAt.toDate() >= startDate);
    }, [allTickets, timeRange]);

    const resolvedTickets = useMemo(() => filteredTickets.filter(t => t.status === 'resolved'), [filteredTickets]);

    const attendantStats = useMemo(() => {
        const counts = resolvedTickets.reduce((acc, ticket) => {
            const attendant = ticket.assignedUserName || 'Não atribuído';
            acc[attendant] = (acc[attendant] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, tickets]) => ({ name, tickets }))
            .sort((a, b) => b.tickets - a.tickets)
            .slice(0, 10); // Top 10
    }, [resolvedTickets]);

    const ratingStats = useMemo(() => {
        const ratedTickets = resolvedTickets.filter(t => typeof t.rating === 'number' && t.rating > 0);
        const counts = ratedTickets.reduce((acc, ticket) => {
            const ratingKey = `${ticket.rating} estrela(s)`;
            acc[ratingKey] = (acc[ratingKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    }, [resolvedTickets]);

    const avgResolutionTime = useMemo(() => {
        if (resolvedTickets.length === 0) return 0;

        const totalHours = resolvedTickets.reduce((acc, ticket) => {
            if (!ticket.updatedAt || !ticket.createdAt) return acc;
            const resolutionTime = differenceInHours(ticket.updatedAt.toDate(), ticket.createdAt.toDate());
            return acc + resolutionTime;
        }, 0);

        return (totalHours / resolvedTickets.length).toFixed(1);
    }, [resolvedTickets]);

    if (ticketsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-1/4" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        )
    }

    if (ticketsError) {
        return (
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Erro ao carregar dados</AlertTitle>
                <AlertDescription>
                    Não foi possível buscar as estatísticas dos chamados. Verifique suas permissões e tente novamente.
                </AlertDescription>
            </Alert>
        )
    }


    return (
        <Tabs value={timeRange} onValueChange={setTimeRange}>
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <div>
                    <h1 className="text-2xl font-headline font-bold">Estatísticas dos Chamados</h1>
                    <p className="text-muted-foreground">Análise de desempenho da equipe de suporte.</p>
                </div>
                <TabsList>
                    <TabsTrigger value="week">Semana</TabsTrigger>
                    <TabsTrigger value="month">Mês</TabsTrigger>
                    <TabsTrigger value="year">Ano</TabsTrigger>
                </TabsList>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Chamados Resolvidos</CardTitle>
                        <CardDescription>Total no período selecionado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{resolvedTickets.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tempo Médio de Resolução</CardTitle>
                        <CardDescription>Em horas, para chamados resolvidos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{avgResolutionTime}h</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Total de Chamados Abertos</CardTitle>
                        <CardDescription>Total no período selecionado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{filteredTickets.length}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6 mt-6 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Atendentes</CardTitle>
                        <CardDescription>Chamados resolvidos por membro da equipe.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {attendantStats.length > 0 ? (
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={attendantStats} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                    <Bar dataKey="tickets" name="Chamados Resolvidos" fill="hsl(var(--primary))">
                                        <LabelList dataKey="tickets" position="right" className="fill-foreground" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-center text-muted-foreground py-10">Nenhum dado de atendente para exibir.</p>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Distribuição de Avaliações</CardTitle>
                        <CardDescription>Avaliações recebidas em chamados resolvidos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {ratingStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={ratingStats} margin={{ top: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }}/>
                                    <Bar dataKey="count" name="Quantidade" fill="hsl(var(--accent))">
                                        <LabelList dataKey="count" position="top" className="fill-foreground" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         ) : <p className="text-center text-muted-foreground py-10">Nenhuma avaliação para exibir.</p>}
                    </CardContent>
                </Card>
            </div>

        </Tabs>
    )
}

export default function StatisticsPage() {
    const { user, loading } = useAuth();
    const isAuthorized = user?.role === 'admin' || user?.role === 'ti';

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Acesso Negado</AlertTitle>
                <AlertDescription>
                    Você não tem permissão para visualizar as estatísticas.
                </AlertDescription>
            </Alert>
        )
    }

    return <StatisticsPageContent />;
}
