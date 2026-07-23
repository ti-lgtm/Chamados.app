
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { KnowledgeBaseArticle } from '@/lib/types';

const categories = ["TI", "RH", "Financeiro", "Jurídico", "Sistemas", "Administrativo", "Geral"];

const articleSchema = z.object({
    title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
    description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
    link: z.string().url("Insira uma URL válida (ex: https://docs.google.com/...)"),
    category: z.string().min(1, "Selecione uma categoria."),
    isFeatured: z.boolean().default(false),
    order: z.preprocess((v) => Number(v), z.number().optional()),
});

interface KnowledgeBaseFormProps {
    article?: KnowledgeBaseArticle | null;
    onSuccess: () => void;
}

export function KnowledgeBaseForm({ article, onSuccess }: KnowledgeBaseFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof articleSchema>>({
        resolver: zodResolver(articleSchema),
        defaultValues: {
            title: article?.title || '',
            description: article?.description || '',
            link: article?.link || '',
            category: article?.category || 'TI',
            isFeatured: article?.isFeatured || false,
            order: article?.order || 0,
        },
    });

    useEffect(() => {
        if (article) {
            form.reset({
                title: article.title,
                description: article.description,
                link: article.link,
                category: article.category,
                isFeatured: article.isFeatured,
                order: article.order || 0,
            });
        }
    }, [article, form]);

    async function onSubmit(values: z.infer<typeof articleSchema>) {
        if (!firestore) return;
        setLoading(true);

        const data = {
            ...values,
            updatedAt: serverTimestamp(),
            ...(article ? {} : { createdAt: serverTimestamp() }),
        };

        const docRef = article 
            ? doc(firestore, 'knowledge_base', article.id)
            : doc(collection(firestore, 'knowledge_base'));

        const op = article ? updateDoc(docRef, data) : setDoc(docRef, data);

        op.then(() => {
            toast({ title: `Procedimento ${article ? 'atualizado' : 'criado'} com sucesso!` });
            onSuccess();
        })
        .catch((err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: article ? 'update' : 'create',
                requestResourceData: data
            }));
        })
        .finally(() => setLoading(false));
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Título do Procedimento</FormLabel>
                            <FormControl><Input placeholder="Ex: Como configurar VPN" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoria / Setor</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Breve Descrição</FormLabel>
                            <FormControl><Textarea placeholder="Explique resumidamente o que este guia ensina." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="link"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link Externo (Google Docs, PDF, etc)</FormLabel>
                            <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex items-center gap-8">
                    <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Destaque</FormLabel>
                                    <FormDescription>Exibir no topo (Mais Acessados).</FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="order"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ordem (Opcional)</FormLabel>
                                <FormControl><Input type="number" {...field} className="w-24" /></FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    {article ? 'Salvar Alterações' : 'Publicar Procedimento'}
                </Button>
            </form>
        </Form>
    );
}
