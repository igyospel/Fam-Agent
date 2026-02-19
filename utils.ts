import { Attachment } from './types';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker for pdfjs-dist v5 — use local worker to avoid CDN issues
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    console.log(`[PDF] Extracting text from: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`[PDF] Total pages: ${pdf.numPages}`);

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += `[Halaman ${i}]\n${pageText}\n\n`;
    }

    const result = fullText.trim();
    console.log(`[PDF] Extracted ${result.length} chars. Preview:`, result.substring(0, 300));
    return result;
  } catch (e) {
    console.error('[PDF] Error extracting text:', e);
    return '';
  }
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  if (file.type === 'application/pdf') {
    return extractTextFromPDF(file);
  }
  if (file.type.startsWith('text/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
  return '';
};

// Simple PDF icon as data URL
const PDF_PREVIEW = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="8" fill="#fee2e2"/>
  <text x="40" y="48" text-anchor="middle" font-size="18" font-weight="bold" fill="#dc2626" font-family="sans-serif">PDF</text>
</svg>`)}`;

export const processFiles = async (files: FileList | null): Promise<Attachment[]> => {
  if (!files) return [];

  const attachments: Attachment[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type.startsWith('text/')
    ) {
      try {
        const base64 = await fileToBase64(file);

        let textContent: string | undefined;
        if (!file.type.startsWith('image/')) {
          textContent = await extractTextFromFile(file);
        }

        attachments.push({
          file,
          previewUrl: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : PDF_PREVIEW,
          base64,
          mimeType: file.type,
          textContent,
        });
      } catch (e) {
        console.error('Error reading file', file.name, e);
      }
    }
  }

  return attachments;
};

export const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Compress a base64 image to a smaller data URL (thumbnail) for storage.
 * Returns a data URL string (with prefix) or empty string on failure.
 */
export const compressImageForStorage = (
  base64: string,
  mimeType: string,
  maxWidth = 400,
  quality = 0.5
): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const dataUrl = base64.startsWith('data:')
        ? base64
        : `data:${mimeType};base64,${base64}`;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve('');
      img.src = dataUrl;
    } catch {
      resolve('');
    }
  });
};
