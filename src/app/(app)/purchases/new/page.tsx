
'use client';

import { useAuth } from '@/hooks/useAuth';
import { NewPurchaseForm } from "@/components/purchases/new-purchase-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShoppingCart } from 'lucide-react';

export default function NewPurchasePage() {
    const { user, loading } = useAuth();

    if (loading) {
         return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-3xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <ShoppingCart className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline text-2xl">Solicitar Compra de TI</CardTitle>
                    </div>
                    <CardDescription>
                        Utilize este formulário para solicitar a aquisição de novos equipamentos, softwares ou periféricos. 
                        Sua solicitação passará por cotação e aprovação técnica.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <NewPurchaseForm />
                </CardContent>
            </Card>
        </div>
    );
}
