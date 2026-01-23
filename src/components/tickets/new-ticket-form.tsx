'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirestore, useStorage, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { triggerTicketCreatedEmail } from '@/app/actions/email';

const formSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  priority: z.enum(['low', 'normal', 'high'], { required_error: 'A prioridade é obrigatória.' }),
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
      title: '',
      description: '',
      priority: 'normal',
    },
  });

  const fileRef = form.register('attachments');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db || !storage) {
      toast({
        title: 'Erro de autenticação ou configuração',
        description: 'Você precisa estar logado e o Firebase deve estar configurado corretamente.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Handle attachments upload first
      let attachmentUrls: string[] = [];
      if (values.attachments && values.attachments.length > 0) {
        const uploadPromises = Array.from(values.attachments).map(async (file) => {
          const storageRef = ref(storage, `attachments/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        });
        attachmentUrls = await Promise.all(uploadPromises);
      }

      // 2. Proceed with Firestore transaction to create the ticket
      const newTicketData = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'tickets');
        const counterDoc = await transaction.get(counterRef);
        
        const newNumber = (counterDoc.data()?.lastNumber || 0) + 1;
        
        transaction.set(counterRef, { lastNumber: newNumber }, { merge: true });

        const newTicketRef = doc(collection(db, "tickets"));
        
        const ticketPayload = {
          ticketNumber: newNumber,
          title: values.title,
          description: values.description,
          priority: values.priority,
          status: 'open' as const,
          userId: user.uid,
          userName: user.name,
          userEmail: user.email,
          assignedTo: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          attachments: attachmentUrls,
        };

        transaction.set(newTicketRef, ticketPayload);

        return { id: newTicketRef.id, payload: ticketPayload };
      });

      // 3. Trigger email notification (fire and forget)
      triggerTicketCreatedEmail({
        ticketNumber: newTicketData.payload.ticketNumber,
        title: newTicketData.payload.title,
        userName: newTicketData.payload.userName,
        userEmail: newTicketData.payload.userEmail,
      });

      toast({
        title: `Chamado #${newTicketData.payload.ticketNumber} criado com sucesso!`,
        description: 'Sua solicitação foi enviada para a equipe de TI.',
      });
      router.push(`/tickets/${newTicketData.id}`);

    } catch (error: any) {
      console.error('Erro ao criar chamado:', error);
      
      let description = 'Ocorreu um erro inesperado ao criar seu chamado. Tente novamente.';
      
      if (error.code) {
        switch (error.code) {
          case 'storage/unauthorized':
            description = 'Você não tem permissão para enviar arquivos. Contate o administrador.';
            break;
          case 'storage/canceled':
            description = 'O upload do anexo foi cancelado.';
            break;
          case 'storage/unknown':
            description = 'Ocorreu um erro desconhecido no upload. Tente novamente.';
            break;
        }
      }

      toast({
        title: 'Erro ao criar chamado',
        description,
        variant: 'destructive',
      });

      if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
      }

    } finally {
      setLoading(false);
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
