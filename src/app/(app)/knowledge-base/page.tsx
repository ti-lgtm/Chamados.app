'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { KnowledgeBaseArticle } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    BookOpen, 
    Settings, 
    ExternalLink, 
    Laptop, 
    Users2, 
    Coins, 
    Scale, 
    Network, 
    Briefcase,
    Star,
    ArrowRight,
    Calendar
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categoryIcons: Record<string, any> = {
    "TI": Laptop,
    "RH": Users2,
    "Financeiro": Coins,
    "Jurídico": Scale,
    "Sistemas": Network,
    "Administrativo": Briefcase,
    "Geral": BookOpen,
};

export default function KnowledgeBasePage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const isStaff = user?.role === 'admin' || user?.role === 'ti';

    const articlesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'knowledge_base');
    }, [firestore]);

    const { data: articles, isLoading } = useCollection<KnowledgeBaseArticle>(articlesQuery);

    const filteredArticles = useMemo(() => {
        if (!articles) return [];
        return articles.filter(a => {
            const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 a.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || a.category === selectedCategory;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }, [articles, searchTerm, selectedCategory]);

    const featuredArticles = useMemo(() => {
        return articles?.filter(a => a.isFeatured).sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 4) || [];
    }, [articles]);

    const categories = useMemo(() => {
        if (!articles) return [];
        const cats = new Set(articles.map(a => a.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [articles]);

    const formatDate = (article: KnowledgeBaseArticle) => {
        const date = article.updatedAt?.toDate() || article.createdAt?.toDate();
        if (!date) return '';
        return format(date, "dd/MM/yyyy", { locale: ptBR });
    };

    if (isLoading) {
        return (
            <div className="space-y-8 max-w-7xl mx-auto">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-1/3" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex-1 space-y-2">
                    <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
                        <BookOpen className="h-10 w-10 text-primary" />
                        Base de Conhecimento
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Encontre guias rápidos, manuais de sistemas e procedimentos internos.
                    </p>
                </div>
                {isStaff && (
                    <Button asChild variant="outline" className="shrink-0">
                        <Link href="/admin/knowledge-base">
                            <Settings className="mr-2 h-4 w-4" />
                            Gerenciar Base
                        </Link>
                    </Button>
                )}
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col md:flex-row gap-4 bg-muted/30 p-6 rounded-xl border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Pesquise por título ou palavra-chave..." 
                        className="pl-10 h-12 text-lg bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 shrink-0">
                    <Button 
                        variant={selectedCategory === null ? "default" : "outline"} 
                        onClick={() => setSelectedCategory(null)}
                        className="rounded-full"
                    >
                        Tudo
                    </Button>
                    {categories.map(cat => (
                        <Button 
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "outline"} 
                            onClick={() => setSelectedCategory(cat)}
                            className="rounded-full"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Destaques */}
            {!searchTerm && !selectedCategory && featuredArticles.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        Mais Acessados
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {featuredArticles.map(article => (
                            <a 
                                key={article.id} 
                                href={article.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group block"
                            >
                                <Card className="h-full border-primary/20 hover:border-primary transition-all hover:shadow-lg bg-primary/5">
                                    <CardHeader className="pb-2">
                                        <Badge variant="secondary" className="w-fit mb-2">{article.category}</Badge>
                                        <CardTitle className="text-base line-clamp-2 group-hover:text-primary">{article.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground line-clamp-3 mb-4">{article.description}</p>
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center text-xs font-bold text-primary">
                                                Acessar Manual <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-2.5 w-2.5" />
                                                {formatDate(article)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Mostrador Geral */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-headline">
                    {searchTerm || selectedCategory ? 'Resultados da busca' : 'Todos os Procedimentos'}
                </h2>
                
                {filteredArticles.length === 0 ? (
                    <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed">
                        <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">Nenhum resultado encontrado</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArticles.map(article => {
                            const Icon = categoryIcons[article.category] || BookOpen;
                            return (
                                <a 
                                    key={article.id} 
                                    href={article.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="group"
                                >
                                    <Card className="h-full transition-all hover:shadow-md border-muted hover:border-primary/50 relative overflow-hidden flex flex-col">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Icon className="h-16 w-16" />
                                        </div>
                                        <CardHeader>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <Badge variant="outline" className="bg-background">{article.category}</Badge>
                                            </div>
                                            <CardTitle className="text-xl group-hover:text-primary transition-colors">{article.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col">
                                            <CardDescription className="text-sm line-clamp-3 mb-6">
                                                {article.description}
                                            </CardDescription>
                                            
                                            <div className="mt-auto space-y-4">
                                                <div className="flex justify-end">
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full border border-dashed">
                                                        <Calendar className="h-3 w-3" />
                                                        Postado em: {formatDate(article)}
                                                    </span>
                                                </div>
                                                <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground">
                                                    Visualizar Documento
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
