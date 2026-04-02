import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Suporte",
  description: "Portal de Agendamentos e Chamados de TI",
};

const favicon = `data:image/svg+xml,%3Csvg width='42' height='42' viewBox='0 0 42 42' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='42' height='42' rx='8' fill='%23F97316'/%3E%3Cpath d='M14 12H23C26.3137 12 29 14.6863 29 18C29 21.3137 26.3137 24 23 24H14V12Z' fill='white'/%3E%3Cpath d='M14 24H20V30H14V24Z' fill='white'/%3E%3C/svg%3E`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href={favicon} type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
