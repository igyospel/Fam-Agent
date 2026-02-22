import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Loader2, Link as LinkIcon, Globe } from 'lucide-react';
import { Attachment } from '../types';
import { processFiles } from '../utils';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[], webSearch: boolean) => void;
  isLoading: boolean;
  isLanding?: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, isLanding = false }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (!isLanding) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }
  }, [text, isLanding]);

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
    if ((text.trim() || attachments.length > 0) && !isLoading) {
      onSendMessage(text, attachments, webSearch);
      setText('');
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Disable web search toggle if images are attached (Perplexity doesn't support vision)
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

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={webSearch ? "Search the web with Agent Arga..." : "Initialize command sequence..."}
          className={`
            w-full bg-transparent border-0 text-white placeholder-gray-500 focus:ring-0 resize-none custom-scrollbar
            ${isLanding ? 'text-lg md:text-xl font-light h-full px-2 pt-2' : 'text-[16px] md:text-sm min-h-[44px] max-h-[140px] px-4'}
          `}
        />

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

            {/* Styled Buttons for Landing */}
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
              </>
            ) : (
              // Chat mode: attachment + web search toggle
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