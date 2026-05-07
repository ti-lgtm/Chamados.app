
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { ScheduledTicket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Calendar, ShieldAlert } from 'lucide-react';

const departments = [
    "Administrativo", "Arquivo", "Assistência Técnica", "Atendimento ao Cliente", 
    "Auditoria", "Comercial", "Contabilidade", "Diretoria", "Financeiro", 
    "Gestão Pessoal", "Jurídico", "Obra", "Planejamento", "Projetos", 
    "Suprimentos", "Marketing", "Qualidade"
];

export default function ScheduledTicketsPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const scheduledQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'scheduled_tickets');
    }, [firestore]);

    const { data: scheduledTickets, isLoading } = useCollection<ScheduledTicket>(scheduledQuery);

    const [newTicket, setNewTicket] = useState({
        title: '',
        description: '',
        company: '',
        department: 'Administrativo',
        priority: 'normal' as const,
        dayOfMonth: 1,
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setLoading(true);

        const payload = {
            ...newTicket,
            active: true,
            createdAt: serverTimestamp(),
        };

        addDoc(collection(firestore, 'scheduled_tickets'), payload)
            .then(() => {
                toast({ title: "Agendamento criado com sucesso!" });
                setNewTicket({
                    title: '',
                    description: '',
                    company: '',
                    department: 'Administrativo',
                    priority: 'normal',
                    dayOfMonth: 1,
                });
            })
            .catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'scheduled_tickets',
                    operation: 'create',
                    requestResourceData: payload
                }));
            })
            .finally(() => setLoading(false));
    };

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        deleteDoc(doc(firestore, 'scheduled_tickets', id))
            .catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `scheduled_tickets/${id}`,
                    operation: 'delete'
                }));
            });
    };

    const toggleActive = async (ticket: ScheduledTicket) => {
        if (!firestore) return;
        updateDoc(doc(firestore, 'scheduled_tickets', ticket.id), { active: !ticket.active });
    };

    if (user?.role !== 'admin' && user?.role !== 'ti') {
        return <div className="p-8 text-center text-destructive flex items-center gap-2 justify-center"><ShieldAlert /> Acesso Negado</div>;
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Auto Chamados Recorrentes</h1>
                    <p className="text-muted-foreground">Configure chamados que serão abertos automaticamente em datas específicas.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Novo Auto Chamado</CardTitle>
                    <CardDescription>Defina as informações do chamado e o dia de recorrência.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            placeholder="Título do Chamado" 
                            value={newTicket.title} 
                            onChange={e => setNewTicket({...newTicket, title: e.target.value})} 
                            required 
                        />
                        <Input 
                            placeholder="Empresa" 
                            value={newTicket.company} 
                            onChange={e => setNewTicket({...newTicket, company: e.target.value})} 
                            required 
                        />
                        <Select value={newTicket.department} onValueChange={v => setNewTicket({...newTicket, department: v})}>
                            <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
                            <SelectContent>
                                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={newTicket.priority} onValueChange={(v: any) => setNewTicket({...newTicket, priority: v})}>
                            <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <span className="text-sm whitespace-nowrap">Dia do Mês:</span>
                            <Input 
                                type="number" 
                                min="1" max="28" 
                                value={newTicket.dayOfMonth} 
                                onChange={e => setNewTicket({...newTicket, dayOfMonth: parseInt(e.target.value)})} 
                                required 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Textarea 
                                placeholder="Descrição detalhada do chamado automático" 
                                value={newTicket.description} 
                                onChange={e => setNewTicket({...newTicket, description: e.target.value})} 
                                required 
                            />
                        </div>
                        <Button type="submit" className="md:col-span-2" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                            Criar Regra de Auto Chamado
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Regras Ativas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Título</TableHead>
                                <TableHead>Dia</TableHead>
                                <TableHead>Setor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : scheduledTickets?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum auto chamado configurado.</TableCell></TableRow>
                            ) : scheduledTickets?.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.title}</TableCell>
                                    <TableCell>Todo dia {t.dayOfMonth}</TableCell>
                                    <TableCell>{t.department}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={t.active ? "default" : "secondary"}
                                            className="cursor-pointer"
                                            onClick={() => toggleActive(t)}
                                        >
                                            {t.active ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
