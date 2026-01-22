import Link from "next/link";
import type { Ticket } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
                Parece que não há nenhum chamado para exibir aqui.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card key={ticket.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="font-headline text-lg hover:text-primary">
                <Link href={`/tickets/${ticket.id}`}>{ticket.title}</Link>
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant={priorityMap[ticket.priority]?.variant || 'default'}>
                    {priorityMap[ticket.priority]?.label || ticket.priority}
                </Badge>
                <Badge variant={statusMap[ticket.status]?.variant || 'default'}>
                    {statusMap[ticket.status]?.label || ticket.status}
                </Badge>
              </div>
            </div>
            <CardDescription>
                Criado {formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/tickets/${ticket.id}`}>Ver Detalhes</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
