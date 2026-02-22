import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message } from '../types';
import { User, Sparkles, FileText, AlertCircle } from 'lucide-react';

/**
 * Convert various LaTeX delimiter styles to the $ / $$ format that
 * remark-math / KaTeX understand, regardless of what the AI returns.
 */
const preprocessLatex = (text: string): string => {
  if (!text) return text;
  return text
    // \[...\] → $$...$$  (display block)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `$$${inner}$$`)
    // \(...\) → $...$   (inline)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `$${inner}$`)
    // already correct $$ or $ forms pass through unchanged
    ;
};

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-enter mb-4 md:mb-6`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 md:gap-3`}>

        {/* Avatar - Only for AI now to look like social messaging */}
        {!isUser && (
          <div className="flex-shrink-0 mb-1">
            <img
              src="https://ui-avatars.com/api/?name=Agent+Arga&background=f97316&color=fff&size=128&bold=true"
              alt="Agent Arga"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full shadow-[0_0_15px_-3px_rgba(249,115,22,0.4)] border border-white/10"
            />
          </div>
        )}

        {/* Bubble & Name Wrapper */}
        <div className="flex flex-col gap-1.5 min-w-[60px] w-full mt-2">

          {/* AI Name Tag */}
          {!isUser && (
            <span className="text-[11px] text-gray-500 font-bold ml-2 tracking-wide">
              Agent Arga <span className="text-orange-500/80">✓</span>
            </span>
          )}

          {/* Bubble Content */}
          <div className={`
            flex flex-col gap-2 relative group w-fit max-w-full
            ${isUser
              ? 'px-4 py-2.5 md:py-3 md:px-5 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-[1.5rem] rounded-br-[4px] shadow-lg shadow-orange-500/20 ml-auto'
              : message.isError
                ? 'px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-[1.5rem] rounded-bl-[4px]'
                : 'px-4 py-3 md:py-4 md:px-5 bg-[#1A1A1A] border border-white/5 rounded-[1.5rem] rounded-bl-[4px] text-gray-200 shadow-md'}
          `}>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1 pl-1">
                {message.attachments.map((att, idx) => (
                  <div key={idx} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/50">
                    {att.mimeType.startsWith('image/') ? (
                      <img
                        src={att.previewUrl}
                        alt="attachment"
                        className="h-32 w-auto object-cover cursor-pointer hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-14 px-4 flex items-center justify-center gap-3">
                        <FileText size={18} className="text-violet-400" />
                        <span className="text-xs font-semibold text-gray-300 truncate max-w-[120px]">{att.file.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Text Content */}
            <div className={`
              prose max-w-none break-words
              ${isUser
                ? 'prose-p:text-white prose-strong:text-white prose-a:text-white prose-headings:text-white text-[15px] leading-relaxed'
                : 'prose-sm md:prose-base prose-headings:text-white prose-p:text-gray-300 prose-strong:text-orange-400 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-code:bg-black/50 prose-code:text-amber-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-medium prose-pre:bg-[#0A0A0A] prose-pre:text-gray-200 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl prose-pre:shadow-2xl prose-p:leading-snug prose-li:leading-snug'
              }
            `}>
              {message.text ? (
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {preprocessLatex(message.text)}
                </ReactMarkdown>
              ) : (
                message.isStreaming && (
                  <div className="flex items-center gap-1.5 h-6 opacity-70 px-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )
              )}
            </div>

            {message.isError && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-red-400 mt-1">
                <AlertCircle size={12} />
                <span>Message not sent</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;