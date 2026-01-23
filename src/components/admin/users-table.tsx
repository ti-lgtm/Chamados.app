'use client';
import type { AppUser } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "./user-actions";
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { WithId } from "@/firebase";

const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

const roleMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
    user: { label: 'Usuário', variant: 'secondary' },
    ti: { label: 'TI', variant: 'default' },
    admin: { label: 'Admin', variant: 'destructive' },
};

const statusMap: { [key: string]: { label: string; className: string } } = {
    active: { label: 'Ativo', className: 'bg-green-500' },
    suspended: { label: 'Suspenso', className: 'bg-yellow-500' },
};


export function UsersTable({ users }: { users: WithId<AppUser>[] }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Criado em</TableHead>
                        <TableHead className="w-[80px] text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">Nenhum usuário encontrado.</TableCell>
                        </TableRow>
                    )}
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatarUrl} alt={user.name}/>
                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                     <div className="flex flex-col">
                                        <span className="font-semibold truncate">{user.name}</span>
                                        <span className="text-xs text-muted-foreground md:hidden">{user.email}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                            <TableCell>
                                <Badge variant={roleMap[user.role]?.variant || 'default'}>
                                    {roleMap[user.role]?.label || user.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${statusMap[user.status]?.className || 'bg-gray-400'}`} />
                                    <span>{statusMap[user.status]?.label || user.status}</span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                                {user.createdAt ? format(user.createdAt.toDate(), "dd/MM/yyyy") : ''}
                            </TableCell>
                            <TableCell className="text-right">
                            <UserActions user={user} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
