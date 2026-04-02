import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Suporte",
  description: "Portal de Agendamentos e Chamados de TI",
};

const favicon = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAPUExURQAAAP///zMApQApM//9/wCVVjLgAAAACdFJOU/////8A/wD48+cDr/EAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAIQSURBVHic7dvJboMwEIVhC0sx//+3VymKBCspsu7NqesJqGzjePTs2LFlx1J63UvovS7P0nxdnsxP8q1+f7f8Lp+m39VzOY6fp8+7/L5d35a/pM/p1/U9b0lQoAIFClSgQAEKFKBAgQIFKFCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKFCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKFCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKFCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKFCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKFCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKFCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKUCBAgQIFKlCgAAUKULA3dC9/wLgL08t2AAAAAElFTkSuQmCC`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href={favicon} type="image/png" />
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
