
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import type { KnowledgeBaseArticle } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    Plus, 
    Pencil, 
    Trash2, 
    ExternalLink, 
    ShieldAlert, 
    Loader2, 
    BookOpen,
    Star,
    ArrowLeft
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { KnowledgeBaseForm } from '@/components/knowledge-base/knowledge-base-form';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function AdminKnowledgeBasePage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<KnowledgeBaseArticle | null>(null);

    const isStaff = user?.role === 'admin' || user?.role === 'ti';

    const articlesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'knowledge_base'), orderBy('category', 'asc'), orderBy('title', 'asc'));
    }, [firestore]);

    const { data: articles, isLoading } = useCollection<KnowledgeBaseArticle>(articlesQuery);

    const handleEdit = (article: KnowledgeBaseArticle) => {
        setEditingArticle(article);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        if (!confirm('Tem certeza que deseja excluir este procedimento?')) return;

        deleteDoc(doc(firestore, 'knowledge_base', id))
            .then(() => toast({ title: "Procedimento excluído!" }))
            .catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `knowledge_base/${id}`,
                    operation: 'delete'
                }));
            });
    };

    if (user && !isStaff) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-destructive">
                <ShieldAlert className="h-16 w-16 mb-4" />
                <h1 className="text-2xl font-bold">Acesso Negado</h1>
                <p>Você não tem permissão para gerenciar a base de conhecimento.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
             <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Link href="/knowledge-base" className="hover:text-foreground flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" /> Voltar para a Base
                        </Link>
                    </div>
                    <h1 className="text-3xl font-headline font-bold">Gerenciar Base de Conhecimento</h1>
                    <p className="text-muted-foreground">Cadastre e edite os manuais técnicos para os usuários.</p>
                </div>
                <Button onClick={() => { setEditingArticle(null); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Procedimento
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Lista de Procedimentos ({articles?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Título</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead className="hidden md:table-cell">Status</TableHead>
                                <TableHead className="hidden lg:table-cell">Link</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : articles?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum procedimento cadastrado.</TableCell></TableRow>
                            ) : (
                                articles?.map(article => (
                                    <TableRow key={article.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{article.title}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">{article.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{article.category}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {article.isFeatured && (
                                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
                                                    <Star className="h-3 w-3 mr-1 fill-yellow-600" /> Destaque
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                                                Ver Doc <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(article.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingArticle ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo para disponibilizar este guia na base de conhecimento.
                        </DialogDescription>
                    </DialogHeader>
                    <KnowledgeBaseForm 
                        article={editingArticle} 
                        onSuccess={() => { setIsFormOpen(false); setEditingArticle(null); }} 
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
