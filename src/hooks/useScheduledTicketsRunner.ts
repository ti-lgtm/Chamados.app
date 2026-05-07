
'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, runTransaction, Timestamp } from 'firebase/firestore';
import type { AppUser, ScheduledTicket } from '@/lib/types';

/**
 * Hook que verifica e dispara chamados automáticos (recorrentes).
 * Deve ser usado apenas por membros da equipe técnica logados.
 */
export function useScheduledTicketsRunner(user: AppUser | null) {
    const firestore = useFirestore();

    useEffect(() => {
        if (!firestore || !user || (user.role !== 'admin' && user.role !== 'ti')) return;

        const checkScheduledTickets = async () => {
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const q = query(
                collection(firestore, 'scheduled_tickets'),
                where('active', '==', true),
                where('dayOfMonth', '==', currentDay)
            );

            const snapshot = await getDocs(q);
            
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data() as ScheduledTicket;
                const lastRun = data.lastRun?.toDate();

                // Verifica se já rodou este mês
                const alreadyRunThisMonth = lastRun && 
                    lastRun.getMonth() === currentMonth && 
                    lastRun.getFullYear() === currentYear;

                if (!alreadyRunThisMonth) {
                    try {
                        await runTransaction(firestore, async (transaction) => {
                            // 1. Pega o contador de chamados
                            const counterRef = doc(firestore, 'counters', 'tickets');
                            const counterSnap = await transaction.get(counterRef);
                            const nextNumber = (counterSnap.data()?.lastNumber || 0) + 1;

                            // 2. Prepara o novo chamado
                            const newTicketRef = doc(collection(firestore, 'tickets'));
                            
                            // Deadline de 4 dias úteis (simples)
                            const deadline = new Date();
                            deadline.setDate(deadline.getDate() + 4);

                            const ticketPayload = {
                                ticketNumber: nextNumber,
                                title: `[AUTO] ${data.title}`,
                                description: data.description,
                                company: data.company,
                                department: data.department,
                                priority: data.priority,
                                status: 'open',
                                userId: 'system',
                                userName: 'Sistema (Recorrência)',
                                userEmail: 'suporte@sistema.com',
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                                deadline: Timestamp.fromDate(deadline),
                                assignedTo: null
                            };

                            // 3. Executa as atualizações
                            transaction.update(counterRef, { lastNumber: nextNumber });
                            transaction.set(newTicketRef, ticketPayload);
                            transaction.update(docSnap.ref, { lastRun: serverTimestamp() });
                        });
                        console.log(`Auto-chamado criado: ${data.title}`);
                    } catch (err) {
                        console.error("Erro ao processar auto-chamado:", err);
                    }
                }
            }
        };

        checkScheduledTickets();
    }, [firestore, user]);
}
