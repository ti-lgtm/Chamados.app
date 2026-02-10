'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Room = {
  name: string;
  koalendarUrl: string;
  googleCalendarUrl: string;
};

const rooms: Room[] = [
  {
    name: 'INTEGRIDADE',
    koalendarUrl: 'https://koalendar.com/e/integridade',
    googleCalendarUrl: 'https://calendar.google.com/calendar/embed?src=sala.1.integridade%40gmail.com&ctz=America%2FFortaleza',
  },
  {
    name: 'VALORIZAÇÃO DAS PESSOAS',
    koalendarUrl: 'https://koalendar.com/e/valorizacao-das-pessoas',
    googleCalendarUrl: 'https://calendar.google.com/calendar/embed?src=sala.2.valorizacaodaspessoas%40gmail.com&ctz=America%2FFortaleza',
  },
  {
    name: 'INOVAÇÃO',
    koalendarUrl: 'https://koalendar.com/e/inovacao',
    googleCalendarUrl: 'https://calendar.google.com/calendar/embed?src=sala.3.inovacao%40gmail.com&ctz=America%2FFortaleza',
  },
];

export default function SchedulesPage() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
  };

  if (selectedRoom) {
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-headline font-bold">{selectedRoom.name}</h1>
                    <p className="text-muted-foreground">Use os painéis abaixo para agendar e visualizar a agenda da sala.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setSelectedRoom(null)}
                    className="flex-shrink-0"
                >
                    <ArrowLeft />
                    Voltar
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-6">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Agendar Sala</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                         <div className="w-full h-[70vh] rounded-lg overflow-hidden border">
                            <iframe
                                src={selectedRoom.koalendarUrl}
                                className="h-full w-full"
                                title={`Agendamento ${selectedRoom.name}`}
                                frameBorder="0"
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Visualizar Agenda</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {selectedRoom.googleCalendarUrl ? (
                            <div className="w-full h-[70vh] rounded-lg overflow-hidden border">
                                <iframe
                                src={selectedRoom.googleCalendarUrl}
                                className="h-full w-full"
                                title={`Agenda ${selectedRoom.name}`}
                                frameBorder="0"
                                />
                            </div>
                        ) : (
                            <div className="w-full h-[70vh] flex items-center justify-center bg-muted rounded-lg border">
                                <p className="text-muted-foreground">Agenda desta sala não disponível.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-headline font-bold">Portal de Agendamentos</h1>
            <p className="text-muted-foreground">Selecione uma sala para agendar e visualizar a agenda.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Salas Disponíveis</CardTitle>
                <CardDescription>Selecione uma sala para ver a disponibilidade e fazer seu agendamento.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                        <Card key={room.name} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg font-headline">{room.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-end">
                            <Button onClick={() => handleSelectRoom(room)} className="w-full">
                                Ver Agenda e Agendar <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
