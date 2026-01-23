
"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError, useCollection } from "@/firebase";
import type { Ticket, AppUser } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Comments } from "./comments";
import { RatingSection } from "./rating";
import { Loader2, User, Clock, Shield, Tag, Paperclip } from "lucide-react";

interface TicketDetailsClientProps {
    initialTicket: Ticket;
}

const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline", color: string } } = {
    open: { label: 'Aberto', variant: 'destructive', color: 'bg-red-500' },
    in_progress: { label: 'Em Atendimento', variant: 'default', color: 'bg-blue-500' },
    resolved: { label: 'Resolvido', variant: 'secondary', color: 'bg-green-500' },
};

const priorityMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
    low: { label: 'Baixa', variant: 'secondary' },
    normal: { label: 'Normal', variant: 'default' },
    high: { label: 'Alta', variant: 'destructive' },
};

export function TicketDetailsClient({ initialTicket }: TicketDetailsClientProps) {
    const { user, loading: authLoading } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [ticket, setTicket] = useState<Ticket>(initialTicket);
    const [isUpdating, setIsUpdating] = useState(false);
    const canEdit = user?.role === 'ti' || user?.role === 'admin';

    const supportUsersQuery = useMemoFirebase(() => {
        if (!firestore || !canEdit) return null;
        return query(collection(firestore, 'users'), where('role', 'in', ['ti', 'admin']));
    }, [firestore, canEdit]);

    const { data: supportUsers, isLoading: supportUsersLoading } = useCollection<AppUser>(supportUsersQuery);

    const ticketRef = useMemoFirebase(() => 
        firestore ? doc(firestore, "tickets", initialTicket.id) : null
    , [firestore, initialTicket.id]);

    useEffect(() => {
        if (!ticketRef) return;
        const unsub = onSnapshot(ticketRef, (doc) => {
            if(doc.exists()) {
                setTicket({ id: doc.id, ...doc.data() } as Ticket);
            }
        },
        (err) => {
            const contextualError = new FirestorePermissionError({
                operation: 'get',
                path: ticketRef.path
            });
            errorEmitter.emit('permission-error', contextualError);
        });
        return () => unsub();
    }, [ticketRef]);


    const handleStatusChange = async (newStatus: "open" | "in_progress" | "resolved") => {
        if (!ticketRef) return;
        setIsUpdating(true);
        const updateData = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };

        updateDoc(ticketRef, updateData)
        .then(() => {
            toast({ title: "Status do chamado atualizado com sucesso!" });
        })
        .catch(error => {
            toast({ title: "Erro ao atualizar status", variant: "destructive" });
             const contextualError = new FirestorePermissionError({
                operation: 'update',
                path: ticketRef.path,
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', contextualError);
        })
        .finally(() => {
            setIsUpdating(false);
        });
    };

    const handleAssignmentChange = async (newAssignedTo: string) => {
        if (!ticketRef) return;
        setIsUpdating(true);
        const finalAssignedTo = newAssignedTo === 'null' ? null : newAssignedTo;
        
        const assignedUserData = supportUsers?.find(su => su.id === finalAssignedTo);
        
        const updateData = {
            assignedTo: finalAssignedTo,
            assignedUserName: assignedUserData ? assignedUserData.name : null,
            updatedAt: serverTimestamp(),
        };

        updateDoc(ticketRef, updateData)
        .then(() => {
            toast({ title: "Chamado atribuído com sucesso!" });
        })
        .catch(error => {
            toast({ title: "Erro ao atribuir chamado", variant: "destructive" });
             const contextualError = new FirestorePermissionError({
                operation: 'update',
                path: ticketRef.path,
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', contextualError);
        })
        .finally(() => {
            setIsUpdating(false);
        });
    };

    if (authLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <CardTitle className="font-headline text-2xl">{ticket.ticketNumber ? `#${ticket.ticketNumber} - ` : ''}{ticket.title}</CardTitle>
                             <Badge variant={statusMap[ticket.status]?.variant || 'default'} className="whitespace-nowrap">
                                {statusMap[ticket.status]?.label || ticket.status}
                             </Badge>
                        </div>
                        <CardDescription>
                            Aberto em {ticket.createdAt ? format(ticket.createdAt.toDate(), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR }) : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Paperclip className="h-4 w-4"/> Anexos</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {ticket.attachments.map((url, index) => (
                                        <li key={index}>
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                Anexo {index + 1}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Comments ticketId={ticket.id} currentUser={user} />
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Detalhes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            <strong>Solicitante:</strong>
                            <span className="ml-2">{initialTicket.user?.name || 'Desconhecido'}</span>
                        </div>
                        <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                            <strong>Atribuído a:</strong>
                            <span className="ml-2">{ticket.assignedUserName || 'Ninguém'}</span>
                        </div>
                        <div className="flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                            <strong>Prioridade:</strong>
                            <Badge variant={priorityMap[ticket.priority]?.variant || 'default'} className="ml-2">
                                {priorityMap[ticket.priority]?.label || ticket.priority}
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <strong>Última atualização:</strong>
                            <span className="ml-2">{ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}</span>
                        </div>
                    </CardContent>
                    {canEdit && (
                         <CardFooter className="flex-col items-start gap-4">
                             <div className="w-full space-y-2">
                                <p className="text-sm font-medium">Alterar Status</p>
                                <Select onValueChange={(value) => handleStatusChange(value as any)} defaultValue={ticket.status} disabled={isUpdating}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Aberto</SelectItem>
                                        <SelectItem value="in_progress">Em Atendimento</SelectItem>
                                        <SelectItem value="resolved">Resolvido</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                             <div className="w-full space-y-2">
                                <p className="text-sm font-medium">Atribuir a</p>
                                 <Select onValueChange={handleAssignmentChange} value={ticket.assignedTo || undefined} disabled={isUpdating || supportUsersLoading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um responsável" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">Ninguém</SelectItem>
                                        {supportUsers?.map(su => (
                                            <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                             </div>
                         </CardFooter>
                    )}
                </Card>

                {ticket.status === 'resolved' && (
                    <RatingSection ticketId={ticket.id} ticketCreatorId={ticket.userId} currentUser={user} />
                )}
            </div>
        </div>
    );
}
