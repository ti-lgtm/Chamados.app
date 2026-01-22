import { SignupForm } from "@/components/auth/signup-form";
import { Ticket } from "lucide-react";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary p-3 rounded-full">
            <Ticket className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-headline font-bold text-center mb-2 text-foreground">
          Crie sua conta
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Preencha os campos abaixo para começar.
        </p>
        <SignupForm />
      </div>
    </main>
  );
}
