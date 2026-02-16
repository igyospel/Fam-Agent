import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Loader2, Link as LinkIcon } from 'lucide-react';
import { Attachment } from '../types';
import { processFiles } from '../utils';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  isLanding?: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, isLanding = false }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
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
      onSendMessage(text, attachments);
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

  // Styles change based on whether it is the Landing Page hero input or the chat bottom input
  const containerClasses = isLanding
    ? "bg-white border border-gray-100 rounded-2xl shadow-sm p-3 md:p-4 w-full h-[160px] md:h-[180px] flex flex-col justify-between hover:shadow-md transition-shadow"
    : "bg-white border border-gray-200 rounded-2xl shadow-sm p-2 w-full flex flex-col";

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
          <div className="absolute inset-0 bg-orange-50/50 border-2 border-orange-500 border-dashed rounded-2xl z-20 flex items-center justify-center pointer-events-none">
            <span className="text-orange-600 font-medium">Drop files here</span>
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 px-2 pb-2 overflow-x-auto">
            {attachments.map((att, i) => (
              <div key={i} className="relative group shrink-0">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                  <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5"
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
          placeholder="Ask anything Fam Agent..."
          className={`
            w-full bg-transparent border-0 text-gray-800 placeholder-gray-400 focus:ring-0 resize-none
            ${isLanding ? 'text-base md:text-lg font-light h-full px-2 pt-2' : 'text-sm min-h-[44px] max-h-[140px]'}
          `}
        />

        <div className={`flex items-center justify-between mt-2 ${!isLanding ? 'px-1' : ''}`}>
          
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
                   className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <LinkIcon size={14} className="text-gray-400" />
                  <span className="hidden sm:inline">Attach</span>
                </button>
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ImageIcon size={14} className="text-gray-400" />
                  <span className="hidden sm:inline">Upload Media</span>
                  <span className="sm:hidden">Media</span>
                </button>
              </>
            ) : (
              // Simple Icons for Chat Mode
              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <Paperclip size={18} />
              </button>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={(!text.trim() && attachments.length === 0) || isLoading}
            className={`
              rounded-xl flex items-center justify-center transition-all duration-300
              ${isLanding ? 'p-3 bg-gray-900 text-white shadow-md hover:bg-black' : 'p-2 bg-orange-500 text-white hover:bg-orange-600'}
              ${((!text.trim() && attachments.length === 0) || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? <Loader2 size={isLanding ? 20 : 16} className="animate-spin" /> : <Send size={isLanding ? 20 : 16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;