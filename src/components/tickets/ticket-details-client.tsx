
"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError, useCollection, WithId } from "@/firebase";
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
import { Loader2, User, Clock, Shield, Tag, Paperclip, CalendarClock, Building, Briefcase, CheckCircle, Phone, Circle as CircleIcon, Mail, Printer } from "lucide-react";
import { triggerTicketResolvedEmail } from "@/app/actions/email";
import { DeadlineIndicator } from "./deadline-indicator";
import { InternalNotes } from "./internal-notes";
import { Button } from "../ui/button";

interface TicketDetailsClientProps {
    initialTicket: Ticket;
}

const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline", color: string } } = {
    open: { label: 'Aberto', variant: 'destructive', color: 'bg-red-500' },
    in_progress: { label: 'Em Atendimento', variant: 'default', color: 'bg-blue-500' },
    awaiting_user: { label: 'Aguardando Usuário', variant: 'outline', color: 'bg-orange-500' },
    awaiting_support: { label: 'Aguardando Suporte', variant: 'outline', color: 'bg-yellow-500' },
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

    const { data: supportUsers, isLoading: supportUsersLoading } = useCollection<WithId<AppUser>>(supportUsersQuery);

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


    const handleStatusChange = async (newStatus: "open" | "in_progress" | "resolved" | "awaiting_user" | "awaiting_support") => {
        if (!ticketRef) return;
        setIsUpdating(true);
        const updateData = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };

        updateDoc(ticketRef, updateData)
        .then(() => {
            toast({ title: "Status do chamado atualizado com sucesso!" });
            if (newStatus === 'resolved') {
                const ticketUrl = `${window.location.origin}/tickets/${ticket.id}`;
                triggerTicketResolvedEmail({
                    ticketNumber: ticket.ticketNumber,
                    ticketTitle: ticket.title,
                    userName: ticket.userName,
                    userEmail: ticket.userEmail,
                    ticketUrl: ticketUrl,
                });
            }
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
    
    const handlePriorityChange = async (newPriority: "low" | "normal" | "high") => {
        if (!ticketRef) return;
        setIsUpdating(true);
        const updateData = {
            priority: newPriority,
            updatedAt: serverTimestamp(),
        };

        updateDoc(ticketRef, updateData)
        .then(() => {
            toast({ title: "Prioridade do chamado atualizada com sucesso!" });
        })
        .catch(error => {
            toast({ title: "Erro ao atualizar prioridade", variant: "destructive" });
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
        
        const updateData: any = {
            assignedTo: finalAssignedTo,
            assignedUserName: assignedUserData ? assignedUserData.name : null,
            assignedUserEmail: assignedUserData ? assignedUserData.email : null,
            updatedAt: serverTimestamp(),
        };

        if (finalAssignedTo) {
            updateData.status = 'in_progress';
        } else {
            updateData.status = 'open';
        }

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
    
    const assignedUser = supportUsers?.find(u => u.id === ticket.assignedTo);
    const assignedNameToDisplay = ticket.assignedUserName || assignedUser?.name || 'Ninguém';

    if (authLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="grid gap-6 lg:grid-cols-3 print:block print:space-y-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-3xl font-headline font-bold">Relatório de Chamado de Suporte</h1>
                    <p className="text-sm font-medium">Documento oficial de registro e tratativa de incidente.</p>
                </div>

                <Card className="print:shadow-none print:border-2">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <CardTitle className="font-headline text-2xl">{ticket.ticketNumber ? `#${ticket.ticketNumber} - ` : ''}{ticket.title}</CardTitle>
                             <div className="flex gap-2 print:hidden">
                                {canEdit && (
                                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Imprimir
                                    </Button>
                                )}
                                <Badge variant={statusMap[ticket.status]?.variant || 'default'} className="whitespace-nowrap">
                                    {statusMap[ticket.status]?.label || ticket.status}
                                </Badge>
                             </div>
                             <Badge variant={statusMap[ticket.status]?.variant || 'default'} className="hidden print:flex">
                                {statusMap[ticket.status]?.label || ticket.status}
                             </Badge>
                        </div>
                        <CardDescription className="print:text-black print:font-semibold">
                            Criado por {ticket.userName} • {ticket.createdAt ? format(ticket.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="print:mb-4">
                            <h4 className="hidden print:block text-xs font-bold uppercase text-muted-foreground mb-1">Descrição do Problema</h4>
                            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                        </div>
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="mt-6 print:mt-4">
                                <h4 className="font-semibold mb-2 flex items-center gap-2 print:text-black">
                                    <Paperclip className="h-4 w-4 print:hidden"/> 
                                    <span className="hidden print:inline font-bold">ANEXOS REGISTRADOS:</span>
                                    <span className="print:hidden">Anexos</span>
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm print:text-xs">
                                    {ticket.attachments.map((url, index) => {
                                        const fileName = url.split('/').pop()?.split('?')[0] || `Anexo ${index + 1}`;
                                        const decodedFileName = decodeURIComponent(fileName);
                                        return (
                                            <li key={index}>
                                                <a 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline print:text-black print:no-underline"
                                                >
                                                    <span className="truncate">{decodedFileName.substring(decodedFileName.indexOf('_') + 1)}</span>
                                                </a>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="print:break-inside-avoid">
                    <Comments ticket={ticket} currentUser={user} supportUsers={supportUsers} />
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6 print:mt-8">
                <Card className="print:shadow-none print:border-2">
                    <CardHeader>
                        <CardTitle className="font-headline">Detalhes Técnicos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm print:text-xs">
                        <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                            <strong>Solicitante:</strong>
                            <span className="ml-2">{ticket.userName || 'Desconhecido'}</span>
                        </div>
                         <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                            <strong>Empresa:</strong>
                            <span className="ml-2">{ticket.company || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                            <strong>Setor:</strong>
                            <span className="ml-2">{ticket.department || 'Não informado'}</span>
                        </div>
                         <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                            <strong>Contato:</strong>
                            <span className="ml-2">{ticket.contactNumber || 'Não informado'}</span>
                        </div>
                        {ticket.ccEmail && (
                            <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                                <strong>Cópia para:</strong>
                                <span className="ml-2">{ticket.ccEmail}</span>
                            </div>
                        )}
                        <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                            <strong>Atribuído a:</strong>
                            <span className="ml-2">{assignedNameToDisplay}</span>
                        </div>
                        <div className="flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                            <strong>Prioridade:</strong>
                            <Badge variant={priorityMap[ticket.priority]?.variant || 'default'} className="ml-2">
                                {priorityMap[ticket.priority]?.label || ticket.priority}
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground print:hidden" />
                            <strong>Última atualização:</strong>
                            <span className="ml-2">{ticket.updatedAt ? format(ticket.updatedAt.toDate(), "dd/MM/yyyy HH:mm") : ''}</span>
                        </div>
                    </CardContent>
                    {canEdit && (
                         <CardFooter className="flex-col items-start gap-4 print:hidden">
                             <div className="w-full space-y-2">
                                <p className="text-sm font-medium">Alterar Status</p>
                                <Select onValueChange={(value) => handleStatusChange(value as any)} value={ticket.status} disabled={isUpdating || ticket.status === 'resolved'}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Aberto</SelectItem>
                                        <SelectItem value="in_progress">Em Atendimento</SelectItem>
                                        <SelectItem value="awaiting_user">Aguardando Usuário</SelectItem>
                                        <SelectItem value="awaiting_support">Aguardando Suporte</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                              <div className="w-full space-y-2">
                                <p className="text-sm font-medium">Alterar Prioridade</p>
                                 <Select onValueChange={(value) => handlePriorityChange(value as any)} value={ticket.priority} disabled={isUpdating}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Baixa</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                             <div className="w-full space-y-2">
                                <p className="text-sm font-medium">Atribuir a</p>
                                 <Select onValueChange={handleAssignmentChange} value={ticket.assignedTo || 'null'} disabled={isUpdating || supportUsersLoading}>
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
                              {ticket.status !== 'resolved' ? (
                                <Button 
                                    className="w-full" 
                                    onClick={() => handleStatusChange('resolved')}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Marcar como Resolvido
                                </Button>
                            ) : (
                                <Button 
                                    className="w-full" 
                                    variant="outline"
                                    onClick={() => handleStatusChange('open')}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleIcon className="mr-2 h-4 w-4" />}
                                    Reabrir Chamado
                                </Button>
                            )}
                         </CardFooter>
                    )}
                </Card>

                {canEdit && user && <div className="print:hidden"><InternalNotes ticketId={ticket.id} currentUser={user} /></div>}

                {ticket.status === 'resolved' && (
                    <RatingSection ticketId={ticket.id} ticketCreatorId={ticket.userId} currentUser={user} />
                )}

                <div className="hidden print:block text-center text-[10px] text-black mt-20 pt-8 border-t border-black">
                    <p className="font-bold">Portal de Suporte - Registro de Atendimento</p>
                    <p>Gerado por {user?.name} em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
            </div>
        </div>
    );
}
