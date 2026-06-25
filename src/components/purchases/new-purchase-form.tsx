
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, serverTimestamp, runTransaction, doc, Timestamp } from 'firebase/firestore';
import { useFirestore, FirestorePermissionError } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { uploadAttachments } from '@/app/actions/upload';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Package } from 'lucide-react';
import { triggerTicketCreatedEmail } from '@/app/actions/email';

const departmentOptions = [
    "Administrativo", "Arquitetura", "Arquivo", "Assistência Técnica", "Atendimento ao Cliente",
    "Auditoria", "Comercial", "Contabilidade", "Diretoria", "Financeiro",
    "Gestão Pessoal", "Jurídico", "Obra", "Planejamento", "Projetos",
    "Suprimentos", "Marketing", "Qualidade",
] as const;

const formSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  company: z.string().min(2, { message: 'O nome da empresa é obrigatório.' }),
  department: z.enum(departmentOptions, { required_error: 'O setor é obrigatório.' }),
  contactNumber: z.string().min(10, { message: 'O número de contato é obrigatório.' }),
  description: z.string().min(10, { message: 'Descreva os itens desejados com detalhes.' }),
  priority: z.enum(['low', 'normal', 'high'], { required_error: 'A prioridade é obrigatória.' }),
  attachments: z.custom<FileList>().optional(),
});

export function NewPurchaseForm() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      company: '',
      contactNumber: '',
      priority: 'normal',
    },
  });

  const fileRef = form.register('attachments');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) return;
    setLoading(true);

    try {
      let attachmentUrls: string[] = [];
      if (values.attachments && values.attachments.length > 0) {
        const formData = new FormData();
        Array.from(values.attachments).forEach(file => formData.append('attachments', file));
        attachmentUrls = await uploadAttachments(formData);
      }

      const newPurchaseData = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'tickets');
        const counterDoc = await transaction.get(counterRef);
        const newNumber = (counterDoc.data()?.lastNumber || 0) + 1;
        
        transaction.set(counterRef, { lastNumber: newNumber }, { merge: true });

        const newRef = doc(collection(db, "tickets"));
        const payload = {
          ticketNumber: newNumber,
          type: 'purchase' as const,
          title: values.title,
          company: values.company,
          department: values.department,
          service: 'COMPRAS',
          contactNumber: values.contactNumber,
          description: values.description,
          priority: values.priority,
          status: 'open' as const,
          userId: user.uid,
          userName: user.name,
          userEmail: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          attachments: attachmentUrls,
        };

        transaction.set(newRef, payload);
        return { id: newRef.id, number: newNumber };
      });

      triggerTicketCreatedEmail({
        ticketNumber: newPurchaseData.number,
        title: values.title,
        userName: user.name,
        userEmail: user.email,
        description: values.description,
      });

      toast({ title: `Solicitação de Compra #${newPurchaseData.number} criada!` });
      router.push(`/tickets/${newPurchaseData.id}`);

    } catch (error: any) {
      toast({ title: 'Erro ao criar solicitação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>O que você precisa comprar?</FormLabel>
              <FormControl><Input placeholder="Ex: Mouse sem fio e Teclado Mecânico" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Setor Solicitante</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {departmentOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição Detalhada / Justificativa</FormLabel>
              <FormControl><Textarea placeholder="Descreva os itens e por que eles são necessários." rows={4} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Seu Contato (Ramal/WhatsApp)</FormLabel>
                    <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Urgência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="low">Baixa (Pode esperar)</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta (Urgente)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="attachments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anexar Orçamentos ou Fotos (Opcional)</FormLabel>
              <FormControl><Input type="file" multiple {...fileRef} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Solicitação de Compra
        </Button>
      </form>
    </Form>
  );
}
