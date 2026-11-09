
'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { UsersTable } from '@/components/admin/users-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Search, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export default function AdminUsersPage() {
    const { user: currentUser, loading: authLoading } = useAuth();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const usersQuery = useMemoFirebase(() => {
        if (firestore && currentUser?.role === 'admin') {
            // Removendo orderBy do banco para evitar lag de visibilidade de novos documentos
            return collection(firestore, "users");
        }
        return null;
    }, [firestore, currentUser]);

    const { data: users, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

    const sortedUsers = useMemo(() => {
        if (!users) return [];
        return [...users].sort((a, b) => {
            // Lógica robusta para ordenação por data de criação
            // Se o timestamp ainda não foi resolvido pelo servidor (null no latency compensation),
            // atribuímos um valor alto para que ele apareça no topo como novidade.
            const getTimestamp = (u: AppUser) => {
                if (!u.createdAt) return Date.now() + 60000; // 1 minuto no futuro para garantir topo
                if (typeof u.createdAt.toMillis === 'function') return u.createdAt.toMillis();
                if (typeof u.createdAt.seconds === 'number') return u.createdAt.seconds * 1000;
                return 0;
            };
            
            return getTimestamp(b) - getTimestamp(a);
        });
    }, [users]);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return sortedUsers;

        return sortedUsers.filter(u => 
            (u.name?.toLowerCase() || '').includes(term) || 
            (u.email?.toLowerCase() || '').includes(term)
        );
    }, [sortedUsers, searchTerm]);

    const pendingUsers = useMemo(() => {
        return filteredUsers.filter(u => u.status === 'suspended');
    }, [filteredUsers]);

    const isLoading = authLoading || (currentUser?.role === 'admin' && usersLoading);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    if (currentUser?.role !== 'admin') {
        return (
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Acesso Negado</AlertTitle>
                <AlertDescription>Você não tem permissão de administrador.</AlertDescription>
            </Alert>
        )
    }
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-headline font-bold">Gestão de Acessos</h1>
                    <p className="text-muted-foreground">Administre quem pode acessar o portal.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Pesquisar..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {pendingUsers.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 animate-in fade-in slide-in-from-top-4 duration-500 shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                            <UserCheck className="h-5 w-5" />
                            <CardTitle className="text-lg">Aguardando Aprovação ({pendingUsers.length})</CardTitle>
                        </div>
                        <CardDescription className="text-orange-600/80">
                            Novos cadastros que precisam de autorização para entrar no sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UsersTable users={pendingUsers} />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Todos os Usuários</CardTitle>
                    <CardDescription>
                        Total de {filteredUsers.length} registros encontrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Agora exibimos filteredUsers (todos) em vez de apenas os ativos */}
                    <UsersTable users={filteredUsers} />
                </CardContent>
            </Card>
        </div>
    );
}
