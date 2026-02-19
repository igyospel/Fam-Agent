import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message } from '../types';
import { User, Sparkles, FileText, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-enter mb-4 md:mb-6`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 md:gap-3`}>

        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1
          ${isUser
            ? 'bg-gray-200'
            : 'bg-gradient-to-tr from-orange-400 to-orange-600 text-white shadow-md shadow-orange-200'}
        `}>
          {isUser ? (
            <User size={14} className="text-gray-500" />
          ) : (
            <Sparkles size={14} fill="white" />
          )}
        </div>

        {/* Bubble Content */}
        <div className={`
          flex flex-col gap-2 px-3 py-3 md:p-5 shadow-sm
          ${isUser
            ? 'bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm'
            : message.isError
              ? 'bg-red-50 border border-red-100 text-red-800 rounded-2xl'
              : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm text-gray-800'}
        `}>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att, idx) => (
                <div key={idx} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {att.mimeType.startsWith('image/') ? (
                    <img
                      src={att.previewUrl}
                      alt="attachment"
                      className="h-40 w-auto object-cover cursor-pointer"
                    />
                  ) : (
                    <div className="h-14 px-3 flex items-center justify-center gap-2">
                      <FileText size={18} className="text-orange-500" />
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{att.file.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text Content */}
          <div className={`
            prose prose-sm max-w-none 
            prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900
            prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-medium
            prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl
          `}>
            {message.text ? (
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {message.text}
              </ReactMarkdown>
            ) : (
              message.isStreaming && (
                <div className="flex items-center gap-1.5 h-6">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )
            )}
          </div>

          {message.isError && (
            <div className="flex items-center gap-2 text-xs font-medium text-red-500 mt-1">
              <AlertCircle size={14} />
              <span>Failed to generate response</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;