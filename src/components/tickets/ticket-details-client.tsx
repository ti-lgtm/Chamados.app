
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
import { Loader2, User, Clock, Shield, Tag, Paperclip, Building, Briefcase, CheckCircle, Phone, Circle as CircleIcon, Mail, Printer, UserPlus, Wrench, ShoppingCart, Calendar } from "lucide-react";
import { triggerTicketResolvedEmail } from "@/app/actions/email";
import { DeadlineIndicator } from "./deadline-indicator";
import { InternalNotes } from "./internal-notes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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
        
        // Se for compra e for marcado como comprado, pedir a data
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
        handleStatusChange('purchased', {
            expectedDeliveryDate: Timestamp.fromDate(new Date(deliveryDate)),
            purchaseDate: serverTimestamp()
        });
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
                <Card className="print:shadow-none print:border-2">
                    <CardHeader><CardTitle className="font-headline">Dados da {isPurchase ? 'Compra' : 'Solicitação'}</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center"><User className="h-4 w-4 mr-2 text-muted-foreground" /><strong>Solicitante:</strong><span className="ml-2">{ticket.userName}</span></div>
                        <div className="flex items-center"><Building className="h-4 w-4 mr-2 text-muted-foreground" /><strong>Empresa:</strong><span className="ml-2">{ticket.company}</span></div>
                        <div className="flex items-center"><Briefcase className="h-4 w-4 mr-2 text-muted-foreground" /><strong>Setor:</strong><span className="ml-2">{ticket.department}</span></div>
                        <div className="flex items-center"><Tag className="h-4 w-4 mr-2 text-muted-foreground" /><strong>Prioridade:</strong><Badge variant={priorityMap[ticket.priority]?.variant || 'default'} className="ml-2">{priorityMap[ticket.priority]?.label || ticket.priority}</Badge></div>
                        {ticket.expectedDeliveryDate && (
                            <div className="flex items-center text-primary font-bold">
                                <Calendar className="h-4 w-4 mr-2" />
                                <strong>Previsão de Entrega:</strong>
                                <span className="ml-2">{format(ticket.expectedDeliveryDate.toDate(), "dd/MM/yyyy")}</span>
                            </div>
                        )}
                    </CardContent>
                    {canEdit && (
                         <CardFooter className="flex-col items-start gap-4 print:hidden">
                             <div className="w-full space-y-2">
                                <p className="text-sm font-medium">Status do Fluxo</p>
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
                                <p className="text-sm font-medium">Responsável</p>
                                <Select onValueChange={(v) => {
                                    const user = supportUsers?.find(su => su.id === v);
                                    updateDoc(ticketRef!, { 
                                        assignedTo: v === 'null' ? null : v,
                                        assignedUserName: user ? user.name : null,
                                        assignedUserEmail: user ? user.email : null
                                    });
                                }} value={ticket.assignedTo || 'null'}>
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
                        <DialogTitle>Informar Previsão de Entrega</DialogTitle>
                        <DialogDescription>Ao marcar como comprado, o usuário verá uma barra de progresso até a chegada.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label>Data Prevista</Label>
                        <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeliveryDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={confirmPurchaseStatus} disabled={isUpdating}>Confirmar Compra</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
