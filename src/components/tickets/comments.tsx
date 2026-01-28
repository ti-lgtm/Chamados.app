"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { AppUser, Comment as CommentType, Ticket } from "@/lib/types";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, Paperclip } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { triggerNewCommentEmail } from "@/app/actions/email";
import { uploadAttachments } from "@/app/actions/upload";
import { Input } from "../ui/input";

interface CommentsProps {
    ticket: Ticket;
    currentUser: AppUser | null;
}

const commentSchema = z.object({
    message: z.string().max(1000, "A mensagem é muito longa.").optional(),
    attachments: z.custom<FileList>().optional(),
}).refine(data => !!data.message || (data.attachments && data.attachments.length > 0), {
    message: "Você deve enviar uma mensagem ou um anexo.",
    path: ["message"],
});


const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '';

export function Comments({ ticket, currentUser }: CommentsProps) {
    const firestore = useFirestore();
    const [comments, setComments] = useState<CommentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const ticketId = ticket.id;

    const form = useForm<z.infer<typeof commentSchema>>({
        resolver: zodResolver(commentSchema),
        defaultValues: { message: "", attachments: undefined },
    });

    const fileRef = form.register('attachments');
    
    const commentsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, "tickets", ticketId, "comments"), orderBy("createdAt", "asc")) : null
    , [firestore, ticketId]);

    useEffect(() => {
        if (!commentsQuery) return;

        const unsubscribe = onSnapshot(commentsQuery, (querySnapshot) => {
            const commentsData = querySnapshot.docs.map(docSnap => {
                return { id: docSnap.id, ...docSnap.data() } as CommentType;
            });
            setComments(commentsData);
            setLoading(false);
        },
        (err) => {
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path: `tickets/${ticketId}/comments`
            });
            errorEmitter.emit('permission-error', contextualError);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [commentsQuery, ticketId]);

    async function onSubmit(values: z.infer<typeof commentSchema>) {
        if (!currentUser || !firestore) return;
        setIsSubmitting(true);

        let attachmentUrls: string[] = [];
        try {
            if (values.attachments && values.attachments.length > 0) {
                const formData = new FormData();
                Array.from(values.attachments).forEach(file => {
                    formData.append('attachments', file);
                });
                attachmentUrls = await uploadAttachments(formData);
            }
        } catch (uploadError) {
            console.error("Upload error:", uploadError);
            toast({ title: "Erro ao fazer upload dos anexos", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        const commentData = {
            ticketId,
            userId: currentUser.uid,
            userName: currentUser.name,
            userAvatarUrl: currentUser.avatarUrl || '',
            message: values.message || "",
            createdAt: serverTimestamp(),
            attachments: attachmentUrls,
        };

        const commentsCollectionRef = collection(firestore, "tickets", ticketId, "comments");

        addDoc(commentsCollectionRef, commentData)
            .then(() => {
                form.reset({ message: "", attachments: undefined });
                
                let recipientEmail: string | undefined | null = null;
                let recipientName: string | undefined | null = null;

                if (currentUser.uid === ticket.userId) {
                    recipientEmail = ticket.assignedUserEmail;
                    recipientName = ticket.assignedUserName;
                } else { 
                    recipientEmail = ticket.userEmail;
                    recipientName = ticket.userName;
                }

                if (recipientEmail && recipientName) {
                    const emailMessage = values.message || (attachmentUrls.length > 0 ? "Um novo anexo foi adicionado." : "Nova atividade no chamado.");
                    triggerNewCommentEmail({
                        recipientEmail,
                        recipientName,
                        ticketNumber: ticket.ticketNumber,
                        ticketTitle: ticket.title,
                        commenterName: currentUser.name,
                        commentMessage: emailMessage,
                    });
                }
            })
            .catch((error) => {
                toast({ title: "Erro ao enviar comentário", variant: "destructive" });
                const contextualError = new FirestorePermissionError({
                    operation: 'create',
                    path: `tickets/${ticketId}/comments`,
                    requestResourceData: commentData
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Histórico de Comentários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                    {loading && Array.from({ length: 2 }).map((_, i) => (
                        <div className="flex items-start space-x-4" key={i}>
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    ))}
                    {!loading && comments.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                    )}
                    {!loading && comments.map((comment) => (
                        <div key={comment.id} className="flex items-start space-x-4">
                            <Avatar>
                                <AvatarImage src={comment.userAvatarUrl} />
                                <AvatarFallback>{comment.userName ? getInitials(comment.userName) : '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{comment.userName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}
                                    </p>
                                </div>
                                {comment.message && <p className="text-sm text-foreground whitespace-pre-wrap">{comment.message}</p>}
                                {comment.attachments && comment.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {comment.attachments.map((url, index) => {
                                            const fileName = url.split('/').pop()?.split('?')[0] || `Anexo ${index + 1}`;
                                            const decodedFileName = decodeURIComponent(fileName);
                                            return (
                                                <a 
                                                    key={index} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline"
                                                >
                                                    <Paperclip className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{decodedFileName.substring(decodedFileName.indexOf('_') + 1)}</span>
                                                </a>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {currentUser && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start space-x-4">
                            <Avatar>
                                <AvatarImage src={currentUser.avatarUrl} />
                                <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea placeholder="Adicionar um comentário..." {...field} rows={3} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="attachments"
                                    render={() => (
                                        <FormItem>
                                            <FormControl>
                                                <Input type="file" multiple {...fileRef} className="text-sm" />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" size="sm" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Enviar
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                )}
            </CardContent>
        </Card>
    );
}
