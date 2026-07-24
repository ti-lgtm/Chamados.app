
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { EmailSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ShieldAlert, Info, ShoppingCart, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmailSettingsPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsUpdating] = useState(false);

    const emailSettingsRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'settings', 'emails');
    }, [firestore]);

    const { data: settings, isLoading } = useDoc<EmailSettings>(emailSettingsRef);

    const [form, setForm] = useState<EmailSettings>({
        supportSubject: '',
        supportBody: '',
        purchaseSubject: '',
        purchaseBody: '',
    });

    useEffect(() => {
        if (settings) {
            setForm({
                supportSubject: settings.supportSubject || '',
                supportBody: settings.supportBody || '',
                purchaseSubject: settings.purchaseSubject || '',
                purchaseBody: settings.purchaseBody || '',
            });
        }
    }, [settings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsUpdating(true);

        setDoc(doc(firestore, 'settings', 'emails'), {
            ...form,
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid
        })
        .then(() => {
            toast({ title: "Configurações de e-mail salvas!" });
        })
        .catch(() => {
            toast({ title: "Erro ao salvar configurações", variant: "destructive" });
        })
        .finally(() => setIsUpdating(false));
    };

    if (user?.role !== 'admin') {
        return <div className="p-8 text-center text-destructive flex items-center gap-2 justify-center"><ShieldAlert /> Acesso Negado</div>;
    }

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-headline font-bold">Personalização de E-mails</h1>
                <p className="text-muted-foreground">Configure os textos dos e-mails automáticos enviados aos usuários.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 dark:bg-blue-900/20 dark:border-blue-800">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-bold mb-1">Dica de Variáveis:</p>
                    <p>Você pode usar as seguintes marcações no texto:</p>
                    <ul className="list-disc list-inside mt-1 font-mono text-[11px]">
                        <li><strong>{"{{nome}}"}</strong> - Nome do usuário</li>
                        <li><strong>{"{{numero}}"}</strong> - Número do chamado</li>
                        <li><strong>{"{{titulo}}"}</strong> - Título do chamado</li>
                        <li><strong>{"{{descricao}}"}</strong> - Descrição completa (apenas no corpo)</li>
                    </ul>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Tabs defaultValue="support" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="support" className="gap-2">
                            <Wrench className="h-4 w-4" /> Chamado de Suporte
                        </TabsTrigger>
                        <TabsTrigger value="purchase" className="gap-2">
                            <ShoppingCart className="h-4 w-4" /> Solicitação de Compra
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="support" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Confirmação de Abertura (Suporte)</CardTitle>
                                <CardDescription>Enviado ao usuário assim que ele abre um chamado técnico.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Assunto do E-mail</label>
                                    <Input 
                                        value={form.supportSubject} 
                                        onChange={e => setForm({...form, supportSubject: e.target.value})} 
                                        placeholder="Ex: Chamado #{{numero}}: {{titulo}}"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Corpo do E-mail (HTML permitido)</label>
                                    <Textarea 
                                        value={form.supportBody} 
                                        onChange={e => setForm({...form, supportBody: e.target.value})} 
                                        rows={10}
                                        placeholder="Olá {{nome}}, seu chamado foi aberto..."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="purchase" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Confirmação de Solicitação (Compra)</CardTitle>
                                <CardDescription>Enviado ao usuário assim que ele solicita um material.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Assunto do E-mail</label>
                                    <Input 
                                        value={form.purchaseSubject} 
                                        onChange={e => setForm({...form, purchaseSubject: e.target.value})} 
                                        placeholder="Ex: Solicitação de Compra #{{numero}}: {{titulo}}"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Corpo do E-mail (HTML permitido)</label>
                                    <Textarea 
                                        value={form.purchaseBody} 
                                        onChange={e => setForm({...form, purchaseBody: e.target.value})} 
                                        rows={10}
                                        placeholder="Olá {{nome}}, sua solicitação de compra está em cotação..."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Mail className="mr-2 h-5 w-5" />}
                        Salvar Templates de E-mail
                    </Button>
                </div>
            </form>
        </div>
    );
}
