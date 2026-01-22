import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewTicketPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Abrir Novo Chamado</CardTitle>
          <CardDescription>
            Descreva seu problema ou solicitação em detalhes para que nossa equipe possa ajudar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewTicketForm />
        </CardContent>
      </Card>
    </div>
  );
}
