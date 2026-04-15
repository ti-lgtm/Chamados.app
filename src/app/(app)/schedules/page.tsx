'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Room = {
  name: string;
  koalendarUrl: string;
  googleCalendarUrl: string;
  imageUrl: string;
  imageHint: string;
};

const rooms: Room[] = [
  {
    name: 'INTEGRIDADE',
    koalendarUrl: 'https://koalendar.com/e/integridade',
    googleCalendarUrl: 'https://calendar.google.com/calendar/embed?src=sala.1.integridade%40gmail.com&ctz=America%2FFortaleza',
    imageUrl: 'https://storage.googleapis.com/project-spark-b95ad.appspot.com/cache/36881c19-974a-464a-ad29-28c045b85a3c.png',
    imageHint: 'office building',
  },
  {
    name: 'VALORIZAÇÃO DAS PESSOAS',
    koalendarUrl: 'https://koalendar.com/e/2valorizacao-das-pessoas',
    googleCalendarUrl: 'https://calendar.google.com/calendar/embed?src=sala.2.valorizacaodaspessoas%40gmail.com&ctz=America%2FFortaleza',
    imageUrl: 'https://storage.googleapis.com/project-spark-b95ad.appspot.com/cache/36881c19-974a-464a-ad29-28c045b85a3c.png',
    imageHint: 'city street',
  },
];

export default function SchedulesPage() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
  };
  
  const handleNextRoom = () => {
    if (!selectedRoom) return;
    const currentIndex = rooms.findIndex(r => r.name === selectedRoom.name);
    if (currentIndex < rooms.length - 1) {
      setSelectedRoom(rooms[currentIndex + 1]);
    }
  };

  const handlePrevRoom = () => {
    if (!selectedRoom) return;
    const currentIndex = rooms.findIndex(r => r.name === selectedRoom.name);
    if (currentIndex > 0) {
      setSelectedRoom(rooms[currentIndex - 1]);
    }
  };

  if (selectedRoom) {
    const currentIndex = rooms.findIndex(r => r.name === selectedRoom.name);
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-bold">{selectedRoom.name}</h1>
                    <p className="text-muted-foreground">Agende um horário ou visualize a disponibilidade da sala.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevRoom} disabled={currentIndex <= 0}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Sala Anterior</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNextRoom} disabled={currentIndex >= rooms.length - 1}>
                        <ArrowRight className="h-4 w-4" />
                        <span className="sr-only">Próxima Sala</span>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedRoom(null)}
                        className="flex-shrink-0 ml-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar à lista
                    </Button>
                </div>
            </div>
            
            <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="schedule">Agendar Sala</TabsTrigger>
                    <TabsTrigger value="view">Visualizar Agenda</TabsTrigger>
                </TabsList>
                <TabsContent value="schedule" className="mt-4">
                    <Card className="overflow-hidden">
                        <div className="w-full h-[75vh] rounded-lg">
                            <iframe
                                src={selectedRoom.koalendarUrl}
                                className="h-full w-full"
                                title={`Agendamento ${selectedRoom.name}`}
                                frameBorder="0"
                            />
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="view" className="mt-4">
                    <Card className="overflow-hidden">
                        {selectedRoom.googleCalendarUrl ? (
                            <div className="w-full h-[75vh] rounded-lg">
                                <iframe
                                src={selectedRoom.googleCalendarUrl}
                                className="h-full w-full"
                                title={`Agenda ${selectedRoom.name}`}
                                frameBorder="0"
                                />
                            </div>
                        ) : (
                            <div className="w-full h-[75vh] flex items-center justify-center bg-muted rounded-lg border">
                                <p className="text-muted-foreground">Agenda desta sala não disponível.</p>
                            </div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
  }

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Portal de Agendamentos</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Selecione uma das nossas salas de reunião para verificar a disponibilidade e fazer seu agendamento de forma rápida e fácil.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rooms.map((room) => (
                <Card key={room.name} className="flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl">
                     <div className="relative h-56 w-full">
                        <Image
                            src={room.imageUrl}
                            alt={`Foto da sala ${room.name}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            data-ai-hint={room.imageHint}
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="flex flex-col flex-grow p-6 bg-card">
                        <CardTitle className="text-2xl font-headline mb-6">{room.name}</CardTitle>
                        <Button onClick={() => handleSelectRoom(room)} className="w-full mt-auto" size="lg">
                            Ver Agenda e Agendar
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );
}
