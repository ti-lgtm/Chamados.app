
"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, Timestamp, addDoc, getDoc } from "firebase/firestore";
import { useFirestore, useMemoFirebase, useCollection, WithId } from "@/firebase";
import type { Ticket, AppUser, EmailSettings } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Comments } from "./comments";
import { RatingSection } from "./rating";
import { 
    Loader2, User, Building, Briefcase, 
    CheckCircle, Phone, Mail, Printer, UserPlus, 
    Settings2, RotateCcw, ArrowLeft, MessageSquareWarning, Maximize2, 
    SendHorizontal, ClipboardList, Shield, Tag, Paperclip, Package, Pencil,
    AlertTriangle,
    Calendar
} from "lucide-react";
import { 
    triggerTicketResolvedEmail, 
    triggerTicketCreatedEmail, 
    triggerTicketCreatedSupportEmail 
} from "@/app/actions/email";
import { DeadlineIndicator } from "./deadline-indicator";
import { InternalNotes } from "./internal-notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { addBusinessDays } from "./new-ticket-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const departmentOptions = [
    "Administrativo", "Arquitetura", "Arquivo", "Assistência Técnica", "Atendimento ao Cliente",
    "Auditoria", "Comercial", "Contabilidade", "Diretoria", "Financeiro",
    "Gestão Pessoal", "Jurídico", "Legalização", "Obra", "Planejamento", "Projetos",
    "Suprimentos", "Marketing", "Qualidade",
];

