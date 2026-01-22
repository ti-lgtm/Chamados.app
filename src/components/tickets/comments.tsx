"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { useFirestore, useMemoFirebase } from "@/firebase";
import type { AppUser, Comment as CommentType } from "@/lib/types";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface CommentsProps {
    ticketId: string;
    currentUser: AppUser | null;
}

const commentSchema = z.object({
    message: z.string().min(1, "A mensagem não pode estar vazia.").max(1000, "A mensagem é muito longa."),
});

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

export function Comments({ ticketId, currentUser }: CommentsProps) {
    const firestore = useFirestore();
    const [comments, setComments] = useState<(CommentType & { user?: AppUser })[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof commentSchema>>({
        resolver: zodResolver(commentSchema),
        defaultValues: { message: "" },
    });
    
    const commentsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, "comments"), where("ticketId", "==", ticketId), orderBy("createdAt", "asc")) : null
    , [firestore, ticketId]);

    useEffect(() => {
        if (!commentsQuery || !firestore) return;

        const unsubscribe = onSnapshot(commentsQuery, async (querySnapshot) => {
            const commentsData = await Promise.all(
                querySnapshot.docs.map(async (docSnap) => {
                    const comment = { id: docSnap.id, ...docSnap.data() } as CommentType;
                    const userSnap = await getDoc(doc(firestore, "users", comment.userId));
                    const user = userSnap.exists() ? { uid: userSnap.id, ...userSnap.data() } as AppUser : undefined;
                    return { ...comment, user };
                })
            );
            setComments(commentsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [commentsQuery, firestore]);

    async function onSubmit(values: z.infer<typeof commentSchema>) {
        if (!currentUser || !firestore) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, "comments"), {
                ticketId,
                userId: currentUser.uid,
                message: values.message,
                createdAt: serverTimestamp(),
            });
            form.reset();
        } catch (error) {
            toast({ title: "Erro ao enviar comentário", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
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
                                <AvatarImage src={comment.user?.avatarUrl} />
                                <AvatarFallback>{comment.user ? getInitials(comment.user.name) : '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{comment.user?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}
                                    </p>
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.message}</p>
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
