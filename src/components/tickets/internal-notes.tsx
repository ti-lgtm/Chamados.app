'use client';

import { useState, useEffect } from "react";
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { AppUser, InternalNote as InternalNoteType } from "@/lib/types";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MessageSquareQuote } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface InternalNotesProps {
    ticketId: string;
    currentUser: AppUser;
}

const noteSchema = z.object({
    message: z.string().min(1, "A nota não pode estar vazia.").max(1000, "A nota é muito longa."),
});

const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '';

export function InternalNotes({ ticketId, currentUser }: InternalNotesProps) {
    const firestore = useFirestore();
    const [notes, setNotes] = useState<InternalNoteType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof noteSchema>>({
        resolver: zodResolver(noteSchema),
        defaultValues: { message: "" },
    });
    
    const notesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, "tickets", ticketId, "internal_notes"), orderBy("createdAt", "asc")) : null
    , [firestore, ticketId]);

    useEffect(() => {
        if (!notesQuery) {
            setLoading(false);
            return;
        };

        const unsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
            const notesData = querySnapshot.docs.map(docSnap => {
                return { id: docSnap.id, ...docSnap.data() } as InternalNoteType;
            });
            setNotes(notesData);
            setLoading(false);
        },
        (err) => {
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path: `tickets/${ticketId}/internal_notes`
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({ title: "Erro ao carregar notas internas", description: "Você pode não ter permissão para vê-las.", variant: "destructive"});
            setLoading(false);
        });

        return () => unsubscribe();
    }, [notesQuery, ticketId, toast]);

    async function onSubmit(values: z.infer<typeof noteSchema>) {
        if (!currentUser || !firestore) return;
        setIsSubmitting(true);

        const noteData = {
            ticketId,
            userId: currentUser.uid,
            userName: currentUser.name,
            userAvatarUrl: currentUser.avatarUrl || '',
            message: values.message,
            createdAt: serverTimestamp(),
        };

        const notesCollectionRef = collection(firestore, "tickets", ticketId, "internal_notes");

        addDoc(notesCollectionRef, noteData)
            .then(() => {
                form.reset();
            })
            .catch((error) => {
                toast({ title: "Erro ao adicionar nota", variant: "destructive" });
                const contextualError = new FirestorePermissionError({
                    operation: 'create',
                    path: `tickets/${ticketId}/internal_notes`,
                    requestResourceData: noteData
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }

    return (
        <Card className="bg-muted/30 border-dashed">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><MessageSquareQuote className="h-5 w-5"/> Notas Internas</CardTitle>
                <CardDescription>Esta seção é visível apenas para a equipe de TI e administradores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 max-h-72 overflow-y-auto pr-4">
                    {loading && Array.from({ length: 1 }).map((_, i) => (
                        <div className="flex items-start space-x-4" key={i}>
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-6 w-full" />
                            </div>
                        </div>
                    ))}
                    {!loading && notes.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota interna ainda.</p>
                    )}
                    {!loading && notes.map((note) => (
                        <div key={note.id} className="flex items-start space-x-4">
                            <Avatar>
                                <AvatarImage src={note.userAvatarUrl} />
                                <AvatarFallback>{note.userName ? getInitials(note.userName) : '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{note.userName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {note.createdAt ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}
                                    </p>
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{note.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
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
                                            <Textarea placeholder="Adicionar uma nota interna..." {...field} rows={2} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Adicionar Nota
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