interface TicketDetailsClientProps {
    initialTicket: Ticket;
    isPreview?: boolean;
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

export function TicketDetailsClient({ initialTicket, isPreview = false }: TicketDetailsClientProps) {
    const { user, loading: authLoading } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [ticket, setTicket] = useState<Ticket>(initialTicket);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
    const [isPriorityDialogOpen, setIsPriorityDialogOpen] = useState(false);
    const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
    const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState("");
    const [reopenReason, setReopenReason] = useState("");
    const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>(ticket.priority);
    const [newDepartment, setNewDepartment] = useState(ticket.department);

    const canEdit = user?.role === 'ti' || user?.role === 'admin';
    const isOwner = user?.uid === ticket.userId;
    const isAssignedToMe = ticket.assignedTo === user?.uid;
    const isFinished = ticket.status === 'resolved' || ticket.status === 'delivered';

    // Lógica de reabertura por usuário (janela de 24h)
    const hoursSinceUpdate = ticket.updatedAt ? differenceInHours(new Date(), ticket.updatedAt.toDate()) : 0;
    const canUserReopen = isOwner && isFinished && hoursSinceUpdate < 24;

    const supportUsersQuery = useMemoFirebase(() => {
        if (!firestore || !canEdit) return null;
        return query(collection(firestore, 'users'), where('role', 'in', ['ti', 'admin']));
    }, [firestore, canEdit]);

    const { data: supportUsers } = useCollection<WithId<AppUser>>(supportUsersQuery);

    const ticketRef = useMemoFirebase(() => 
        firestore ? doc(firestore, "tickets", initialTicket.id) : null
    , [firestore, initialTicket.id]);

    useEffect(() => {
        if (!ticketRef) return;
        const unsub = onSnapshot(ticketRef, (doc) => {
            if(doc.exists()) {
                const data = { id: doc.id, ...doc.data() } as Ticket;
                setTicket(data);
                setNewPriority(data.priority);
                setNewDepartment(data.department);
            }
        });
        return () => unsub();
    }, [ticketRef, initialTicket.id]);

    const handleStatusChange = async (newStatus: any, extraData: any = {}) => {
        if (!ticketRef || !firestore || !user) return;
        
        if (ticket.type === 'purchase' && newStatus === 'purchased' && !extraData.expectedDeliveryDate) {
            setIsDeliveryDialogOpen(true);
            return;
        }

        setIsUpdating(true);

        try {
            if (newStatus === 'resolved' || newStatus === 'delivered') {
                const isPurchase = ticket.type === 'purchase';
                const commentData = {
                    ticketId: ticket.id,
                    userId: user.uid,
                    userName: user.name,
                    userAvatarUrl: user.avatarUrl || '',
                    message: isPurchase 
                        ? `✅ [MERCADORIA ENTREGUE]\nA solicitação de compra foi marcada como concluída e a mercadoria foi entregue.`
                        : `✅ [CHAMADO FINALIZADO]\nO atendimento foi concluído e o chamado foi marcado como resolvido.`,
                    createdAt: serverTimestamp(),
                };
                await addDoc(collection(firestore, "tickets", ticket.id, "comments"), commentData);
            }

            const updateData: any = {
                status: newStatus,
                updatedAt: serverTimestamp(),
                ...extraData
            };

            // Ao fechar ou mudar status, limpamos a flag de reabertura do usuário
            if (newStatus === 'resolved' || newStatus === 'delivered') {
                updateData.reopenedByUser = false;
            }

            await updateDoc(ticketRef, updateData);
            
            toast({ title: "Status atualizado!" });
            
            if (newStatus === 'resolved' || newStatus === 'delivered') {
                triggerTicketResolvedEmail({
                    ticketNumber: ticket.ticketNumber,
                    ticketTitle: ticket.title,
                    userName: ticket.userName,
                    userEmail: ticket.userEmail,
                    ticketUrl: typeof window !== 'undefined' ? window.location.href : '',
                });
            }
            
            setIsDeliveryDialogOpen(false);
        } catch (error) {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleResendOpeningEmail = async () => {
        if (!firestore) return;
        setIsSendingEmail(true);
        try {
            const settingsRef = doc(firestore, 'settings', 'emails');
            const settingsSnap = await getDoc(settingsRef);
            const emailSettings = settingsSnap.exists() ? settingsSnap.data() as EmailSettings : null;

            const isPurchase = ticket.type === 'purchase';
            const userCustomTemplates = emailSettings ? {
                subject: isPurchase ? emailSettings.purchaseSubject : emailSettings.supportSubject,
                body: isPurchase ? emailSettings.purchaseBody : emailSettings.supportBody,
            } : undefined;

            const staffCustomTemplates = (emailSettings?.staffSubject && emailSettings?.staffBody) ? {
                subject: emailSettings.staffSubject,
                body: emailSettings.staffBody,
            } : undefined;

            await triggerTicketCreatedEmail({
                ticketNumber: ticket.ticketNumber,
                title: ticket.title,
                userName: ticket.userName,
                userEmail: ticket.userEmail,
                ccEmail: ticket.ccEmail || undefined,
                description: ticket.description,
                type: ticket.type,
                customTemplates: userCustomTemplates,
            });

            if (supportUsers && supportUsers.length > 0) {
                const supportEmails = supportUsers
                  .filter(su => su.receivesEmails !== false)
                  .map(su => su.email)
                  .filter((email): email is string => !!email);
                  
                if(supportEmails.length > 0) {
                    await triggerTicketCreatedSupportEmail({
                        ticketNumber: ticket.ticketNumber,
                        title: ticket.title,
                        creatorName: ticket.userName,
                        supportEmails: supportEmails,
                        description: ticket.description,
                        type: ticket.type,
                        customTemplates: staffCustomTemplates,
                    });
                }
            }

            toast({ title: "E-mails de abertura reenviados!" });
        } catch (error) {
            toast({ title: "Erro ao reenviar e-mails", variant: "destructive" });
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleResendClosingEmail = async () => {
        setIsSendingEmail(true);
        try {
            await triggerTicketResolvedEmail({
                ticketNumber: ticket.ticketNumber,
                ticketTitle: ticket.title,
                userName: ticket.userName,
                userEmail: ticket.userEmail,
                ticketUrl: typeof window !== 'undefined' ? window.location.href : '',
            });
            toast({ title: "E-mail de fechamento reenviado!" });
        } catch (error) {
            toast({ title: "Erro ao reenviar e-mail", variant: "destructive" });
        } finally {
            setIsSendingEmail(false);
        }
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

    const handleReopenTicket = async () => {
        if (!reopenReason.trim()) {
            toast({ title: "Por favor, informe o motivo da reabertura.", variant: "destructive" });
            return;
        }

        if (!firestore || !ticketRef || !user) return;

        setIsUpdating(true);
        const isPurchase = ticket.type === 'purchase';
        const newStatus = isPurchase ? 'in_quotation' : 'in_progress';
        const isActionByUser = user.uid === ticket.userId;

        try {
            const commentData = {
                ticketId: ticket.id,
                userId: user.uid,
                userName: user.name,
                userAvatarUrl: user.avatarUrl || '',
                message: isActionByUser 
                    ? `⚠️ [REABERTURA PELO USUÁRIO]\n\nO cliente informou que o problema persiste.\nMotivo: ${reopenReason}`
                    : `⚠️ [REABERTURA POR SUPORTE]\n\nMotivo informado: ${reopenReason}`,
                createdAt: serverTimestamp(),
            };
            await addDoc(collection(firestore, "tickets", ticket.id, "comments"), commentData);

            await updateDoc(ticketRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                rating: null,
                reopenedByUser: isActionByUser // Ativa sinalização visual para TI se for o usuário
            });

            toast({ title: "Chamado reaberto com sucesso!" });
            setIsReopenDialogOpen(false);
            setReopenReason("");
        } catch (error) {
            toast({ title: "Erro ao reabrir chamado", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePriorityChange = () => {
        if (!ticketRef) return;
        setIsUpdating(true);
        
        const slaDays = newPriority === 'high' ? 1 : newPriority === 'normal' ? 3 : 7;
        const creationDate = ticket.createdAt?.toDate() || new Date();
        const newDeadline = ticket.type === 'purchase' ? null : addBusinessDays(creationDate, slaDays);

        const updateData = { 
            priority: newPriority,
            deadline: newDeadline ? Timestamp.fromDate(newDeadline) : null,
            updatedAt: serverTimestamp() 
        };

        updateDoc(ticketRef, updateData)
        .then(() => {
            toast({ title: "Prioridade e SLA atualizados!" });
            setIsPriorityDialogOpen(false)
        })
        .catch(() => {
            toast({ title: "Erro ao atualizar prioridade", variant: "destructive" });
        })
        .finally(() => setIsUpdating(false));
    }

    const handleDepartmentChange = async () => {
        if (!ticketRef || !firestore || !user) return;
        if (newDepartment === ticket.department) {
            setIsDepartmentDialogOpen(false);
            return;
        }

        setIsUpdating(true);
        try {
            const logMsg = `🏢 [ALTERAÇÃO DE SETOR]\nO setor foi alterado de "${ticket.department}" para "${newDepartment}" pela equipe técnica.`;

            await addDoc(collection(firestore, "tickets", ticket.id, "comments"), {
                ticketId: ticket.id,
                userId: user.uid,
                userName: user.name,
                userAvatarUrl: user.avatarUrl || '',
                message: logMsg,
                createdAt: serverTimestamp(),
            });

            await updateDoc(ticketRef, { 
                department: newDepartment,
                updatedAt: serverTimestamp() 
            });

            toast({ title: "Setor atualizado com sucesso!" });
            setIsDepartmentDialogOpen(false);
        } catch (error) {
            toast({ title: "Erro ao atualizar setor", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAttendantChange = async (attendantId: string) => {
        if (!ticketRef || !firestore || !user) return;
        
        const attendantUser = supportUsers?.find(su => su.id === attendantId);
        const isAssigning = attendantId !== 'null';
        
        const updateData: any = { 
            assignedTo: isAssigning ? attendantId : null,
            assignedUserName: attendantUser ? attendantUser.name : null,
            assignedUserEmail: attendantUser ? attendantUser.email : null,
            updatedAt: serverTimestamp()
        };

        if (isAssigning && ticket.status === 'open') {
            updateData.status = ticket.type === 'purchase' ? 'in_quotation' : 'in_progress';
        }

        setIsUpdating(true);
        try {
            const logMsg = isAssigning 
                ? `👤 [ATRIBUIÇÃO]\nO chamado foi atribuído ao técnico: ${attendantUser?.name || 'N/A'}`
                : `👤 [ATRIBUIÇÃO]\nO técnico responsável foi removido.`;

            await addDoc(collection(firestore, "tickets", ticket.id, "comments"), {
                ticketId: ticket.id,
                userId: user.uid,
                userName: user.name,
                userAvatarUrl: user.avatarUrl || '',
                message: logMsg,
                createdAt: serverTimestamp(),
            });

            await updateDoc(ticketRef, updateData);
            toast({ title: isAssigning ? "Atendente atribuído!" : "Atendente removido!" });
        } catch (error) {
            toast({ title: "Erro ao atribuir atendente", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    if (authLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const isPurchase = ticket.type === 'purchase';

    return (
        <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2 print:hidden">
                {!isPreview ? (
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs">
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                        Voltar para a lista
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" asChild className="text-primary border-primary hover:bg-primary hover:text-white transition-all h-8 px-2 text-xs">
                        <Link href={`/tickets/${ticket.id}`}>
                            <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                            Abrir em Tela Cheia
                        </Link>
                    </Button>
                )}

                {canEdit && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isSendingEmail} className="h-8 px-2 text-xs">
                                {isSendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Mail className="h-3.5 w-3.5 mr-1.5" />}
                                Notificações
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Comunicação por E-mail</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs" onClick={handleResendOpeningEmail}>
                                <SendHorizontal className="h-3.5 w-3.5 mr-2" /> Reenviar Abertura
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-xs"
                                onClick={handleResendClosingEmail} 
                                disabled={!isFinished}
                            >
                                <CheckCircle className="h-3.5 w-3.5 mr-2" /> Reenviar Conclusão
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Sinalização para TI/ADM sobre reabertura pelo usuário */}
            {canEdit && ticket.reopenedByUser && !isFinished && (
                <Alert variant="destructive" className="animate-pulse bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-bold text-[11px] uppercase tracking-wider">Atenção: Chamado Reaberto pelo Cliente</AlertTitle>
                    <AlertDescription className="text-xs">
                        Este registro foi reaberto pelo solicitante em menos de 24h. Por favor, revise o motivo no histórico.
                    </AlertDescription>
                </Alert>
            )}
            
            <div className={cn(
                "grid gap-4 print:block print:space-y-6",
                isPreview ? "grid-cols-1" : "lg:grid-cols-3"
            )}>
                {/* Coluna Principal */}
                <div className={cn(isPreview ? "col-span-1" : "lg:col-span-2", "space-y-4 min-w-0")}>
                    <Card className="print:shadow-none print:border-2 overflow-hidden">
                        <CardHeader className="p-4 sm:p-6 space-y-2">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        {isPurchase && <Badge variant="outline" className="w-fit text-[9px] h-4 px-1.5 bg-primary/5 text-primary border-primary/20"><ShoppingCart className="h-2.5 w-2.5 mr-1"/> COMPRA DE TI</Badge>}
                                        {ticket.reopenedByUser && !isFinished && <Badge variant="destructive" className="w-fit text-[9px] h-4 px-1.5 animate-bounce"><AlertTriangle className="h-2.5 w-2.5 mr-1"/> REABERTO</Badge>}
                                    </div>
                                    <CardTitle className="font-headline text-lg sm:text-xl break-words leading-tight">
                                        {ticket.ticketNumber ? `#${ticket.ticketNumber} - ` : ''}{ticket.title}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2 print:hidden shrink-0">
                                    {canEdit && !isAssignedToMe && user && (
                                        <Button 
                                            variant="default" 
                                            size="sm" 
                                            className="h-7 px-2 text-[9px] uppercase font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                            onClick={() => handleAttendantChange(user.uid)}
                                            disabled={isUpdating}
                                        >
                                            <UserPlus className="h-3 w-3 mr-1" />
                                            Atribuir a mim
                                        </Button>
                                    )}
                                    {canEdit && !isPreview && (
                                        <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimir Chamado" className="h-7 w-7">
                                            <Printer className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Badge variant={statusMap[ticket.status]?.variant || 'default'} className="h-7 text-[10px] px-2 font-bold uppercase tracking-wider">
                                        {statusMap[ticket.status]?.label || ticket.status}
                                    </Badge>
                                </div>
                            </div>
                            <CardDescription className="text-[11px] print:text-black">
                                Criado por {ticket.userName} • {ticket.createdAt ? format(ticket.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="bg-muted/20 p-4 rounded-lg border border-dashed mb-6">
                                <p className="text-foreground whitespace-pre-wrap leading-relaxed break-words overflow-hidden text-xs sm:text-sm italic">
                                    {ticket.description}
                                </p>
                            </div>

                            {ticket.attachments && ticket.attachments.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-xs">Anexos ({ticket.attachments.length})</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {ticket.attachments.map((url, index) => (
                                            <Button key={index} variant="secondary" size="sm" asChild className="h-7 text-[10px] px-2">
                                                <a href={url} target="_blank" rel="noopener noreferrer">
                                                    <Paperclip className="h-3 w-3 mr-1" />
                                                    Anexo {index + 1}
                                                </a>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-3">
                                <DeadlineIndicator 
                                    createdAt={ticket.createdAt} 
                                    deadline={ticket.deadline} 
                                    status={ticket.status}
                                    type={ticket.type}
                                    purchaseDate={ticket.purchaseDate}
                                    expectedDeliveryDate={ticket.expectedDeliveryDate}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="print:shadow-none print:border-2 bg-muted/5 border-dashed">
                        <CardHeader className="p-4 flex flex-row items-center gap-2 space-y-0">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            <CardTitle className="font-headline text-sm uppercase tracking-wider">Dados da Solicitação</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-[11px]">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-[9px] uppercase text-muted-foreground">Solicitante</span>
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3 text-primary" />
                                        <span className="font-medium">{ticket.userName}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-[9px] uppercase text-muted-foreground">Empresa</span>
                                    <div className="flex items-center gap-2">
                                        <Building className="h-3 w-3 text-primary" />
                                        <span className="font-medium">{ticket.company}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between pr-4">
                                        <span className="font-bold text-[9px] uppercase text-muted-foreground">Setor</span>
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsDepartmentDialogOpen(true)}>
                                                <Pencil className="h-2 w-2" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-3 w-3 text-primary" />
                                        <span className="font-medium">{ticket.department}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-[9px] uppercase text-muted-foreground">Tipo de Serviço</span>
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="h-3 w-3 text-primary" />
                                        <span className="font-medium">{ticket.service}</span>
                                    </div>
                                </div>

                                {ticket.contactNumber && (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-[9px] uppercase text-muted-foreground">Contato</span>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3 text-primary" />
                                            <span className="font-medium">{ticket.contactNumber}</span>
                                        </div>
                                    </div>
                                )}

                                {ticket.requestedFor && (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-[9px] uppercase text-muted-foreground">{isPurchase ? 'Comprar para' : 'Solicitado para'}</span>
                                        <div className="flex items-center gap-2">
                                            <UserPlus className="h-3 w-3 text-primary" />
                                            <span className="font-medium text-primary">{ticket.requestedFor}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between pr-4">
                                        <span className="font-bold text-[9px] uppercase text-muted-foreground">Prioridade</span>
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsPriorityDialogOpen(true)}>
                                                <Pencil className="h-2 w-2" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-3 w-3 text-primary" />
                                        <Badge variant={priorityMap[ticket.priority]?.variant || 'default'} className="h-4 text-[8px] px-1.5">
                                            {priorityMap[ticket.priority]?.label || ticket.priority}
                                        </Badge>
                                    </div>
                                </div>

                                {ticket.expectedDeliveryDate && (
                                    <div className="flex flex-col gap-1 bg-primary/5 p-1.5 rounded border border-primary/10">
                                        <span className="font-bold text-[9px] uppercase text-primary">Previsão Entrega</span>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3 w-3 text-primary" />
                                            <span className="font-bold text-primary">{format(ticket.expectedDeliveryDate.toDate(), "dd/MM/yyyy")}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Comments ticket={ticket} currentUser={user} supportUsers={supportUsers} />
                </div>

                {/* Coluna Lateral */}
                <div className={cn(isPreview ? "col-span-1" : "lg:col-span-1", "space-y-4 min-w-0")}>
                    {canEdit && (
                        <Card className="print:hidden overflow-hidden border-primary/20">
                            <CardHeader className="p-4 bg-primary/5 border-b border-primary/10">
                                <CardTitle className="font-headline text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    Controle e Gestão
                                </CardTitle>
                            </CardHeader>
                            <CardFooter className="flex-col items-start gap-4 p-4 bg-card">
                                <div className="w-full space-y-1.5">
                                    <p className="text-[9px] font-bold uppercase text-muted-foreground">Status do Fluxo</p>
                                    <Select onValueChange={(v) => handleStatusChange(v)} value={ticket.status} disabled={isUpdating}>
                                        <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {!isPurchase ? (
                                                <>
                                                    <SelectItem value="open" className="text-[11px]">Aberto</SelectItem>
                                                    <SelectItem value="in_progress" className="text-[11px]">Em Atendimento</SelectItem>
                                                    <SelectItem value="awaiting_user" className="text-[11px]">Aguardando Usuário</SelectItem>
                                                    <SelectItem value="awaiting_support" className="text-[11px]">Aguardando Suporte</SelectItem>
                                                    <SelectItem value="resolved" className="text-[11px]">Resolvido</SelectItem>
                                                </>
                                            ) : (
                                                <>
                                                    <SelectItem value="open" className="text-[11px]">Solicitado</SelectItem>
                                                    <SelectItem value="in_quotation" className="text-[11px]">Em Cotação</SelectItem>
                                                    <SelectItem value="purchased" className="text-[11px]">Comprado (Em Trânsito)</SelectItem>
                                                    <SelectItem value="delivered" className="text-[11px]">Entregue / Concluído</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-full space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Responsável TI</p>
                                        {!isAssignedToMe && user && (
                                            <Button 
                                                variant="default" 
                                                size="xs" 
                                                className="h-5 px-1.5 text-[8px] uppercase font-bold bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() => handleAttendantChange(user.uid)}
                                                disabled={isUpdating}
                                            >
                                                Assumir
                                            </Button>
                                        )}
                                    </div>
                                    <Select onValueChange={handleAttendantChange} value={ticket.assignedTo || 'null'} disabled={isUpdating}>
                                        <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="null" className="text-[11px]">Ninguém atribuído</SelectItem>
                                            {supportUsers?.map(su => <SelectItem key={su.id} value={su.id} className="text-[11px]">{su.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {isFinished ? (
                                    <Button className="w-full h-9 text-[11px] font-bold" variant="destructive" onClick={() => setIsReopenDialogOpen(true)} disabled={isUpdating}>
                                        {isUpdating ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                                        REABRIR CHAMADO
                                    </Button>
                                ) : (
                                    <>
                                        {!isPurchase ? (
                                            <Button className="w-full h-9 text-[11px] font-bold" onClick={() => handleStatusChange('resolved')} disabled={isUpdating}>
                                                {isUpdating ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                                                FINALIZAR ATENDIMENTO
                                            </Button>
                                        ) : (
                                            <Button className="w-full h-9 text-[11px] font-bold" variant="outline" onClick={() => handleStatusChange('delivered')} disabled={isUpdating}>
                                                {isUpdating ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" /> : <Package className="mr-1.5 h-3.5 w-3.5" />}
                                                CONFIRMAR ENTREGA
                                            </Button>
                                        )}
                                    </>
                                )}
                            </CardFooter>
                        </Card>
                    )}

                    {/* Botão de reabertura para USUÁRIO (Dentro de 24h) */}
                    {canUserReopen && (
                        <Card className="print:hidden border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                            <CardHeader className="p-4">
                                <CardTitle className="text-xs font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4" /> Problema não resolvido?
                                </CardTitle>
                                <CardDescription className="text-[10px] leading-relaxed">
                                    Você tem até 24 horas após o fechamento para reabrir este chamado caso a solução não tenha funcionado.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="p-4 pt-0">
                                <Button className="w-full h-9 text-[11px] font-bold bg-orange-600 hover:bg-orange-700" onClick={() => setIsReopenDialogOpen(true)} disabled={isUpdating}>
                                    REABRIR CHAMADO
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {canEdit && user && <InternalNotes ticketId={ticket.id} currentUser={user} />}
                    {isFinished && <RatingSection ticketId={ticket.id} ticketCreatorId={ticket.userId} currentUser={user} />}
                </div>

                {/* Modais */}
                <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-base">{ticket.status === 'purchased' ? 'Atualizar Entrega' : 'Informar Entrega'}</DialogTitle>
                        </DialogHeader>
                        <div className="py-2 space-y-2">
                            <Label className="text-xs">Data Prevista</Label>
                            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsDeliveryDialogOpen(false)} className="text-xs">Cancelar</Button>
                            <Button size="sm" onClick={confirmPurchaseStatus} disabled={isUpdating} className="text-xs">
                                {isUpdating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Confirmar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <MessageSquareWarning className="h-4 w-4 text-destructive" />
                                Reabertura de Chamado
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-2 space-y-2">
                            <Label className="text-xs">Motivo da Reabertura</Label>
                            <Textarea 
                                placeholder={isOwner ? "Explique por que a solução anterior não funcionou..." : "Descreva aqui o motivo..."} 
                                value={reopenReason} 
                                onChange={(e) => setReopenReason(e.target.value)} 
                                rows={3} 
                                className="text-sm" 
                            />
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setIsReopenDialogOpen(false); setReopenReason(""); }} className="text-xs">Cancelar</Button>
                            <Button variant="destructive" size="sm" onClick={handleReopenTicket} disabled={isUpdating || !reopenReason.trim()} className="text-xs">
                                {isUpdating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Confirmar Reabertura
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isPriorityDialogOpen} onOpenChange={setIsPriorityDialogOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle className="text-base">Alterar Prioridade</DialogTitle></DialogHeader>
                        <div className="py-2 space-y-2">
                            <Label className="text-xs">Nova Prioridade</Label>
                            <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low" className="text-xs">Baixa (7 dias)</SelectItem>
                                    <SelectItem value="normal" className="text-xs">Normal (3 dias)</SelectItem>
                                    <SelectItem value="high" className="text-xs">Alta (24h)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsPriorityDialogOpen(false)} className="text-xs">Cancelar</Button>
                            <Button size="sm" onClick={handlePriorityChange} disabled={isUpdating} className="text-xs">
                                {isUpdating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle className="text-base">Corrigir Setor</DialogTitle></DialogHeader>
                        <div className="py-2 space-y-2">
                            <Label className="text-xs">Setor Correto</Label>
                            <Select value={newDepartment} onValueChange={setNewDepartment}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {departmentOptions.map(dep => (
                                        <SelectItem key={dep} value={dep} className="text-xs">{dep}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsDepartmentDialogOpen(false)} className="text-xs">Cancelar</Button>
                            <Button size="sm" onClick={handleDepartmentChange} disabled={isUpdating} className="text-xs">
                                {isUpdating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
