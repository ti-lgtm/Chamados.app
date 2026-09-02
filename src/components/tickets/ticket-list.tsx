
'use client';

import type { Ticket } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DeadlineIndicator } from "./deadline-indicator";
import { Star, ShoppingCart, Wrench, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TicketListProps {
  tickets: Ticket[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
    open: { label: 'Aberto', variant: 'destructive' },
    in_progress: { label: 'Em Andamento', variant: 'default' },
    awaiting_user: { label: 'Aguardando Usuário', variant: 'outline' },
    awaiting_support: { label: 'Aguardando Suporte', variant: 'outline' },
    resolved: { label: 'Resolvido', variant: 'secondary' },
    in_quotation: { label: 'Em Cotação', variant: 'outline' },
    purchased: { label: 'Comprado', variant: 'default' },
    delivered: { label: 'Entregue', variant: 'secondary' },
};

export function TicketList({ tickets, selectedId, onSelect }: TicketListProps) {
  const router = useRouter();

  if (tickets.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center h-80">
            <div className="text-3xl">🎟️</div>
            <h3 className="mt-4 text-lg font-semibold font-headline">Nenhum registro encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Parece que não há nenhum chamado ou compra para exibir.
            </p>
        </div>
    );
  }

  const handleItemClick = (id: string) => {
    if (onSelect && window.innerWidth >= 1024) {
        onSelect(id);
    } else {
        router.push(`/tickets/${id}`);
    }
  };

  return (
    <div className="space-y-3 px-1.5 pb-6">
      {tickets.map((ticket) => {
        const isFinished = ticket.status === 'resolved' || ticket.status === 'delivered';
        const isReopenedAlert = ticket.reopenedByUser && !isFinished;

        return (
            <Card 
                key={ticket.id} 
                className={cn(
                    "group transition-all cursor-pointer active:scale-[0.995] border-l-4 overflow-hidden",
                    selectedId === ticket.id 
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md" 
                        : "border-l-transparent hover:border-primary/40 hover:shadow-sm",
                    isReopenedAlert && "border-l-red-600 bg-red-50/30 dark:bg-red-950/10"
                )}
                onClick={() => handleItemClick(ticket.id)}
            >
                <CardHeader className="p-3 pb-1.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {ticket.type === 'purchase' ? (
                                <Badge variant="outline" className="text-[8px] bg-primary/5 text-primary border-primary/20 shrink-0 h-4 px-1">
                                    <ShoppingCart className="h-2 w-2 mr-1"/> COMPRA
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[8px] bg-muted text-muted-foreground shrink-0 h-4 px-1">
                                    <Wrench className="h-2 w-2 mr-1"/> SUPORTE
                                </Badge>
                            )}
                            <span className="text-[9px] font-bold text-muted-foreground shrink-0">
                                #{ticket.ticketNumber}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {isReopenedAlert && <AlertTriangle className="h-3 w-3 text-red-600 animate-pulse" title="Reaberto pelo usuário" />}
                            <Badge variant={statusMap[ticket.status]?.variant || 'default'} className="text-[8px] h-4 px-1 shrink-0">
                                {statusMap[ticket.status]?.label || ticket.status}
                            </Badge>
                        </div>
                    </div>

                    <CardTitle className={cn(
                        "font-headline text-xs line-clamp-2 leading-tight transition-colors",
                        selectedId === ticket.id ? "text-primary" : "group-hover:text-primary",
                        isReopenedAlert && "text-red-700 dark:text-red-400"
                    )}>
                        {ticket.title}
                    </CardTitle>

                    <CardDescription className="flex flex-wrap items-center text-[9px] gap-1 pt-0.5">
                        <span className="truncate">{ticket.userName} • {ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}</span>
                        {ticket.assignedUserName && (
                            <>
                                <span className="text-muted-foreground/30">|</span>
                                <span className="font-medium text-foreground">TI: {ticket.assignedUserName.split(' ')[0]}</span>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-3 pt-0">
                    <div className="mt-1">
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

                {ticket.status === 'resolved' && typeof ticket.rating === 'number' && (
                    <CardFooter className="p-3 pt-0 justify-end">
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn(
                                    "h-2.5 w-2.5",
                                    i < (ticket.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                                )} />
                            ))}
                        </div>
                    </CardFooter>
                )}
            </Card>
        );
      })}
    </div>
  );
}
