
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, serverTimestamp, runTransaction, doc, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
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
import { Loader2, Info, ShoppingCart, Wrench } from 'lucide-react';
import { triggerTicketCreatedEmail, triggerTicketCreatedSupportEmail } from '@/app/actions/email';
import type { AppUser } from '@/lib/types';

const departmentOptions = [
    "Administrativo",
    "Arquitetura",
    "Arquivo",
    "Assistência Técnica",
    "Atendimento ao Cliente",
    "Auditoria",
    "Comercial",
    "Contabilidade",
    "Diretoria",
    "Financeiro",
    "Gestão Pessoal",
    "Jurídico",
    "Obra",
    "Planejamento",
    "Projetos",
    "Suprimentos",
    "Marketing",
    "Qualidade",
] as const;

const serviceOptions = [
    "COMPRA",
    "BACKUP",
    "CONTA DE USUÁRIO",
    "CRIAÇÃO DE ACESSO",
    "DESENVOLVIMENTO",
    "E-MAIL",
    "EQUIPAMENTOS",
    "IMPRESSORA",
    "LEGADO",
    "PASTAS E COMPARTILHAMENTOS",
    "REDE/INTRANET",
    "SISTEMAS",
    "SOFTWARES",
    "TELEFONIA",
    "OUTROS",
] as const;

function addBusinessDays(startDate: Date, days: number): Date {
  let date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0=Sunday, 6=Saturday
      added++;
    }
  }
  return date;
}

