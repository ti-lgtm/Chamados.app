
'use client';

import { useState, useEffect, type ClipboardEvent } from 'react';
import Image from 'next/image';
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { AppUser, Comment as CommentType, Ticket } from '@/lib/types';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Send, Paperclip, X, User, UserPen, MessageSquare } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { triggerNewCommentEmail } from '@/app/actions/email';
import { uploadAttachments } from '@/app/actions/upload';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CommentsProps {
  ticket: Ticket;
  currentUser: AppUser | null;
  supportUsers?: any[] | null;
}

const commentSchema = z
  .object({
    message: z.string().max(1000, 'A mensagem é muito longa.').optional(),
    attachments: z.custom<FileList>().optional(),
  })
  .refine(
    (data) => !!data.message || (data.attachments && data.attachments.length > 0),
    {
      message: 'Você deve enviar uma mensagem ou um anexo.',
      path: ['message'],
    }
  );

const getInitials = (name: string) =>
  name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '';

export function Comments({ ticket, currentUser, supportUsers }: CommentsProps) {
  const firestore = useFirestore();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const ticketId = ticket.id;

  const isResolved = ticket.status === 'resolved';
  const isSupportStaff = !!currentUser && (currentUser.role === 'ti' || currentUser.role === 'admin');

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { message: '', attachments: undefined },
  });

  const attachments = form.watch('attachments');
  const fileRef = form.register('attachments');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia.';
    if (hour >= 12 && hour < 18) return 'Boa tarde.';
    return 'Boa noite.';
  };

  const cannedResponses = [
    {
      id: 'configurado',
      label: 'Configurado com sucesso',
      text: 'A configuração solicitada foi realizada com sucesso.',
    },
    {
      id: 'verificando',
      label: 'Verificando ocorrido',
      text: 'Recebemos seu chamado e já estamos verificando o ocorrido. Retornaremos em breve com mais informações.',
    },
    {
      id: 'informacoes',
      label: 'Solicitar mais informações',
      text: 'Para prosseguir com o seu atendimento, por favor, nos forneça mais detalhes sobre o problema. Especificamente, precisamos saber...',
    },
    {
      id: 'sem_contato',
      label: 'Tentativa de contato sem sucesso',
      text: 'Tentamos entrar em contato por telefone para agilizar a solução, mas não obtivemos sucesso. Por favor, nos informe o melhor horário para ligarmos.',
    },
    {
      id: 'resolvido_encerrando',
      label: 'Resolvido e encerrando',
      text: 'O problema reportado foi resolvido. Estamos marcando este chamado como "Resolvido". Caso o problema persista, por favor, nos informe respondendo a este chamado.\n\nMotivo:',
    },
    {
      id: 'fornecedor_cadastrado',
      label: 'Fornecedor cadastrado',
      text: 'O fornecedor foi cadastrado em nosso sistema com sucesso. Já pode seguir com o processo.',
    },
  ];

  const handleCannedResponse = (value: string) => {
    if (!value) return;
    const response = cannedResponses.find((r) => r.id === value);
    if (response) {
      const greeting = getGreeting();
      const newText = `${greeting}\n\n${response.text}`;
      form.setValue('message', newText, { shouldValidate: true });
    }
  };

  const commentsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'tickets', ticketId, 'comments'),
            orderBy('createdAt', 'asc')
          )
        : null,
    [firestore, ticketId]
  );

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      event.preventDefault();

      const currentAttachments = form.getValues('attachments');
      const existingFiles = currentAttachments
        ? Array.from(currentAttachments)
        : [];
      const combinedFiles = [...existingFiles, ...imageFiles];

      const dataTransfer = new DataTransfer();
      combinedFiles.forEach((file) => dataTransfer.items.add(file));

      form.setValue('attachments', dataTransfer.files, {
        shouldValidate: true,
      });

      toast({
        title: `${imageFiles.length} imagem(ns) colada(s) com sucesso!`,
        description: 'A imagem foi adicionada à lista de anexos.',
      });
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    const currentAttachments = form.getValues('attachments');
    if (!currentAttachments) return;

    const newFiles = Array.from(currentAttachments).filter(
      (_, index) => index !== indexToRemove
    );

    const dataTransfer = new DataTransfer();
    newFiles.forEach((file) => dataTransfer.items.add(file));

    form.setValue('attachments', dataTransfer.files, { shouldValidate: true });
  };

  useEffect(() => {
    if (!commentsQuery) return;

    const unsubscribe = onSnapshot(
      commentsQuery,
      (querySnapshot) => {
        const commentsData = querySnapshot.docs.map((docSnap) => {
          return { id: docSnap.id, ...docSnap.data() } as CommentType;
        });
        setComments(commentsData);
        setLoading(false);
      },
      (err) => {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: `tickets/${ticketId}/comments`,
        });
        errorEmitter.emit('permission-error', contextualError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [commentsQuery, ticketId]);

  async function onSubmit(values: z.infer<typeof commentSchema>) {
    if (!currentUser || !firestore) return;
    setIsSubmitting(true);

    let attachmentUrls: string[] = [];
    try {
      if (values.attachments && values.attachments.length > 0) {
        const formData = new FormData();
        Array.from(values.attachments).forEach((file) => {
          formData.append('attachments', file);
        });
        attachmentUrls = await uploadAttachments(formData);
      }
    } catch (uploadError: any) {
      toast({
        title: 'Erro ao fazer upload dos anexos',
        description: uploadError.message || "Ocorreu um erro inesperado.",
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const commentData = {
      ticketId,
      userId: currentUser.uid,
      userName: currentUser.name,
      userAvatarUrl: currentUser.avatarUrl || '',
      message: values.message || '',
      createdAt: serverTimestamp(),
      attachments: attachmentUrls,
    };

    const commentsCollectionRef = collection(
      firestore,
      'tickets',
      ticketId,
      'comments'
    );

    addDoc(commentsCollectionRef, commentData)
      .then(() => {
        form.reset({ message: '', attachments: undefined });

        if (ticket.status !== 'resolved') {
          const ticketRef = doc(firestore, 'tickets', ticketId);
          let newStatus = ticket.status;
          if (currentUser.uid === ticket.userId) {
            if (ticket.status !== 'open') {
              newStatus = 'awaiting_support';
            }
          } else {
            newStatus = 'awaiting_user';
          }

          if (newStatus !== ticket.status) {
            updateDoc(ticketRef, { status: newStatus, updatedAt: serverTimestamp() });
          }
        }

        let recipientEmail = currentUser.uid === ticket.userId ? ticket.assignedUserEmail : ticket.userEmail;
        let recipientName = currentUser.uid === ticket.userId ? ticket.assignedUserName : ticket.userName;

        if (recipientEmail && recipientName) {
          triggerNewCommentEmail({
            recipientEmail,
            recipientName,
            ticketNumber: ticket.ticketNumber,
            ticketTitle: ticket.title,
            commenterName: currentUser.name,
            commentMessage: values.message || (attachmentUrls.length > 0 ? 'Anexo enviado.' : 'Nova atividade.'),
          });
        }
      })
      .catch((error) => {
        toast({ title: 'Erro ao enviar comentário', variant: 'destructive' });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="font-headline text-xl flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Histórico de Conversas
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-8">
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[135px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border/20 before:via-border before:to-border/20">
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div className="flex items-center space-x-4" key={i}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-20 flex-1" />
              </div>
            ))}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhuma interação registrada ainda.
            </p>
          )}
          {!loading &&
            comments.map((comment) => {
                const isSupport = comment.userId !== ticket.userId;
                return (
                    <div key={comment.id} className="relative flex items-center group">
                        <div className="flex items-center w-full">
                            {/* Timestamp Column */}
                            <div className="w-[120px] text-right pr-4 shrink-0">
                                <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase leading-tight">
                                    {comment.createdAt ? format(comment.createdAt.toDate(), "dd/MM/yyyy") : '--/--/----'}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                    {comment.createdAt ? format(comment.createdAt.toDate(), "HH:mm") : '--:--'}
                                </p>
                            </div>

                            {/* Timeline Node */}
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 z-10 shrink-0 transition-colors shadow-sm",
                                isSupport ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"
                            )}>
                                {isSupport ? <UserPen className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>

                            {/* Message Bubble */}
                            <div className="flex-1 ml-4 relative">
                                <div className={cn(
                                    "p-4 rounded-lg border shadow-sm text-sm relative transition-all hover:shadow-md",
                                    isSupport 
                                        ? "bg-accent/5 border-primary/20 dark:bg-primary/5" 
                                        : "bg-card border-border"
                                )}>
                                    {/* Bubble Arrow */}
                                    <div className={cn(
                                        "absolute top-1/2 -left-2 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[8px]",
                                        isSupport ? "border-r-primary/20" : "border-r-border"
                                    )} />

                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={cn(
                                                "font-bold uppercase text-[10px] tracking-wider",
                                                isSupport ? "text-primary" : "text-muted-foreground"
                                            )}>
                                                {isSupport ? 'Atendente' : 'Solicitante'}
                                            </span>
                                            <span className="font-bold text-[11px] truncate max-w-[150px] sm:max-w-none">
                                                {comment.userName.toUpperCase()}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground italic">
                                                {isSupport ? 'registrou um apontamento.' : 'enviou uma mensagem.'}
                                            </span>
                                        </div>
                                    </div>

                                    {comment.message && (
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                            {comment.message}
                                        </div>
                                    )}

                                    {comment.attachments && comment.attachments.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            {comment.attachments.map((url, idx) => {
                                                const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                                                return isImage ? (
                                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative w-24 h-24 rounded-md overflow-hidden border hover:opacity-80 transition-opacity">
                                                        <Image src={url} alt="Anexo" layout="fill" className="object-cover" />
                                                    </a>
                                                ) : (
                                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] bg-muted/50 p-2 rounded-md hover:bg-muted transition-colors">
                                                        <Paperclip className="h-3 w-3" />
                                                        <span className="truncate max-w-[100px]">{decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Anexo')}</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {currentUser && (isSupportStaff || !isResolved) && (
          <div className="pt-6 border-t border-dashed">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex gap-4">
                    <Avatar className="h-10 w-10 shrink-0 border">
                        <AvatarImage src={currentUser.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(currentUser.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                        <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Textarea
                                placeholder="Descreva aqui o apontamento ou cole uma imagem..."
                                {...field}
                                rows={4}
                                onPaste={handlePaste}
                                className="resize-none focus-visible:ring-primary shadow-inner"
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {isSupportStaff && (
                                    <Select onValueChange={handleCannedResponse}>
                                        <SelectTrigger className="h-9 text-xs w-full sm:w-[200px]">
                                            <SelectValue placeholder="Respostas rápidas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cannedResponses.map((res) => (
                                                <SelectItem key={res.id} value={res.id} className="text-xs">{res.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <div className="relative w-full sm:w-auto">
                                    <Input type="file" multiple {...fileRef} className="h-9 text-xs opacity-0 absolute inset-0 cursor-pointer z-20" />
                                    <Button type="button" variant="outline" size="sm" className="h-9 text-xs w-full">
                                        <Paperclip className="h-3 w-3 mr-2" />
                                        Anexar Arquivos
                                    </Button>
                                </div>
                            </div>
                            <Button type="submit" size="sm" disabled={isSubmitting} className="w-full sm:w-auto shadow-md">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                Registrar Apontamento
                            </Button>
                        </div>

                        {attachments && attachments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                {Array.from(attachments).map((file, index) => (
                                    <div key={index} className="flex items-center justify-between text-[11px] bg-muted/50 p-2 rounded border border-dashed">
                                        <span className="truncate max-w-[150px]">{file.name}</span>
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveAttachment(index)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                </form>
            </Form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
