import { SignupForm } from "@/components/auth/signup-form";
import { PortalLogo } from "@/components/icons/portal-logo";

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <PortalLogo className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-headline font-bold text-center mb-2 text-foreground">
          Crie sua Conta no Portal
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Preencha os campos abaixo para começar.
        </p>
        <SignupForm />
      </div>
       <footer className="absolute bottom-4 text-center text-xs text-muted-foreground w-full">
          Desenvolvido por Thulio Costa e AMLMF com assistência de Gemini.
      </footer>
    </main>
  );
}
