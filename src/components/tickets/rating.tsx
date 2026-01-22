"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, onSnapshot, serverTimestamp, limit } from "firebase/firestore";
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { AppUser, Rating } from "@/lib/types";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    const ratingQuery = useMemoFirebase(() =>
        firestore ? query(
            collection(firestore, "users", ticketCreatorId, "tickets", ticketId, "ratings"),
            limit(1)
        ) : null
    , [firestore, ticketId, ticketCreatorId]);

    useEffect(() => {
        if (!ratingQuery) return;

        const unsubscribe = onSnapshot(ratingQuery, (snapshot) => {
            if (!snapshot.empty) {
                const ratingData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Rating;
                setExistingRating(ratingData);
                setRating(ratingData.rating);
            }
            setLoading(false);
        },
        (err) => {
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path: `users/${ticketCreatorId}/tickets/${ticketId}/ratings`
            });
            errorEmitter.emit('permission-error', contextualError);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [ratingQuery, ticketCreatorId, ticketId]);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({ title: "Por favor, selecione uma avaliação.", variant: "destructive" });
            return;
        }
        if (!currentUser || !firestore) return;

        setIsSubmitting(true);

        const ratingData = {
            ticketId,
            userId: currentUser.uid,
            rating,
            comment,
            createdAt: serverTimestamp(),
        };

        const ratingCollectionRef = collection(firestore, "users", ticketCreatorId, "tickets", ticketId, "ratings");

        addDoc(ratingCollectionRef, ratingData)
            .then(() => {
                toast({ title: "Avaliação enviada com sucesso!" });
            })
            .catch((error) => {
                toast({ title: "Erro ao enviar avaliação", variant: "destructive" });
                const contextualError = new FirestorePermissionError({
                    operation: 'create',
                    path: `users/${ticketCreatorId}/tickets/${ticketId}/ratings`,
                    requestResourceData: ratingData
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    if (loading) {
        return <Card><CardContent className="p-6"><div className="flex justify-center"><Loader2 className="animate-spin" /></div></CardContent></Card>;
    }

    if (currentUser?.uid !== ticketCreatorId) {
        return null; // Only creator can rate
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Avalie o Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {existingRating ? (
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Sua avaliação:</p>
                        <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={cn("h-6 w-6", existingRating.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                            ))}
                        </div>
                        {existingRating.comment && <p className="mt-2 text-sm italic">"{existingRating.comment}"</p>}
                    </div>
                ) : (
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
                            Enviar Avaliação
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
