'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowRight, X } from 'lucide-react';

const rooms = [
  {
    name: 'INTEGRIDADE',
    url: 'https://koalendar.com/e/INTEGRIDADE',
  },
  {
    name: 'VALORIZAÇÃO DAS PESSOAS',
    url: 'https://koalendar.com/e/VALORIZACAO-DAS-PESSOAS',
  },
  {
    name: 'INOVAÇÃO',
    url: 'https://koalendar.com/e/sala-4-koamoaHf',
  },
];

const googleCalendarUrl = 'https://calendar.google.com/calendar/u/0/embed?src=c_d7d0142ba2b9c6191c56c79835625073e4e268a40c041512bee5e3940841522d@group.calendar.google.com';

export default function SchedulesPage() {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [view, setView] = useState<'rooms' | 'calendar'>('rooms');

  const handleSelectRoom = (url: string) => {
    setSelectedUrl(url);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-headline font-bold">Portal de Agendamentos</h1>
                <p className="text-muted-foreground">Agende uma sala ou visualize a agenda geral.</p>
            </div>
             <RadioGroup defaultValue="rooms" onValueChange={(value) => setView(value as 'rooms' | 'calendar')} className="flex items-center space-x-4 border rounded-lg p-2 bg-card">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rooms" id="r1" />
                    <Label htmlFor="r1">Agendar Sala</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="calendar" id="r2" />
                    <Label htmlFor="r2">Ver Agenda</Label>
                </div>
            </RadioGroup>
        </div>

      {view === 'rooms' && (
        <Card>
            <CardHeader>
                <CardTitle>Agendamento de Salas</CardTitle>
                <CardDescription>Selecione uma sala para ver a disponibilidade e fazer seu agendamento.</CardDescription>
            </CardHeader>
            <CardContent>
                {selectedUrl ? (
                    <div className="relative pt-8">
                        <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-0 right-0 z-10 rounded-full"
                            onClick={() => setSelectedUrl(null)}
                        >
                            <X className="h-5 w-5" />
                            <span className="sr-only">Fechar agendamento</span>
                        </Button>
                        <div className="w-full h-[70vh]">
                            <iframe
                                src={selectedUrl}
                                className="h-full w-full border-0 rounded-lg"
                                title="Agendamento Koalendar"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        {rooms.map((room) => (
                            <Card key={room.name} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg font-headline">{room.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow flex items-end">
                                    <Button onClick={() => handleSelectRoom(room.url)} className="w-full">
                                        Agendar <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      )}

      {view === 'calendar' && (
        <Card>
            <CardHeader>
                <CardTitle>Agenda Geral das Salas</CardTitle>
                <CardDescription>Visualize todos os agendamentos confirmados.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[70vh]">
                    <iframe
                        src={googleCalendarUrl}
                        className="h-full w-full border-0 rounded-lg"
                        title="Agenda do Google"
                    />
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
