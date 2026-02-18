export interface Attachment {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  textContent?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface User {
  name: string;
  email: string;
  avatar?: string;
}