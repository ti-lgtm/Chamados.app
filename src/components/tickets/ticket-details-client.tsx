"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, Timestamp } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError, useCollection, WithId } from "@/firebase";
import type { Ticket, AppUser } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Comments } from "./comments";
import { RatingSection } from "./rating";
import { Loader2, User, Clock, Shield, Tag, Paperclip, Building, Briefcase, CheckCircle, Phone, Circle as CircleIcon, Mail, Printer, UserPlus, Wrench, ShoppingCart, Calendar, Package, Pencil, Settings2 } from "lucide-react";
import { triggerTicketResolvedEmail } from "@/app/actions/email";
import { DeadlineIndicator } from "./deadline-indicator";
import { InternalNotes } from "./internal-notes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";

interface TicketDetailsClientProps {
    initialTicket: Ticket;
}

const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline", color: string } } = {
    open: { label: 'Aberto', variant: 'destructive', color: 'bg-red-500' },
    in_progress: { label: 'Em Atendimento', variant: 'default', color: 'bg-blue-500' },
    awaiting_user: { label: 'Aguardando Usuário', variant: 'outline', color: 'bg-orange-500' },
    awaiting_support: { label: 'Aguardando Suporte', variant: 'outline', color: 'bg-yellow-500' },
    resolved: { label: 'Resolvido', variant: 'secondary', color: 'bg-green-500' },
    in_quotation: { label: 'Em Cotação', variant: 'outline', color: 'bg-orange-500' },
    purchased: { label: 'Comprado', variant: 'default', color: 'bg-primary' },
    delivered: { label: 'Entregue', variant: 'secondary', color: 'bg-green-500' },
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
    const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState("");

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
        });
        return () => unsub();
    }, [ticketRef]);

    const handleStatusChange = async (newStatus: any, extraData: any = {}) => {
        if (!ticketRef) return;
        
        if (ticket.type === 'purchase' && newStatus === 'purchased' && !extraData.expectedDeliveryDate) {
            setIsDeliveryDialogOpen(true);
            return;
        }

        setIsUpdating(true);
        const updateData = {
            status: newStatus,
            updatedAt: serverTimestamp(),
            ...extraData
        };

        updateDoc(ticketRef, updateData)
        .then(() => {
            toast({ title: "Status atualizado!" });
            if (newStatus === 'resolved' || newStatus === 'delivered') {
                triggerTicketResolvedEmail({
                    ticketNumber: ticket.ticketNumber,
                    ticketTitle: ticket.title,
                    userName: ticket.userName,
                    userEmail: ticket.userEmail,
                    ticketUrl: window.location.href,
                });
            }
            setIsDeliveryDialogOpen(false);
        })
        .catch(error => {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        })
        .finally(() => setIsUpdating(false));
    };

    const confirmPurchaseStatus = () => {
        if (!deliveryDate) {
            toast({ title: "Selecione a data prevista de entrega.", variant: "destructive" });
            return;
        }

        const [year, month, day] = deliveryDate.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0);

        const extraData = {
            expectedDeliveryDate: Timestamp.fromDate(date),
        };

        if (ticket.status === 'purchased') {
            setIsUpdating(true);
            updateDoc(ticketRef!, { ...extraData, updatedAt: serverTimestamp() })
                .then(() => {
                    toast({ title: "Data de entrega atualizada!" });
                    setIsDeliveryDialogOpen(false);
                })
                .catch(() => toast({ title: "Erro ao atualizar data", variant: "destructive" }))
                .finally(() => setIsUpdating(false));
        } else {
            handleStatusChange('purchased', {
                ...extraData,
                purchaseDate: serverTimestamp()
            });
        }
    };

    const handleAttendantChange = (attendantId: string) => {
        if (!ticketRef) return;
        
        const attendantUser = supportUsers?.find(su => su.id === attendantId);
        const isAssigning = attendantId !== 'null';
        
        const updateData: any = { 
            assignedTo: isAssigning ? attendantId : null,
            assignedUserName: attendantUser ? attendantUser.name : null,
            assignedUserEmail: attendantUser ? attendantUser.email : null,
            updatedAt: serverTimestamp()
        };

        // Se o chamado estiver 'aberto' e for atribuído a alguém, muda o status automaticamente
        if (isAssigning && ticket.status === 'open') {
            updateData.status = ticket.type === 'purchase' ? 'in_quotation' : 'in_progress';
        }

        setIsUpdating(true);
        updateDoc(ticketRef, updateData)
            .then(() => {
                toast({ title: isAssigning ? "Atendente atribuído!" : "Atendente removido!" });
            })
            .catch(() => {
                toast({ title: "Erro ao atribuir atendente", variant: "destructive" });
            })
            .finally(() => setIsUpdating(false));
    };

    if (authLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const isPurchase = ticket.type === 'purchase';

    return (
        <div className="grid gap-6 lg:grid-cols-3 print:block print:space-y-6">
            <div className="lg:col-span-2 space-y-6">
                <Card className="print:shadow-none print:border-2">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <div className="flex flex-col gap-1">
                                {isPurchase && <Badge variant="outline" className="w-fit text-[10px] bg-primary/5 text-primary border-primary/20 mb-1"><ShoppingCart className="h-3 w-3 mr-1"/> COMPRA DE TI</Badge>}
                                <CardTitle className="font-headline text-2xl">{ticket.ticketNumber ? `#${ticket.ticketNumber} - ` : ''}{ticket.title}</CardTitle>
                             </div>
                             <div className="flex gap-2 print:hidden">
                                {canEdit && (
                                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Imprimir
                                    </Button>
                                )}
                                <Badge variant={statusMap[ticket.status]?.variant || 'default'}>
                                    {statusMap[ticket.status]?.label || ticket.status}
                                </Badge>
                             </div>
                        </div>
                        <CardDescription className="print:text-black">
                            Criado por {ticket.userName} • {ticket.createdAt ? format(ticket.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                        
                        <div className="mt-6 border-t pt-4">
                             <DeadlineIndicator 
                                createdAt={ticket.createdAt} 
                                deadline={ticket.deadline} 
                                status={ticket.status}
                                type={ticket.type}
                                purchaseDate={ticket.purchaseDate}
                                expectedDeliveryDate={ticket.expectedDeliveryDate}
                            />
                        </div>

                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">Anexos</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {ticket.attachments.map((url, index) => (
                                        <li key={index}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{decodeURIComponent(url.split('/').pop()?.split('?')[0] || `Anexo ${index + 1}`)}</a></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Comments ticket={ticket} currentUser={user} supportUsers={supportUsers} />
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card className="print:shadow-none print:border-2 overflow-hidden">
                    <CardHeader><CardTitle className="font-headline text-lg">Dados da {isPurchase ? 'Compra' : 'Solicitação'}</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                            <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">Solicitante</span>
                                <span>{ticket.userName}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Building className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">Empresa</span>
                                <span>{ticket.company}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">Setor</span>
                                <span>{ticket.department}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Settings2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">Tipo de Serviço</span>
                                <span className="font-medium">{ticket.service}</span>
                            </div>
                        </div>

                        {ticket.contactNumber && (
                            <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">Contato</span>
                                    <span className="font-medium">{ticket.contactNumber}</span>
                                </div>
                            </div>
                        )}

                        {ticket.requestedFor && (
                            <div className="flex items-start gap-3">
                                <UserPlus className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">{isPurchase ? 'Comprar para' : 'Solicitado para'}</span>
                                    <span className="font-medium text-primary">{ticket.requestedFor}</span>
                                </div>
                            </div>
                        )}

                        {ticket.ccEmail && (
                            <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">E-mail em Cópia (Gestor)</span>
                                    <span className="text-xs break-all">{ticket.ccEmail}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-semibold text-[11px] uppercase text-muted-foreground leading-none mb-1">Prioridade</span>
                                <Badge variant={priorityMap[ticket.priority]?.variant || 'default'} className="w-fit mt-1">
                                    {priorityMap[ticket.priority]?.label || ticket.priority}
                                </Badge>
                            </div>
                        </div>

                        {ticket.expectedDeliveryDate && (
                            <div className="p-3 bg-primary/5 rounded-md border border-primary/20 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <Calendar className="h-4 w-4" />
                                        <span className="text-xs uppercase">Previsão de Entrega</span>
                                    </div>
                                    {canEdit && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6"
                                            onClick={() => {
                                                setDeliveryDate(format(ticket.expectedDeliveryDate!.toDate(), "yyyy-MM-dd"));
                                                setIsDeliveryDialogOpen(true);
                                            }}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-lg font-bold text-primary pl-6">
                                    {format(ticket.expectedDeliveryDate.toDate(), "dd/MM/yyyy")}
                                </p>
                            </div>
                        )}
                    </CardContent>
                    {canEdit && (
                         <CardFooter className="flex-col items-start gap-4 print:hidden border-t pt-6 bg-muted/20">
                             <div className="w-full space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Status do Fluxo</p>
                                <Select onValueChange={(v) => handleStatusChange(v)} value={ticket.status} disabled={isUpdating}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {!isPurchase ? (
                                            <>
                                                <SelectItem value="open">Aberto</SelectItem>
                                                <SelectItem value="in_progress">Em Atendimento</SelectItem>
                                                <SelectItem value="awaiting_user">Aguardando Usuário</SelectItem>
                                                <SelectItem value="awaiting_support">Aguardando Suporte</SelectItem>
                                                <SelectItem value="resolved">Resolvido</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="open">Solicitado</SelectItem>
                                                <SelectItem value="in_quotation">Em Cotação</SelectItem>
                                                <SelectItem value="purchased">Comprado (Em Trânsito)</SelectItem>
                                                <SelectItem value="delivered">Entregue / Concluído</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                             </div>
                             <div className="w-full space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Responsável</p>
                                <Select onValueChange={handleAttendantChange} value={ticket.assignedTo || 'null'} disabled={isUpdating}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">Ninguém</SelectItem>
                                        {supportUsers?.map(su => <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                             {!isPurchase ? (
                                <Button className="w-full" onClick={() => handleStatusChange('resolved')} disabled={isUpdating || ticket.status === 'resolved'}>
                                    {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Finalizar Chamado
                                </Button>
                             ) : (
                                <Button className="w-full" variant="outline" onClick={() => handleStatusChange('delivered')} disabled={isUpdating || ticket.status === 'delivered'}>
                                    {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <Package className="mr-2 h-4 w-4" />}
                                    Confirmar Entrega
                                </Button>
                             )}
                         </CardFooter>
                    )}
                </Card>
                {canEdit && user && <InternalNotes ticketId={ticket.id} currentUser={user} />}
                {(ticket.status === 'resolved' || ticket.status === 'delivered') && <RatingSection ticketId={ticket.id} ticketCreatorId={ticket.userId} currentUser={user} />}
            </div>

            <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{ticket.status === 'purchased' ? 'Atualizar Previsão de Entrega' : 'Informar Previsão de Entrega'}</DialogTitle>
                        <DialogDescription>
                            {ticket.status === 'purchased' 
                                ? 'Informe a nova data caso ocorra algum atraso ou alteração no prazo.' 
                                : 'Ao marcar como comprado, o usuário verá uma barra de progresso até a chegada.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label>Data Prevista</Label>
                        <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeliveryDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={confirmPurchaseStatus} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {ticket.status === 'purchased' ? 'Atualizar Data' : 'Confirmar Compra'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}