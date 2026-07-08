
'use client';

import Link from "next/link";
import type { Ticket } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DeadlineIndicator } from "./deadline-indicator";
import { Star, ShoppingCart, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TicketListProps {
  tickets: Ticket[];
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

const priorityMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
    low: { label: 'Baixa', variant: 'secondary' },
    normal: { label: 'Normal', variant: 'default' },
    high: { label: 'Alta', variant: 'destructive' },
};


export function TicketList({ tickets }: TicketListProps) {
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

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card 
          key={ticket.id} 
          className="group transition-all hover:shadow-md cursor-pointer hover:border-primary/40 active:scale-[0.995]"
          onClick={() => router.push(`/tickets/${ticket.id}`)}
        >
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="order-2 sm:order-1">
                    <div className="flex items-center gap-2 mb-1">
                        {ticket.type === 'purchase' ? (
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20"><ShoppingCart className="h-3 w-3 mr-1"/> COMPRA</Badge>
                        ) : (
                            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground"><Wrench className="h-3 w-3 mr-1"/> SUPORTE</Badge>
                        )}
                        <CardTitle className="font-headline text-lg group-hover:text-primary transition-colors">
                            {ticket.ticketNumber ? `#${ticket.ticketNumber} - ` : ''}{ticket.title}
                        </CardTitle>
                    </div>
                    <CardDescription className="flex flex-wrap items-center text-xs">
                        <span>Criado por {ticket.userName} • {ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}</span>
                        {ticket.assignedUserName && (
                            <>
                                <span className="mx-1.5">•</span>
                                <span>Atribuído a <span className="font-medium text-foreground">{ticket.assignedUserName}</span></span>
                            </>
                        )}
                    </CardDescription>
                </div>
              <div className="flex gap-2 order-1 sm:order-2 self-end sm:self-auto flex-shrink-0">
                <Badge variant={priorityMap[ticket.priority]?.variant || 'default'}>
                    {priorityMap[ticket.priority]?.label || ticket.priority}
                </Badge>
                <Badge variant={statusMap[ticket.status]?.variant || 'default'}>
                    {statusMap[ticket.status]?.label || ticket.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
             <div className="mt-4">
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
          <CardFooter className="flex justify-between items-center">
            <Button variant="secondary" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Ver Detalhes
            </Button>
            {ticket.status === 'resolved' && typeof ticket.rating === 'number' && (
                <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn(
                            "h-4 w-4",
                            i < (ticket.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                        )} />
                    ))}
                </div>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
