"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  useAuth as useFirebaseAuth,
  useFirestore,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import { useRouter } from "next/navigation";
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
  password:
    z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.54C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"
        fill="#EA4335"
      />
      <path
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.82H9v3.48h4.84c-.2 1.12-.79 2.08-1.54 2.68v2.24h2.91c1.7-1.56 2.69-3.89 2.69-6.58z"
        fill="#4285F4"
      />
      <path
        d="M3.86 10.71c-.2-.59-.31-1.22-.31-1.87s.11-1.28.31-1.87L.95 4.96C.35 6.18 0 7.55 0 9.04s.35 2.86.96 4.08l2.9-2.41z"
        fill="#FBBC05"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.24c-.79.53-1.8.84-3.05.84-2.38 0-4.4-1.57-5.12-3.71L.96 13.1c1.48 2.94 4.53 4.9 8.04 4.9z"
        fill="#34A853"
      />
    </g>
  </svg>
);

export function LoginForm() {
  const router = useRouter();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const userData = {
          uid: user.uid,
          name: user.displayName || values.email.split('@')[0],
          email: user.email,
          role: 'user' as const,
          status: 'active' as const,
          createdAt: serverTimestamp(),
          receivesEmails: true,
        };

        try {
          await setDoc(userDocRef, userData);
        } catch (firestoreError) {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userData,
          });
          errorEmitter.emit('permission-error', permissionError);
          await signOut(auth);
          setError('Falha ao configurar o perfil do usuário. Tente novamente.');
          setLoading(false);
          return;
        }
      }

      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando para o painel.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      setError('E-mail ou senha inválidos. Por favor, tente novamente.');
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

      if (!user.email) {
        setError(
          'Não foi possível obter o e-mail da sua conta Google. Tente outro método de login.'
        );
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const userData = {
          uid: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: 'user' as const,
          status: 'active' as const,
          createdAt: serverTimestamp(),
          avatarUrl: user.photoURL || null,
          receivesEmails: true,
        };

        try {
          await setDoc(userDocRef, userData);
        } catch (firestoreError) {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userData,
          });
          errorEmitter.emit('permission-error', permissionError);
          await signOut(auth);
          setError(
            'Falha ao configurar o perfil do usuário com Google. Tente novamente.'
          );
          setLoading(false);
          return;
        }
      }

      toast({
        title: 'Login com Google bem-sucedido!',
        description: 'Redirecionando para o painel.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // Don't show an error if the user just closes the popup.
      } else if (
        error.code === 'auth/account-exists-with-different-credential'
      ) {
        setError(
          'Uma conta já existe com este e-mail, mas com um método de login diferente. Por favor, faça login usando o método original.'
        );
      } else if (error.code === 'auth/unauthorized-domain') {
        setError(
          "Este domínio não está autorizado para fazer login. Adicione-o na lista de 'Domínios autorizados' nas configurações de Autenticação do seu projeto Firebase."
        );
      } else {
        console.error('Google Sign-In Error:', error);
        setError(
          'Falha ao fazer login com o Google. Verifique se os pop-ups estão habilitados e tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: 'Por favor, insira seu e-mail.', variant: 'destructive' });
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'E-mail de redefinição de senha enviado!',
        description: 'Verifique sua caixa de entrada.',
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        toast({
          title: 'Nenhum usuário encontrado com este e-mail.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao enviar e-mail de redefinição.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro no Login</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        variant="destructive"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Entrar com Google
      </Button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Ou entre com seu e-mail
          </span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <Button
                    variant="link"
                    type="button"
                    className="p-0 h-auto text-sm"
                    onClick={() => setIsResetDialogOpen(true)}
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      {...field}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar com E-mail
          </Button>
        </form>
      </Form>

      <AlertDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Digite seu endereço de e-mail abaixo e enviaremos um link para
              redefinir sua senha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-email">E-mail</Label>
            <Input
              id="reset-email"
              placeholder="seu@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePasswordReset}
              disabled={isSendingReset}
            >
              {isSendingReset && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enviar Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    