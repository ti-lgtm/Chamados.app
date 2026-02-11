import Link from "next/link";
import type { Ticket } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DeadlineIndicator } from "./deadline-indicator";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketListProps {
  tickets: Ticket[];
}

const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
    open: { label: 'Aberto', variant: 'destructive' },
    in_progress: { label: 'Em Atendimento', variant: 'default' },
    resolved: { label: 'Resolvido', variant: 'secondary' },
};

const priorityMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
    low: { label: 'Baixa', variant: 'secondary' },
    normal: { label: 'Normal', variant: 'default' },
    high: { label: 'Alta', variant: 'destructive' },
};


export function TicketList({ tickets }: TicketListProps) {
  if (tickets.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center h-80">
            <div className="text-3xl">🎟️</div>
            <h3 className="mt-4 text-lg font-semibold font-headline">Nenhum chamado encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Parece que não há nenhum chamado para exibir com o filtro selecionado.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card key={ticket.id}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="order-2 sm:order-1">
                    <CardTitle className="font-headline text-lg hover:text-primary">
                        <Link href={`/tickets/${ticket.id}`}>{ticket.ticketNumber ? `#${ticket.ticketNumber} - ` : ''}{ticket.title}</Link>
                    </CardTitle>
                    <CardDescription>
                        Criado {formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
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
             {ticket.deadline && ticket.createdAt && ticket.status !== 'resolved' && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">PRAZO</p>
                    <DeadlineIndicator createdAt={ticket.createdAt} deadline={ticket.deadline} status={ticket.status} />
                </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/tickets/${ticket.id}`}>Ver Detalhes</Link>
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
