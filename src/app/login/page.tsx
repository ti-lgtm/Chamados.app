import { LoginForm } from "@/components/auth/login-form";
import { PortalLogo } from "@/components/icons/portal-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";


export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <PortalLogo className="h-12 w-auto" />
          </div>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline font-bold">Acesse sua conta</CardTitle>
              <CardDescription>Use sua conta Google ou e-mail para continuar.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
             <CardFooter className="flex-col gap-4 text-center">
                <p className="text-center text-sm text-muted-foreground">
                    Não tem uma conta?{" "}
                    <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Cadastre-se agora
                    </Link>
                </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground w-full">
          Desenvolvido por Thulio Costa e AMLMF com Firebase Studio
      </footer>
    </div>
  );
}
