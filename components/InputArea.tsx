import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Loader2, Link as LinkIcon, Globe, Mic, Square } from 'lucide-react';
import { Attachment } from '../types';
import { processFiles } from '../utils';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[], webSearch: boolean) => void;
  isLoading: boolean;
  isLanding?: boolean;
}

// Web Speech API TypeScript shim
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, isLanding = false }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [webSearch, setWebSearch] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef(''); // accumulate final transcript

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (!isLanding) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }
  }, [text, isLanding]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Snapshot current text so we can append to it
    finalTextRef.current = text;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;       // Keep listening until stopped manually
    recognition.interimResults = true;   // Show real-time partial results
    recognition.lang = 'id-ID';          // Indonesian by default; browser auto-detects
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (finalChunk) {
        finalTextRef.current = (finalTextRef.current + finalChunk).trimStart();
        setText(finalTextRef.current);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Speech] Error:', event.error);
      if (event.error !== 'aborted') {
        stopListening();
      }
    };

    recognition.onend = () => {
      // Only reset if not manually restarting
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [text, stopListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newAttachments = await processFiles(e.target.files);
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (isListening) stopListening();
    if ((text.trim() || attachments.length > 0) && !isLoading) {
      onSendMessage(text, attachments, webSearch);
      setText('');
      setAttachments([]);
      finalTextRef.current = '';
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasImages = attachments.some(a => a.mimeType.startsWith('image/'));

  const containerClasses = isLanding
    ? "bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_-12px_rgba(0,0,0,1)] p-4 md:p-6 w-full h-[160px] md:h-[200px] flex flex-col justify-between hover:border-white/20 hover:bg-[#0a0a0a]/80 transition-all duration-500 font-light relative overflow-hidden group/container"
    : "bg-transparent w-full flex flex-col pt-3";

  return (
    <div className="w-full relative group">

      <div
        className={containerClasses}
        onDragOver={(e) => { e.preventDefault(); setIsFocused(true); }}
        onDragLeave={() => setIsFocused(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsFocused(false);
          const newAttachments = await processFiles(e.dataTransfer.files);
          setAttachments(prev => [...prev, ...newAttachments]);
        }}
      >
        {/* Drop Overlay */}
        {isFocused && (
          <div className="absolute inset-0 bg-orange-500/10 border-2 border-orange-500 border-dashed rounded-2xl z-20 flex items-center justify-center pointer-events-none backdrop-blur-sm">
            <span className="text-orange-400 font-medium tracking-widest uppercase text-sm">Drop files here</span>
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 px-2 pb-2 overflow-x-auto custom-scrollbar">
            {attachments.map((att, i) => (
              <div key={i} className="relative group shrink-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-black/50">
                  <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-1 border border-white/10 hover:bg-red-500 transition-colors shadow-lg"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea + interim voice text */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              finalTextRef.current = e.target.value;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening... speak now 🎙️'
                : webSearch
                  ? 'Search the web with Agent Arga...'
                  : 'Initialize command sequence...'
            }
            className={`
              w-full bg-transparent border-0 text-white placeholder-gray-500 focus:ring-0 resize-none custom-scrollbar
              ${isLanding ? 'text-lg md:text-xl font-light h-full px-2 pt-2' : 'text-[16px] md:text-sm min-h-[44px] max-h-[140px] px-4'}
              ${isListening ? 'placeholder-red-400/60' : ''}
            `}
          />
          {/* Interim voice text preview (ghost text below) */}
          {isListening && interimText && (
            <p className="absolute bottom-0 left-4 text-gray-500 text-sm italic pointer-events-none truncate pr-4">
              {interimText}...
            </p>
          )}
        </div>

        <div className={`flex items-center justify-between mt-2 ${!isLanding ? 'px-2 pb-2' : ''}`}>

          <div className="flex items-center gap-2">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf,text/*"
              onChange={handleFileSelect}
            />

            {isLanding ? (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-all shadow-md backdrop-blur-md"
                >
                  <LinkIcon size={14} className="text-orange-400" />
                  <span className="hidden sm:inline">Attach</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-all shadow-md backdrop-blur-md"
                >
                  <ImageIcon size={14} className="text-violet-400" />
                  <span className="hidden sm:inline">Upload Media</span>
                  <span className="sm:hidden">Media</span>
                </button>
                {/* Mic button on landing too */}
                <button
                  onClick={speechSupported ? toggleListening : () => alert('Voice input requires Chrome or Edge browser.')}
                  title={speechSupported ? (isListening ? 'Stop listening' : 'Voice input') : 'Voice input requires Chrome/Edge'}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all shadow-md backdrop-blur-md
                    ${isListening
                      ? 'bg-red-500/20 border-red-500/30 text-red-400'
                      : speechSupported
                        ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                        : 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed opacity-50'}
                  `}
                >
                  {isListening && <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20 pointer-events-none" />}
                  {isListening ? <Square size={14} fill="currentColor" /> : <Mic size={14} className="text-red-400" />}
                  <span className="hidden sm:inline">{isListening ? 'Stop' : 'Voice'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>

                {/* Web Search Toggle */}
                <button
                  onClick={() => !hasImages && setWebSearch(w => !w)}
                  disabled={hasImages}
                  title={hasImages ? "Web search unavailable when image is attached" : webSearch ? "Web search ON — click to disable" : "Enable web search"}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all backdrop-blur-sm
                    ${hasImages ? 'opacity-40 cursor-not-allowed text-gray-600' :
                      webSearch
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        : 'text-gray-400 hover:bg-white/5 border border-transparent hover:text-white'}
                  `}
                >
                  <Globe size={15} className={webSearch ? 'animate-pulse' : ''} />
                  <span className="hidden sm:inline">{webSearch ? 'Web ON' : 'Web OFF'}</span>
                </button>

                {/* Voice Input Button — always visible, disabled if not supported */}
                <button
                  onClick={speechSupported ? toggleListening : () => alert('Voice input requires Chrome or Edge. Firefox is not supported.')}
                  title={!speechSupported ? 'Voice input requires Chrome/Edge' : isListening ? 'Stop listening' : 'Voice input — speak your message'}
                  className={`
                    relative p-2.5 rounded-xl transition-all duration-300
                    ${!speechSupported
                      ? 'opacity-30 cursor-not-allowed text-gray-600 border border-transparent'
                      : isListening
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}
                  `}
                >
                  {isListening && (
                    <span className="absolute inset-0 rounded-xl animate-ping bg-red-500/20 pointer-events-none" />
                  )}
                  {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={(!text.trim() && attachments.length === 0) || isLoading}
            className={`
              rounded-xl flex items-center justify-center transition-all duration-300 shadow-xl overflow-hidden relative group
              ${isLanding ? 'px-6 py-3 bg-white text-black hover:bg-gray-200' : 'p-2.5 bg-gradient-to-tr from-orange-500 to-amber-500 text-white hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]'}
              ${((!text.trim() && attachments.length === 0) || isLoading) ? 'opacity-30 cursor-not-allowed grayscale' : ''}
            `}
          >
            {isLoading ? <Loader2 size={isLanding ? 20 : 18} className="animate-spin relative z-10" /> : <Send size={isLanding ? 20 : 18} className="relative z-10" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;