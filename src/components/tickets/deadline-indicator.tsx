'use client';

import { useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { differenceInHours, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DeadlineIndicatorProps {
    createdAt: Timestamp;
    deadline: Timestamp;
    status: 'open' | 'in_progress' | 'resolved';
}

export function DeadlineIndicator({ createdAt, deadline, status }: DeadlineIndicatorProps) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
        return () => clearInterval(timer);
    }, []);

    if (status === 'resolved') {
        return null;
    }

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
    
    let remainingTimeText = '';
    if (isOverdue) {
        const timeOverdue = formatDistanceToNowStrict(deadlineDate, { locale: ptBR, addSuffix: true });
        remainingTimeText = `Atrasado ${timeOverdue}`;

    } else {
        remainingTimeText = `Vence em ${formatDistanceToNowStrict(deadlineDate, { locale: ptBR })}`;
    }


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
