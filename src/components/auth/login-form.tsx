"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth as useFirebaseAuth, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.55 1.62-3.87 0-7-3.13-7-7s3.13-7 7-7c2.04 0 3.5.83 4.61 1.82l2.44-2.31C17.43 3.12 15.14 2 12.48 2 7.01 2 3 6.02 3 11s4.01 9 9.48 9c2.82 0 4.95-1.02 6.59-2.58 1.74-1.64 2.3-4.18 2.3-6.19 0-.58-.05-1.12-.14-1.68H12.48z" fill="currentColor"></path>
    </svg>
)

export function LoginForm() {
  const router = useRouter();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
         const userData = {
            uid: user.uid,
            name: user.displayName || values.email.split('@')[0],
            email: user.email,
            role: "user" as const,
            status: "active" as const,
            createdAt: serverTimestamp(),
        };

        try {
            await setDoc(userDocRef, userData);
        } catch (firestoreError) {
             const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: userData
            });
            errorEmitter.emit('permission-error', permissionError);
            await signOut(auth);
            setError("Falha ao configurar o perfil do usuário. Tente novamente.");
            setLoading(false);
            return;
        }
      }

      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o painel.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      setError("E-mail ou senha inválidos. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const userData = {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            role: "user" as const,
            status: "active" as const,
            createdAt: serverTimestamp(),
            avatarUrl: user.photoURL
        };

        try {
            await setDoc(userDocRef, userData);
        } catch (firestoreError) {
             const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: userData
            });
            errorEmitter.emit('permission-error', permissionError);
            await signOut(auth);
            setError("Falha ao configurar o perfil do usuário com Google. Tente novamente.");
            setLoading(false);
            return;
        }
      }
      
      toast({
        title: "Login com Google bem-sucedido!",
        description: "Redirecionando para o painel.",
      });
      router.push("/dashboard");
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            // Don't show an error if the user just closes the popup.
        } else {
             setError("Falha ao fazer login com o Google. Tente novamente.");
        }
    } finally {
        setLoading(false);
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({ title: "Por favor, insira seu e-mail.", variant: "destructive" });
        return;
    }
    setIsSendingReset(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({ title: "E-mail de redefinição de senha enviado!", description: "Verifique sua caixa de entrada." });
        setIsResetDialogOpen(false);
        setResetEmail("");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
             toast({ title: "Nenhum usuário encontrado com este e-mail.", variant: "destructive" });
        } else {
            toast({ title: "Erro ao enviar e-mail de redefinição.", variant: "destructive" });
        }
    } finally {
        setIsSendingReset(false);
    }
}

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Erro no Login</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input placeholder="seu@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                    <FormLabel>Senha</FormLabel>
                    <Button variant="link" type="button" className="p-0 h-auto text-sm" onClick={() => setIsResetDialogOpen(true)}>
                        Esqueceu a senha?
                    </Button>
                </div>
                <FormControl>
                    <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Sua senha" {...field} />
                        <Button variant="ghost" size="icon" type="button" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
            <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
        <GoogleIcon className="mr-2 h-4 w-4" />
        Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>

        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
                <AlertDialogDescription>
                    Digite seu endereço de e-mail abaixo e enviaremos um link para redefinir sua senha.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="reset-email">E-mail</Label>
                    <Input id="reset-email" placeholder="seu@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handlePasswordReset} disabled={isSendingReset}>
                    {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Link
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
