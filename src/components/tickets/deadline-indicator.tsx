
'use client';

import { useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { differenceInHours, formatDistanceToNowStrict, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, Truck } from 'lucide-react';

interface DeadlineIndicatorProps {
    createdAt: Timestamp;
    deadline?: Timestamp;
    status: string;
    type?: 'support' | 'purchase';
    purchaseDate?: Timestamp;
    expectedDeliveryDate?: Timestamp;
}

export function DeadlineIndicator({ 
    createdAt, 
    deadline, 
    status, 
    type = 'support', 
    purchaseDate, 
    expectedDeliveryDate 
}: DeadlineIndicatorProps) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Se for compra e estiver comprado, mostrar progresso de entrega
    if (type === 'purchase' && status === 'purchased' && purchaseDate && expectedDeliveryDate) {
        const start = purchaseDate.toDate();
        const end = expectedDeliveryDate.toDate();
        const total = differenceInSeconds(end, start);
        const elapsed = differenceInSeconds(now, start);
        
        let progress = total > 0 ? (elapsed / total) * 100 : 100;
        progress = Math.max(0, Math.min(progress, 100));
        
        const isOverdue = now > end;

        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-primary">
                    <span className="flex items-center gap-1"><Truck className="h-3 w-3"/> Trânsito da Mercadoria</span>
                    <span>{isOverdue ? "Atrasado" : `${Math.round(progress)}%`}</span>
                </div>
                <Progress value={progress} indicatorClassName={cn(isOverdue ? "bg-red-500" : "bg-primary")} />
                <p className="text-[10px] text-muted-foreground text-right italic">
                    Entrega prevista para: {formatDistanceToNowStrict(end, { locale: ptBR, addSuffix: true })}
                </p>
            </div>
        );
    }

    // Se for compra em outros status, não mostrar SLA fixo
    if (type === 'purchase') return null;

    if (status === 'resolved' || !deadline) return null;

    const creationDate = createdAt.toDate();
    const deadlineDate = deadline.toDate();

    const totalDuration = differenceInHours(deadlineDate, creationDate);
    const elapsedDuration = differenceInHours(now, creationDate);
    
    let progress = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 100;
    progress = Math.max(0, Math.min(progress, 100));

    const isOverdue = now > deadlineDate;

    let progressColor = 'bg-green-500';
    if (progress > 50) progressColor = 'bg-yellow-500';
    if (progress > 80 || isOverdue) progressColor = 'bg-red-500';
    
    let remainingTimeText = isOverdue 
        ? `Atrasado ${formatDistanceToNowStrict(deadlineDate, { locale: ptBR, addSuffix: true })}`
        : `Vence em ${formatDistanceToNowStrict(deadlineDate, { locale: ptBR })}`;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-full">
                        <Progress value={progress} indicatorClassName={cn(progressColor)} />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{remainingTimeText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
