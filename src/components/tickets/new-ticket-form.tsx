"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, serverTimestamp, runTransaction, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useFirestore, useStorage } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(5, { message: "O título deve ter pelo menos 5 caracteres." }),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres." }),
  priority: z.enum(["low", "normal", "high"], { required_error: "A prioridade é obrigatória." }),
  attachments: z.custom<FileList>().optional(),
});

export function NewTicketForm() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
    },
  });

  const fileRef = form.register("attachments");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar um chamado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
        let attachmentUrls: string[] = [];
        if (values.attachments && values.attachments.length > 0) {
            for (const file of Array.from(values.attachments)) {
                const storageRef = ref(storage, `attachments/${user.uid}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(snapshot.ref);
                attachmentUrls.push(downloadUrl);
            }
        }

        const newTicketData = await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, 'counters', 'tickets');
            const counterDoc = await transaction.get(counterRef);
            
            const newNumber = (counterDoc.data()?.lastNumber || 0) + 1;
            
            transaction.set(counterRef, { lastNumber: newNumber }, { merge: true });

            const newTicketRef = doc(collection(db, "users", user.uid, "tickets"));
            
            const ticketPayload = {
              ticketNumber: newNumber,
              title: values.title,
              description: values.description,
              priority: values.priority,
              status: "open",
              userId: user.uid,
              assignedTo: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              attachments: attachmentUrls,
            };

            transaction.set(newTicketRef, ticketPayload);

            return { id: newTicketRef.id, number: newNumber };
        });

      toast({
        title: `Chamado #${newTicketData.number} criado com sucesso!`,
        description: "Sua solicitação foi enviada para a equipe de TI.",
      });
      router.push(`/tickets/${newTicketData.id}`);

    } catch (error) {
      setLoading(false);
      toast({
        title: "Erro ao criar chamado",
        description: "Ocorreu um erro ao criar o número do chamado. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error in transaction: ", error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Problema com a impressora do 2º andar" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o problema em detalhes, incluindo mensagens de erro, se houver."
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prioridade</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível de prioridade" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="attachments"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Anexos</FormLabel>
                    <FormControl>
                        <Input type="file" multiple {...fileRef} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Chamado
        </Button>
      </form>
    </Form>
  );
}
