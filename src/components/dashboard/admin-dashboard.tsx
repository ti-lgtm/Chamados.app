'use client';

import Link from 'next/link';
import type { AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TiDashboard } from './ti-dashboard';
import { Users } from 'lucide-react';

interface AdminDashboardProps {
  user: AppUser;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold">Painel de Administrador</h1>
          <p className="text-muted-foreground">Gerencie usuários e visualize todos os chamados do sistema.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users">
            <Users className="mr-2 h-4 w-4" />
            Gerenciar Usuários
          </Link>
        </Button>
      </div>
      <TiDashboard user={user} />
    </div>
  );
}
