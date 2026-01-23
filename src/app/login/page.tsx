import { LoginForm } from "@/components/auth/login-form";
import { AmlmfLogo } from "@/components/icons/amlmf-logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <div className="bg-primary p-3 rounded-full">
                <AmlmfLogo className="h-8 w-8 text-primary-foreground" />
            </div>
        </div>
        <h1 className="text-3xl font-headline font-bold text-center mb-2 text-foreground">
          Soluções AMLMF
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Acesse sua conta para gerenciar seus chamados e agendamentos.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
