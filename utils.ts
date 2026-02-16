import { Attachment } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const processFiles = async (files: FileList | null): Promise<Attachment[]> => {
  if (!files) return [];

  const attachments: Attachment[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('text/')) {
      try {
        const base64 = await fileToBase64(file);
        attachments.push({
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mimeType: file.type
        });
      } catch (e) {
        console.error("Error reading file", file.name, e);
      }
    }
  }

  return attachments;
};

export const generateId = () => Math.random().toString(36).substring(2, 15);
