
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeft,
  PlusCircle,
  Users,
  LogOut,
  User as UserIcon,
  CalendarDays,
  BarChart,
  Clock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "firebase/auth";
import { useAuth as useFirebaseAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { PortalLogo } from "../icons/portal-logo";
import { TicketIconAlt } from "../icons/ticket-icon-alt";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const NavLink = ({ href, children, isDashboard = false }: { href: string; children: React.ReactNode; isDashboard?: boolean }) => {
    const pathname = usePathname();
    let isActive = false;
    if (isDashboard) {
        isActive = pathname === '/dashboard' || (pathname.startsWith('/tickets/') && !pathname.startsWith('/tickets/new'));
    } else {
        isActive = pathname.startsWith(href);
    }

    return (
        <Link
            href={href}
            className={cn(
                "transition-colors hover:text-foreground px-3 py-1.5 rounded-md",
                isActive ? "text-foreground font-semibold border border-primary/50 bg-primary/10" : "text-muted-foreground"
            )}
        >
            {children}
        </Link>
    );
};

const MobileNavLink = ({ href, children, icon: Icon, onNavigate }: { href: string; children: React.ReactNode; icon: React.ElementType, onNavigate: () => void }) => {
    return (
        <Link href={href} className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={onNavigate}>
            <Icon className="h-5 w-5" />
            {children}
        </Link>
    );
};

export function AppHeader() {
  const { user } = useAuth();
  const firebaseAuth = useFirebaseAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    await signOut(firebaseAuth);
    toast({ title: "Você foi desconectado." });
    router.push("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const navItems = [
    { href: "/dashboard", label: "Chamados", icon: TicketIconAlt, roles: ['user', 'ti', 'admin'], isDashboard: true },
    { href: "/schedules", label: "Agendamentos", icon: CalendarDays, roles: ['user', 'ti', 'admin'] },
    { href: "/tickets/new", label: "Novo Chamado", icon: PlusCircle, roles: ['user', 'ti', 'admin'] },
    { href: "/statistics", label: "Estatísticas", icon: BarChart, roles: ['ti', 'admin'] },
    { href: "/admin/scheduled-tickets", label: "Auto Chamados", icon: Clock, roles: ['ti', 'admin'] },
    { href: "/admin/users", label: "Usuários", icon: Users, roles: ['admin'] },
  ];

  const availableNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <header className="relative sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 print:hidden">
      
      <div className="flex items-center gap-6">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <PortalLogo className="h-8 w-auto" />
                <span className="font-bold">Portal de Suporte</span>
              </Link>
              {availableNavItems.map(item => (
                  <MobileNavLink key={item.href} href={item.href} icon={item.icon} onNavigate={() => setIsMobileMenuOpen(false)}>
                      {item.label}
                  </MobileNavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <PortalLogo className="h-8 w-auto" />
            <span className="sr-only">Portal de Suporte</span>
        </Link>
      </div>

      <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex flex-row items-center gap-5 text-sm font-medium">
        {availableNavItems.map(item => (
            <NavLink key={item.href} href={item.href} isDashboard={item.isDashboard}>
                {item.label}
            </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback>{user ? getInitials(user.name) : <UserIcon/>}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
