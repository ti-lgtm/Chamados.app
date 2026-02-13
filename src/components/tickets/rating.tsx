"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, serverTimestamp, limit, runTransaction, doc } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { AppUser, Rating } from "@/lib/types";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RatingSectionProps {
    ticketId: string;
    ticketCreatorId: string;
    currentUser: AppUser | null;
}

export function RatingSection({ ticketId, ticketCreatorId, currentUser }: RatingSectionProps) {
    const firestore = useFirestore();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [existingRating, setExistingRating] = useState<Rating | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const isCreator = currentUser?.uid === ticketCreatorId;

    const ratingQuery = useMemoFirebase(() =>
        firestore ? query(
            collection(firestore, "tickets", ticketId, "ratings"),
            limit(1)
        ) : null
    , [firestore, ticketId]);

    useEffect(() => {
        if (!ratingQuery) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(ratingQuery, (snapshot) => {
            if (!snapshot.empty) {
                const ratingData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Rating;
                setExistingRating(ratingData);
                setRating(ratingData.rating);
                setComment(ratingData.comment || "");
            } else {
                setExistingRating(null);
            }
            setLoading(false);
        },
        (err) => {
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path: `tickets/${ticketId}/ratings`
            });
            errorEmitter.emit('permission-error', contextualError);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [ratingQuery, ticketId]);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({ title: "Por favor, selecione uma avaliação.", variant: "destructive" });
            return;
        }
        if (!currentUser || !firestore) return;

        setIsSubmitting(true);

        try {
            await runTransaction(firestore, async (transaction) => {
                const ticketRef = doc(firestore, "tickets", ticketId);

                if (existingRating) {
                    // Update existing rating
                    const ratingRef = doc(firestore, "tickets", ticketId, "ratings", existingRating.id);
                    transaction.update(ratingRef, {
                        rating,
                        comment,
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    // Create new rating
                    const ratingCollectionRef = collection(firestore, "tickets", ticketId, "ratings");
                    const newRatingDocRef = doc(ratingCollectionRef);
                    
                    const ratingData = {
                        ticketId,
                        userId: currentUser.uid,
                        rating,
                        comment,
                        createdAt: serverTimestamp(),
                    };
                    transaction.set(newRatingDocRef, ratingData);
                }
                
                // Update the denormalized rating on the ticket in both cases
                transaction.update(ticketRef, { rating });
            });
            
            toast({ title: `Avaliação ${existingRating ? 'atualizada' : 'enviada'} com sucesso!` });
    
        } catch (error) {
            toast({ title: "Erro ao salvar avaliação", variant: "destructive" });
            const contextualError = new FirestorePermissionError({
                operation: 'write', // Generic operation for transaction
                path: `tickets/${ticketId}`,
                requestResourceData: { rating: rating }
            });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <Card><CardContent className="p-6"><div className="flex justify-center"><Loader2 className="animate-spin" /></div></CardContent></Card>;
    }
    
    // Case 1: Not the creator of the ticket.
    if (!isCreator) {
        // If there's no rating, support staff sees nothing.
        if (!existingRating) return null;

        // Support staff sees the static rating.
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Avaliação do Atendimento</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Avaliação do cliente:</p>
                        <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={cn("h-6 w-6", existingRating.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                            ))}
                        </div>
                        {existingRating.comment && <p className="mt-4 text-sm italic bg-muted/50 p-3 rounded-md">"{existingRating.comment}"</p>}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Case 2: The user is the creator. Show the rating/editing form.
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{existingRating ? "Editar sua Avaliação" : "Avalie o Atendimento"}</CardTitle>
                <CardDescription>Seu feedback é muito importante para nós.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <>
                    <div className="flex items-center justify-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                    "h-8 w-8 cursor-pointer transition-colors",
                                    (hoverRating || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                                )}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                            />
                        ))}
                    </div>
                    <Textarea
                        placeholder="Deixe um comentário opcional..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {existingRating ? "Atualizar Avaliação" : "Enviar Avaliação"}
                    </Button>
                </>
            </CardContent>
        </Card>
    );

}