export function NewTicketForm() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);

  const formSchema = useMemo(() => {
    return z.object({
      title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
      company: z.string().min(2, { message: 'O nome da empresa é obrigatório.' }),
      department: z.enum(departmentOptions, { required_error: 'O setor é obrigatório.' }),
      service: z.enum(serviceOptions, { required_error: 'O serviço é obrigatório.' }),
      contactNumber: z.string().min(10, { message: 'O número de contato é obrigatório e deve incluir o DDD.' }),
      ccEmail: z.string().email({ message: 'Por favor, insira um e-mail válido.' }).optional().or(z.literal('')),
      description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
      priority: z.enum(['low', 'normal', 'high'], { required_error: 'A prioridade é obrigatória.' }),
      attachments: z.custom<FileList>().optional(),
      isForMe: z.enum(['yes', 'no'], { required_error: 'Por favor, informe se o chamado é para você.' }),
      requestedFor: z.string().optional(),
    }).refine((data) => {
      if (data.ccEmail && user?.email && data.ccEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) {
        return false;
      }
      return true;
    }, {
      message: "O e-mail do gestor não pode ser o seu próprio e-mail.",
      path: ["ccEmail"],
    }).refine((data) => {
      if (data.isForMe === 'no' && !data.requestedFor) {
        return false;
      }
      return true;
    }, {
      message: "Por favor, informe para quem é o chamado.",
      path: ["requestedFor"],
    });
  }, [user?.email]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      company: '',
      contactNumber: '',
      ccEmail: '',
      description: '',
      priority: 'normal',
      isForMe: 'yes',
      requestedFor: '',
    },
  });

  const selectedService = form.watch('service');
  const isForMeValue = form.watch('isForMe');
  const fileRef = form.register('attachments');

  const isPurchase = selectedService === 'COMPRA';

  const supportUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', 'in', ['ti', 'admin']));
  }, [db]);

  const { data: supportUsers } = useCollection<AppUser>(supportUsersQuery);

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

      const newTicketData = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'tickets');
        const counterDoc = await transaction.get(counterRef);
        const newNumber = (counterDoc.data()?.lastNumber || 0) + 1;
        
        transaction.set(counterRef, { lastNumber: newNumber }, { merge: true });

        const newTicketRef = doc(collection(db, "tickets"));
        const deadlineDate = isPurchase ? null : addBusinessDays(new Date(), 4);
        
        const ticketPayload = {
          ticketNumber: newNumber,
          type: isPurchase ? 'purchase' : 'support',
          title: values.title,
          company: values.company,
          department: values.department,
          service: values.service,
          contactNumber: values.contactNumber,
          ccEmail: values.ccEmail || null,
          description: values.description,
          priority: values.priority,
          status: 'open' as const,
          userId: user.uid,
          userName: user.name,
          userEmail: user.email,
          requestedFor: values.isForMe === 'no' ? values.requestedFor : null,
          assignedTo: null,
          assignedUserName: null,
          assignedUserEmail: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          attachments: attachmentUrls,
          deadline: deadlineDate ? Timestamp.fromDate(deadlineDate) : null,
        };

        transaction.set(newTicketRef, ticketPayload);
        return { id: newTicketRef.id, payload: ticketPayload };
      });

      triggerTicketCreatedEmail({
        ticketNumber: newTicketData.payload.ticketNumber,
        title: newTicketData.payload.title,
        userName: newTicketData.payload.userName,
        userEmail: newTicketData.payload.userEmail,
        ccEmail: newTicketData.payload.ccEmail || undefined,
        description: newTicketData.payload.description,
      });

      if (supportUsers && supportUsers.length > 0) {
        const supportEmails = supportUsers
          .filter(su => su.receivesEmails !== false)
          .map(su => su.email)
          .filter((email): email is string => !!email);
          
        if(supportEmails.length > 0) {
            triggerTicketCreatedSupportEmail({
                ticketNumber: newTicketData.payload.ticketNumber,
                title: newTicketData.payload.title,
                creatorName: newTicketData.payload.userName,
                supportEmails: supportEmails,
                description: newTicketData.payload.description,
            });
        }
      }

      toast({
        title: `${isPurchase ? 'Solicitação de Compra' : 'Chamado'} #${newTicketData.payload.ticketNumber} criado!`,
        description: isPurchase ? 'Sua solicitação de compra foi enviada para cotação.' : 'Sua solicitação foi enviada para a equipe de TI.',
      });
      router.push(`/tickets/${newTicketData.id}`);

    } catch (error: any) {
      toast({ title: 'Erro ao criar solicitação', variant: 'destructive' });
      if (error instanceof FirestorePermissionError) errorEmitter.emit('permission-error', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <div className="bg-muted/30 p-4 rounded-lg border border-dashed mb-6">
            <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2">
                        {isPurchase ? <ShoppingCart className="h-4 w-4 text-primary" /> : <Wrench className="h-4 w-4 text-primary" />}
                        Tipo de Serviço
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger className={isPurchase ? "border-primary/50 bg-primary/5" : ""}>
                            <SelectValue placeholder="Selecione o tipo de serviço" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {serviceOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option === 'COMPRA' ? '🛒 SOLICITAÇÃO DE COMPRA' : option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>
                        {isPurchase ? "Você está abrindo uma solicitação de material. O fluxo de SLA de suporte não será aplicado." : "Selecione a categoria técnica do seu problema."}
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isPurchase ? 'O que você precisa comprar?' : 'Título do Chamado'}</FormLabel>
              <FormControl>
                <Input placeholder={isPurchase ? "Ex: Mouse sem fio e Teclado Mecânico" : "Ex: Problema com a impressora do 2º andar"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <FormField
              control={form.control}
              name="isForMe"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{isPurchase ? 'A compra é para você?' : 'O chamado é para você?'}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="isForMe-yes" />
                        <Label htmlFor="isForMe-yes">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="isForMe-no" />
                        <Label htmlFor="isForMe-no">Não</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isForMeValue === 'no' && (
                <FormField
                    control={form.control}
                    name="requestedFor"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{isPurchase ? 'Comprar para:' : 'Solicitar para:'}</FormLabel>
                            <FormControl>
                                <Input placeholder="Digite o nome do destinatário" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da empresa vinculada" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Setor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {departmentOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Número de Contato (com DDD)</FormLabel>
                    <FormControl>
                        <Input placeholder="(XX) XXXXX-XXXX" {...field} />
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
                    <FormLabel>{isPurchase ? 'Urgência da Compra' : 'Prioridade'}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o nível" />
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
        </div>

        {!isPurchase && (
            <FormField
                control={form.control}
                name="ccEmail"
                render={({ field }) => (
                    <FormItem>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <FormLabel>E-mail em Cópia (Gestor)</FormLabel>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                            <Info className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-tight">
                                Gestores: não preencher
                            </span>
                        </div>
                    </div>
                    <FormControl>
                        <Input placeholder="gestor@empresa.com" {...field} />
                    </FormControl>
                    <FormDescription>Opcional. Receberá uma cópia da abertura.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isPurchase ? 'Descrição Detalhada / Justificativa' : 'Descrição do Problema'}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={isPurchase ? "Descreva os itens necessários e o motivo da solicitação." : "Descreva o problema em detalhes."}
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
          name="attachments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isPurchase ? 'Anexar Orçamentos ou Fotos' : 'Anexos'}</FormLabel>
              <FormControl>
                <Input type="file" multiple {...fileRef} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPurchase ? 'Enviar Solicitação de Compra' : 'Abrir Chamado'}
        </Button>
      </form>
    </Form>
  );
}
