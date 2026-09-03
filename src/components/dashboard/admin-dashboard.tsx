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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-headline font-bold">Painel de Administrador</h1>
          <p className="text-[11px] text-muted-foreground">Gerencie usuários e visualize todos os chamados do sistema.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link href="/admin/users">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Gerenciar Usuários
          </Link>
        </Button>
      </div>
      <TiDashboard user={user} />
    </div>
  );
}
