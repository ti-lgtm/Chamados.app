
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { UsersTable } from '@/components/admin/users-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsersPage() {
    const { user: currentUser, loading: authLoading } = useAuth();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => {
        if (firestore && currentUser?.role === 'admin') {
            return query(collection(firestore, "users"), orderBy("createdAt", "desc"));
        }
        return null;
    }, [firestore, currentUser]);

    const { data: users, isLoading: usersLoading, error: usersError } = useCollection<AppUser>(usersQuery);

    const isLoading = authLoading || (currentUser?.role === 'admin' && usersLoading);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (currentUser?.role !== 'admin') {
        return (
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Acesso Negado</AlertTitle>
                <AlertDescription>
                    Você não tem permissão para acessar esta página.
                </AlertDescription>
            </Alert>
        )
    }
    
    if (usersError) {
        return (
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Erro ao carregar usuários</AlertTitle>
                <AlertDescription>
                    Ocorreu um erro ao buscar a lista de usuários. Isso pode ser um problema de permissão.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-headline font-bold">Gerenciamento de Usuários</h1>
                <p className="text-muted-foreground">Administre os usuários do sistema.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Todos os Usuários</CardTitle>
                    <CardDescription>
                        Total de {users?.length || 0} usuários encontrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable users={users || []} />
                </CardContent>
            </Card>
        </div>
    );
}
