
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Volume2, Play, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { UserRole } from '@/lib/types';
import { uploadAttachments } from '@/app/actions/upload';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  role: z.enum(['user', 'ti', 'admin']),
  notificationSoundUrl: z.string().optional(),
});

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingSound, setIsUploadingSound] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      role: 'user',
      notificationSoundUrl: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        role: user.role,
        notificationSoundUrl: user.notificationSoundUrl || '',
      });
    }
  }, [user, form]);

  async function handleSoundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !firestore) return;

    if (!file.type.startsWith('audio/')) {
        toast({ title: "Formato inválido", description: "Por favor, selecione um arquivo de áudio.", variant: "destructive" });
        return;
    }

    setIsUploadingSound(true);
    try {
        const formData = new FormData();
        formData.append('attachments', file);
        const urls = await uploadAttachments(formData);
        
        if (urls.length > 0) {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, { notificationSoundUrl: urls[0] });
            form.setValue('notificationSoundUrl', urls[0]);
            toast({ title: "Som de notificação atualizado!" });
        }
    } catch (error) {
        toast({ title: "Erro ao enviar áudio", variant: "destructive" });
    } finally {
        setIsUploadingSound(false);
    }
  }

  const removeSound = async () => {
    if (!user || !firestore) return;
    setIsUploadingSound(true);
    try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { notificationSoundUrl: null });
        form.setValue('notificationSoundUrl', '');
        toast({ title: "Som de notificação removido. Voltando ao padrão." });
    } catch (error) {
        toast({ title: "Erro ao remover áudio", variant: "destructive" });
    } finally {
        setIsUploadingSound(false);
    }
  }

  const testSound = () => {
    const soundUrl = form.getValues('notificationSoundUrl') || 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3';
    if (audioPreviewRef.current) {
        audioPreviewRef.current.src = soundUrl;
        audioPreviewRef.current.play().catch(() => {
            toast({ title: "Erro ao reproduzir", description: "O navegador bloqueou a reprodução automática.", variant: "destructive" });
        });
    }
  };

  function onSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!user || !firestore) return;

    setIsSubmitting(true);
    const userRef = doc(firestore, 'users', user.uid);

    const updateData: any = {
        name: values.name,
    };

    if (user.role === 'admin') {
        updateData.role = values.role;
    }

    updateDoc(userRef, updateData)
        .then(() => {
            toast({ title: "Perfil atualizado com sucesso!" });
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                title: 'Erro ao atualizar o perfil',
                description: 'Você pode não ter permissão para realizar esta ação.',
                variant: 'destructive',
            });
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  }

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const isStaff = user.role === 'ti' || user.role === 'admin';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Seu Perfil</CardTitle>
          <CardDescription>
            Atualize suas informações de perfil. Apenas administradores podem alterar funções.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={user.role !== 'admin'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="ti">TI</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isStaff && (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Configurações de Notificação
                </CardTitle>
                <CardDescription>
                    Personalize como o sistema avisa você sobre novos chamados.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4" /> Som de Alerta (Novo Chamado)
                        </FormLabel>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Input 
                                    type="file" 
                                    accept="audio/*" 
                                    onChange={handleSoundUpload} 
                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                    disabled={isUploadingSound}
                                />
                                <Button variant="outline" className="w-full" disabled={isUploadingSound}>
                                    {isUploadingSound ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}
                                    {form.watch('notificationSoundUrl') ? 'Trocar Som Personalizado' : 'Enviar Som (MP3/WAV)'}
                                </Button>
                            </div>
                            <Button variant="secondary" onClick={testSound} type="button" title="Testar Som">
                                <Play className="h-4 w-4" />
                            </Button>
                            {form.watch('notificationSoundUrl') && (
                                <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={removeSound} type="button" title="Remover Som">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <FormDescription>
                            Este som será reproduzido apenas para você quando um novo chamado chegar no dashboard.
                        </FormDescription>
                    </div>
                </div>
                <audio ref={audioPreviewRef} className="hidden" />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
