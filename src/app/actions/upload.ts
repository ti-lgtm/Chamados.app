'use server';

import { put } from '@vercel/blob';

export async function uploadAttachments(formData: FormData): Promise<string[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const errorMessage = 'A chave de acesso para o serviço de armazenamento (Vercel Blob) não está configurada. O upload de anexos está desabilitado. Por favor, configure a variável de ambiente `BLOB_READ_WRITE_TOKEN`.';
    console.error(`[UPLOAD ERROR]: ${errorMessage}`);
    throw new Error("O serviço de armazenamento de anexos não está configurado. Entre em contato com o administrador.");
  }
  
  const files = formData.getAll('attachments') as File[];

  if (!files || files.length === 0 || files.every(f => f.size === 0)) {
    return [];
  }

  const blobUrls: string[] = [];

  for (const file of files) {
     if (file.size === 0) continue;
    const blob = await put(file.name, file, {
      access: 'public',
    });
    blobUrls.push(blob.url);
  }

  return blobUrls;
}
