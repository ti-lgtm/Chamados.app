'use server';

import { put } from '@vercel/blob';

export async function uploadAttachments(formData: FormData): Promise<string[]> {
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
