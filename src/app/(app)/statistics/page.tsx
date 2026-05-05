'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Ticket, AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart as BarChartIcon, ShieldAlert, Loader2, Printer, Star, TrendingUp, Clock, CheckCircle2, ListFilter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, BarChart } from 'recharts';
import { startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, getYear, differenceInHours } from 'date-fns';


function StatisticsPageContent() {
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState('month');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [selectedAttendant, setSelectedAttendant] = useState('all');
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    const ticketsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'tickets'));
    }, [firestore]);

    const supportUsersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('role', 'in', ['ti', 'admin']));
    }, [firestore]);

    const { data: allTickets, isLoading: ticketsLoading, error: ticketsError } = useCollection<Ticket>(ticketsQuery);
    const { data: supportUsers, isLoading: supportUsersLoading } = useCollection<AppUser>(supportUsersQuery);
    
    const availableYears = useMemo(() => {
        if (!allTickets) return [new Date().getFullYear()];
        const years = new Set(allTickets.map(t => getYear(t.createdAt.toDate())));
        years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [allTickets]);

    const allDepartments = useMemo(() => {
        if (!allTickets) return [];
        const departments = new Set(allTickets.map(t => t.department).filter((d): d is string => !!d));
        return Array.from(departments).sort();
    }, [allTickets]);

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
        const monthName = new Date(2000, i).toLocaleString('pt-BR', { month: 'long' });
        return {
            value: i,
            label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
        };
    }), []);


    const filteredTickets = useMemo(() => {
        if (!allTickets) return [];

        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (timeRange) {
            case 'year':
                startDate = startOfYear(new Date(selectedYear, 0, 1));
                endDate = endOfYear(new Date(selectedYear, 11, 31));
                break;
            case 'month':
                startDate = startOfMonth(new Date(selectedYear, selectedMonth));
                endDate = endOfMonth(new Date(selectedYear, selectedMonth));
                break;
            case 'week':
            default:
                startDate = startOfWeek(now);
                endDate = endOfWeek(now);
                break;
        }
        
        const finalEndDate = endDate > now ? now : endDate;

        let tickets = allTickets.filter(ticket => {
            if (!ticket.createdAt) return false;
            const ticketDate = ticket.createdAt.toDate();
            return ticketDate >= startDate && ticketDate <= finalEndDate;
        });

        if (selectedAttendant !== 'all') {
            tickets = tickets.filter(ticket => ticket.assignedTo === selectedAttendant);
        }
    
        if (selectedDepartment !== 'all') {
            tickets = tickets.filter(ticket => ticket.department === selectedDepartment);
        }

        return tickets;
    }, [allTickets, timeRange, selectedYear, selectedMonth, selectedAttendant, selectedDepartment]);

    const resolvedTickets = useMemo(() => filteredTickets.filter(t => t.status === 'resolved'), [filteredTickets]);

    const averageRating = useMemo(() => {
        const ratedTickets = resolvedTickets.filter(t => typeof t.rating === 'number' && t.rating > 0);
        if (ratedTickets.length === 0) return 'N/A';
        
        const totalRating = ratedTickets.reduce((acc, ticket) => acc + (ticket.rating || 0), 0);
        const avg = totalRating / ratedTickets.length;
        return avg.toFixed(2);
    }, [resolvedTickets]);

    const attendantStats = useMemo(() => {
        const counts = resolvedTickets.reduce((acc, ticket) => {
            if (ticket.assignedUserName) {
                const attendant = ticket.assignedUserName;
                acc[attendant] = (acc[attendant] || 0) + 1;
            }
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
            const ratingKey = `${ticket.rating} estrelas`;
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

    const departmentStats = useMemo(() => {
        const counts = filteredTickets.reduce((acc, ticket) => {
            const department = ticket.department || 'Não informado';
            acc[department] = (acc[department] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    }, [filteredTickets]);

    const assignedTicketsByAttendantStats = useMemo(() => {
        const counts = filteredTickets.reduce((acc, ticket) => {
            if (ticket.assignedUserName) {
                const attendant = ticket.assignedUserName;
                acc[attendant] = (acc[attendant] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, tickets]) => ({ name, tickets }))
            .sort((a, b) => b.tickets - a.tickets)
            .slice(0, 10); // Top 10
    }, [filteredTickets]);


    if (ticketsLoading || supportUsersLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-1/4" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
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
        <div className="space-y-6 print:space-y-4 print:p-0">
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center print:flex-row print:items-start print:mb-10">
                <div>
                    <h1 className="text-3xl font-headline font-bold print:text-black">Relatório Executivo de Suporte</h1>
                    <p className="text-muted-foreground print:text-black font-medium">Análise estratégica de desempenho, produtividade e qualidade do atendimento.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                     <Button onClick={() => window.print()} variant="outline">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Relatório
                    </Button>
                    <Tabs value={timeRange} onValueChange={setTimeRange}>
                        <TabsList>
                            <TabsTrigger value="week">Semana</TabsTrigger>
                            <TabsTrigger value="month">Mês</TabsTrigger>
                            <TabsTrigger value="year">Ano</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {timeRange === 'year' && (
                        <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {timeRange === 'month' && (
                        <>
                            <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(month => (
                                        <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    )}
                </div>
                <div className="hidden print:block text-right text-xs">
                    <p className="font-bold">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                    <p>Período: {timeRange === 'year' ? `Ano Exercício ${selectedYear}` : timeRange === 'month' ? `${months[selectedMonth].label} / ${selectedYear}` : 'Últimos 7 dias (Semanal)'}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden bg-muted/30 p-4 rounded-lg border border-dashed">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mr-2">
                    <ListFilter className="h-4 w-4" /> Filtros Ativos:
                </div>
                <Select value={selectedAttendant} onValueChange={setSelectedAttendant}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Atendente" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Atendentes</SelectItem>
                        {supportUsers?.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Setor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Setores</SelectItem>
                        {allDepartments.map(dep => (
                            <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6 print:grid-cols-4">
                <Card className="print:shadow-none print:border print:break-inside-avoid border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Total Resolvidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{resolvedTickets.length}</p>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed print:text-black">
                            Representa a eficiência de conclusão. Indica a capacidade da equipe em entregar soluções definitivas.
                        </p>
                    </CardContent>
                </Card>
                <Card className="print:shadow-none print:border print:break-inside-avoid border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            TMR (Médio)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{avgResolutionTime}h</p>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed print:text-black">
                            O Tempo Médio de Resolução é um KPI crítico. Mede a prontidão em restaurar a normalidade operacional.
                        </p>
                    </CardContent>
                </Card>
                 <Card className="print:shadow-none print:border print:break-inside-avoid border-l-4 border-l-slate-400">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-slate-500" />
                            Volume de Entrada
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{filteredTickets.length}</p>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed print:text-black">
                            Fluxo total de requisições. Permite identificar tendências de demanda e picos de carga de trabalho.
                        </p>
                    </CardContent>
                </Card>
                <Card className="print:shadow-none print:border print:break-inside-avoid border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                Índice CSAT
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{averageRating}</p>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed print:text-black">
                            Customer Satisfaction Score. Avalia a percepção direta do usuário sobre a qualidade técnica e humana.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 mt-6 md:grid-cols-1 lg:grid-cols-2">
                <Card className="print:shadow-none print:border print:break-inside-avoid">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Eficiência por Atendente
                        </CardTitle>
                        <CardDescription className="text-[12px] print:text-black leading-relaxed">
                            Análise de produtividade baseada no fechamento de tickets. Este indicador auxilia na identificação de especialistas e na distribuição equilibrada de tarefas complexas entre os membros do time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {attendantStats.length > 0 ? (
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={attendantStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" allowDecimals={false} tick={{fontSize: 10}} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#000' }} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                    <Bar dataKey="tickets" name="Resolvidos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="tickets" position="right" className="fill-black font-bold text-[10px]" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-center text-muted-foreground py-10 print:text-black">Nenhum dado consolidado para este período.</p>}
                    </CardContent>
                </Card>

                 <Card className="print:shadow-none print:border print:break-inside-avoid">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                            Distribuição de Feedback
                        </CardTitle>
                        <CardDescription className="text-[12px] print:text-black leading-relaxed">
                            Métrica de qualidade subjetiva capturada via feedback direto. Uma concentração em 4 e 5 estrelas indica um alinhamento saudável entre as expectativas operacionais e a entrega técnica.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {ratingStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={ratingStats} margin={{ top: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#000' }} />
                                    <YAxis allowDecimals={false} tick={{fontSize: 10}} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }}/>
                                    <Bar dataKey="count" name="Quantidade" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="count" position="top" className="fill-black font-bold text-[10px]" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         ) : <p className="text-center text-muted-foreground py-10 print:text-black">Nenhuma avaliação registrada no intervalo.</p>}
                    </CardContent>
                </Card>

                <Card className="print:shadow-none print:border print:break-inside-avoid">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-chart-2" />
                            Origem de Demanda (Setores)
                        </CardTitle>
                        <CardDescription className="text-[12px] print:text-black leading-relaxed">
                            Mapeamento de incidentes por departamento. Permite a identificação de áreas críticas que podem necessitar de renovação tecnológica ou treinamentos preventivos específicos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {departmentStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={departmentStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" allowDecimals={false} tick={{fontSize: 10}} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#000' }} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                    <Bar dataKey="count" name="Chamados" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="count" position="right" className="fill-black font-bold text-[10px]" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-center text-muted-foreground py-10 print:text-black">Sem registros setoriais para análise.</p>}
                    </CardContent>
                </Card>

                <Card className="print:shadow-none print:border print:break-inside-avoid">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BarChartIcon className="h-5 w-5 text-chart-3" />
                            Ocupação Técnica
                        </CardTitle>
                        <CardDescription className="text-[12px] print:text-black leading-relaxed">
                            Visualização da alocação de recursos humanos. Essencial para equilibrar a carga operacional e garantir que o volume de chamados esteja distribuído de forma sustentável.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {assignedTicketsByAttendantStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={assignedTicketsByAttendantStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" allowDecimals={false} tick={{fontSize: 10}}/>
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#000' }} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                    <Bar dataKey="tickets" name="Atribuídos" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="tickets" position="right" className="fill-black font-bold text-[10px]" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-center text-muted-foreground py-10 print:text-black">Carga de trabalho zerada no período.</p>}
                    </CardContent>
                </Card>
            </div>
            
            <div className="hidden print:block border-t-2 border-black pt-8 mt-16 text-center text-[11px] text-black">
                <p className="font-bold mb-1">Declaração de Integridade</p>
                <p>Este relatório é uma representação autêntica dos dados extraídos do Portal de Suporte.</p>
                <p className="mt-4 text-[9px] uppercase tracking-widest">Fim do Relatório Estatístico de TI — Propriedade Interna</p>
            </div>
        </div>
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
