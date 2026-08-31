
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { KnowledgeBaseArticle } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    ArrowLeft, 
    Printer, 
    Download, 
    Share2, 
    Loader2, 
    ExternalLink,
    Info,
    Copy,
    Check,
    Mail,
    Facebook,
    Twitter,
    MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function ArticleViewPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [iframeLoading, setIframeLoading] = useState(true);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const articleRef = useMemoFirebase(() => {
        if (!firestore || !params.id) return null;
        return doc(firestore, 'knowledge_base', params.id);
    }, [firestore, params.id]);

    const { data: article, isLoading } = useDoc<KnowledgeBaseArticle>(articleRef);

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        
        let cleanedUrl = url.trim();

        if (cleanedUrl.includes('docs.google.com')) {
            cleanedUrl = cleanedUrl.split('?')[0];
            if (cleanedUrl.endsWith('/edit') || cleanedUrl.endsWith('/view')) {
                cleanedUrl = cleanedUrl.replace(/\/(edit|view)$/, '/preview');
            } else if (!cleanedUrl.endsWith('/preview')) {
                cleanedUrl = cleanedUrl.replace(/\/$/, '') + '/preview';
            }
            return cleanedUrl;
        }
        
        if (cleanedUrl.includes('drive.google.com/file/d/')) {
            cleanedUrl = cleanedUrl.split('?')[0];
            cleanedUrl = cleanedUrl.replace(/\/(view|edit)$/, '/preview');
            if (!cleanedUrl.endsWith('/preview')) {
                cleanedUrl = cleanedUrl.replace(/\/$/, '') + '/preview';
            }
            return cleanedUrl;
        }

        return cleanedUrl;
    };

    const handleShare = () => {
        setIsShareDialogOpen(true);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: "Link copiado!" });
        } catch (err) {
            toast({ title: "Erro ao copiar link", variant: "destructive" });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Carregando documento...</p>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Documento não encontrado.</h1>
                <Button onClick={() => router.push('/knowledge-base')} className="mt-4">Voltar para a Base</Button>
            </div>
        );
    }

    const embedUrl = getEmbedUrl(article.link);
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `Confira este manual: ${article.title}`;

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-4 print:h-auto print:space-y-0">
            {/* Toolbar - Oculta na impressão */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 pb-2 border-b print:hidden">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/knowledge-base')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-headline font-bold line-clamp-1">{article.title}</h1>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{article.category}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 md:flex-none">
                        <Printer className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Imprimir</span>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="flex-1 md:flex-none">
                        <a href={article.link} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Baixar</span>
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare} className="flex-1 md:flex-none">
                        <Share2 className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Compartilhar</span>
                    </Button>
                    <Button variant="default" size="sm" asChild className="flex-1 md:flex-none">
                        <a href={article.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Abrir Externo</span>
                        </a>
                    </Button>
                </div>
            </div>

            {/* Document Container */}
            <Card className="flex-1 overflow-hidden relative border-2 bg-muted/20 print:border-none print:shadow-none print:m-0 print:p-0">
                {iframeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-0 print:hidden">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                <iframe
                    id="article-frame"
                    src={embedUrl}
                    className="w-full h-full border-none z-10 relative min-h-[80vh] print:h-[1100px]"
                    onLoad={() => setIframeLoading(false)}
                    title={article.title}
                    allow="autoplay; encrypted-media; fullscreen"
                />
            </Card>

            <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground print:hidden">
                <div className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>Se você vir uma mensagem de acesso negado acima, tente o botão <strong>"Abrir Externo"</strong> ou certifique-se de estar logado na sua conta Google corporativa.</span>
                </div>
                <p>Caso o documento não carregue, pode ser uma restrição do navegador a cookies de terceiros.</p>
            </div>

            {/* Share Dialog - Estilo Youtube */}
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Compartilhar</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col space-y-6 py-4">
                        <div className="flex justify-between items-center gap-4 overflow-x-auto pb-2">
                            <a 
                                href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} 
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group min-w-[70px]"
                            >
                                <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                    <MessageCircle className="h-6 w-6 fill-current" />
                                </div>
                                <span className="text-[10px] font-medium">WhatsApp</span>
                            </a>
                            <a 
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} 
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group min-w-[70px]"
                            >
                                <div className="h-12 w-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                    <Facebook className="h-6 w-6 fill-current" />
                                </div>
                                <span className="text-[10px] font-medium">Facebook</span>
                            </a>
                            <a 
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} 
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group min-w-[70px]"
                            >
                                <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                    <Twitter className="h-6 w-6 fill-current" />
                                </div>
                                <span className="text-[10px] font-medium">X</span>
                            </a>
                            <a 
                                href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`}
                                className="flex flex-col items-center gap-2 group min-w-[70px]"
                            >
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground transition-transform group-hover:scale-110">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <span className="text-[10px] font-medium">E-mail</span>
                            </a>
                        </div>

                        <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg border">
                            <div className="grid flex-1 gap-2">
                                <label htmlFor="link" className="sr-only">Link</label>
                                <Input
                                    id="link"
                                    defaultValue={shareUrl}
                                    readOnly
                                    className="h-9 border-none bg-transparent focus-visible:ring-0 px-0"
                                />
                            </div>
                            <Button size="sm" className="px-3 shrink-0" onClick={copyToClipboard}>
                                <span className="sr-only">Copiar</span>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                <span className="ml-2">{copied ? 'Copiado' : 'Copiar'}</span>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
