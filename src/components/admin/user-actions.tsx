'use client';

import { useState } from "react";
import type { AppUser, UserRole } from "@/lib/types";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useFirestore, useAuth as useFirebaseAuth, errorEmitter, FirestorePermissionError, WithId } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";

interface UserActionsProps {
  user: WithId<AppUser>;
}

export function UserActions({ user }: UserActionsProps) {
    const firestore = useFirestore();
    const auth = useFirebaseAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleUpdateRole = (role: UserRole) => {
        setIsSubmitting(true);
        const userRef = doc(firestore, "users", user.id);
        const updateData = { role };

        updateDoc(userRef, updateData)
            .then(() => toast({ title: "Função do usuário atualizada com sucesso!" }))
            .catch(() => {
                toast({ title: "Erro ao atualizar função", variant: "destructive" });
                 const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSubmitting(false));
    };

    const handleUpdateStatus = (status: 'active' | 'suspended') => {
        setIsSubmitting(true);
        const userRef = doc(firestore, "users", user.id);
        const updateData = { status };
        
        updateDoc(userRef, updateData)
            .then(() => toast({ title: "Status do usuário atualizado com sucesso!" }))
            .catch(() => {
                toast({ title: "Erro ao atualizar status", variant: "destructive" });
                 const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSubmitting(false));
    };

    const handlePasswordReset = () => {
        setIsSubmitting(true);
        sendPasswordResetEmail(auth, user.email)
            .then(() => toast({ title: "E-mail de redefinição de senha enviado!" }))
            .catch(() => toast({ title: "Erro ao enviar e-mail", variant: "destructive" }))
            .finally(() => setIsSubmitting(false));
    }

    const handleDeleteUser = () => {
        setIsSubmitting(true);
        const userRef = doc(firestore, "users", user.id);

        deleteDoc(userRef)
            .then(() => {
                toast({ title: "Usuário excluído com sucesso!" });
                setIsDeleteDialogOpen(false);
            })
            .catch(() => {
                toast({ title: "Erro ao excluir usuário", variant: "destructive" });
                 const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSubmitting(false));
    }

  return (
    <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    <span className="sr-only">Abrir menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Alterar Função</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleUpdateRole("user")}>Usuário</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole("ti")}>TI</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole("admin")}>Admin</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                {user.status === 'active' ? (
                    <DropdownMenuItem onClick={() => handleUpdateStatus('suspended')}>Suspender Usuário</DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => handleUpdateStatus('active')}>Reativar Usuário</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handlePasswordReset}>Enviar Redefinição de Senha</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setIsDeleteDialogOpen(true)}>
                    Excluir Usuário
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente os dados do usuário
                    do Firestore, mas não removerá a conta do Firebase Auth.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sim, excluir usuário
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
