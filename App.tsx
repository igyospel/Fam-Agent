import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import ProfileSettings from './components/ProfileSettings';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { Message, Attachment, User as UserType } from './types';
import { streamLLMResponse as streamGeminiResponse } from './services/llmService';
import { authService } from './services/authService';
import { generateId, compressImageForStorage } from './utils';
import { Sparkles, ArrowRight, User, List, Mail, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'fam_agent_histories';
const WORKSPACE_KEY = 'fam_agent_active_workspace';

// Load chat histories from localStorage
const loadHistories = (): Record<string, Message[]> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Async: compress images to thumbnail, keep docs as-is, then save to localStorage
const sanitizeForStorageAsync = async (
  histories: Record<string, Message[]>
): Promise<Record<string, Message[]>> => {
  const result: Record<string, Message[]> = {};
  for (const [key, msgs] of Object.entries(histories)) {
    const sanitizedMsgs = await Promise.all(
      msgs.map(async (m) => {
        if (!m.attachments || m.attachments.length === 0) return m;
        const sanitizedAttachments = await Promise.all(
          m.attachments.map(async (att) => {
            if (att.mimeType.startsWith('image/')) {
              // Compress image to small thumbnail data URL for storage
              const compressed = att.base64
                ? await compressImageForStorage(att.base64, att.mimeType)
                : (att.previewUrl || '');
              return {
                ...att,
                base64: '',              // don't store raw base64
                previewUrl: compressed, // store compressed thumbnail as previewUrl
              };
            }
            // Docs: keep previewUrl (static SVG) and textContent, strip raw base64
            return { ...att, base64: '' };
          })
        );
        return { ...m, attachments: sanitizedAttachments };
      })
    );
    result[key] = sanitizedMsgs;
  }
  return result;
};

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<UserType | null>(null);

  // App State
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false); // Show auth after landing CTA
  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean, workspaceId: string | null }>({
    isOpen: false,
    workspaceId: null
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-init',
      role: 'model',
      text: "Hello! How can I help you today?",
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>(loadHistories);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist chat histories to localStorage whenever they change
  useEffect(() => {
    sanitizeForStorageAsync(chatHistories).then(sanitized => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch (e) {
        console.warn('Failed to save chat history:', e);
      }
    });
  }, [chatHistories]);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('fam_agent_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user from storage");
      }
    }
  }, []);

  const handleLogin = (newUser: UserType) => {
    setUser(newUser);
    localStorage.setItem('fam_agent_user', JSON.stringify(newUser));
  };

  const handleUpdateUser = async (updatedUser: UserType) => {
    // Optimistic UI update
    setUser(updatedUser);
    localStorage.setItem('fam_agent_user', JSON.stringify(updatedUser)); // Update session

    // Persist to DB
    try {
      await authService.updateUser(updatedUser.email, updatedUser);
    } catch (e) {
      console.error("Failed to persist user update", e);
      // Ideally revert UI if failed, but for now we keep optimistic state
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fam_agent_user');
    setActiveWorkspace(null);
    setIsProfileOpen(false);
    // Reset messages if desired
    setMessages([{
      id: 'system-init',
      role: 'model',
      text: "Hello! How can I help you today?",
      timestamp: Date.now()
    }]);
  };

  const isChatStarted = messages.length > 1;
  const showLanding = activeWorkspace === null && !isChatStarted;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!showLanding) {
      scrollToBottom();
    }
  }, [messages, showLanding, activeWorkspace]);

  const handleSelectWorkspace = (id: string) => {
    if (activeWorkspace) {
      setChatHistories(prev => ({
        ...prev,
        [activeWorkspace]: messages
      }));
    }

    setActiveWorkspace(id);
    setIsSidebarOpen(false); // Close sidebar on mobile when selecting

    if (chatHistories[id]) {
      setMessages(chatHistories[id]);
    } else {
      const initMsg: Message = {
        id: generateId(),
        role: 'model',
        text: `Workspace **${id}** initialized.`,
        timestamp: Date.now()
      };
      setMessages([initMsg]);
    }
  };

  const handleOpenDeleteModal = (id: string) => {
    setDeleteModalState({ isOpen: true, workspaceId: id });
  };

  const handleConfirmDelete = () => {
    const idToDelete = deleteModalState.workspaceId;
    if (!idToDelete) return;

    setChatHistories(prev => {
      const newState = { ...prev };
      delete newState[idToDelete];
      return newState;
    });

    if (activeWorkspace === idToDelete) {
      setActiveWorkspace(null);
      setMessages([{
        id: 'system-init',
        role: 'model',
        text: "Hello! How can I help you today?",
        timestamp: Date.now()
      }]);
    }

    setDeleteModalState({ isOpen: false, workspaceId: null });
    showToast(`Workspace "${idToDelete}" deleted.`);
  };

  const handleNewAgent = () => {
    if (activeWorkspace) {
      setChatHistories(prev => ({ ...prev, [activeWorkspace]: messages }));
    }

    setActiveWorkspace(null);
    setIsSidebarOpen(false); // Close sidebar on mobile
    setMessages([{
      id: 'system-init',
      role: 'model',
      text: "Hello! How can I help you today?",
      timestamp: Date.now()
    }]);
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!text.trim() && attachments.length === 0) return;

    let currentWorkspaceId = activeWorkspace;

    if (!currentWorkspaceId) {
      const titleCandidate = text.trim() || "New Attachment Chat";
      const shortTitle = titleCandidate.length > 25 ? titleCandidate.substring(0, 25) + '...' : titleCandidate;

      let uniqueTitle = shortTitle;
      let counter = 1;
      while (chatHistories[uniqueTitle]) {
        uniqueTitle = `${shortTitle} (${counter})`;
        counter++;
      }

      currentWorkspaceId = uniqueTitle;
      setActiveWorkspace(uniqueTitle);

      setChatHistories(prev => ({
        ...prev,
        [uniqueTitle]: [...messages]
      }));
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      text: text,
      attachments: attachments,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

    if (currentWorkspaceId) {
      setChatHistories(prev => ({
        ...prev,
        [currentWorkspaceId!]: [...(prev[currentWorkspaceId!] || messages), userMessage]
      }));
    }

    setIsLoading(true);

    const botMessageId = generateId();
    const botPlaceholder: Message = {
      id: botMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true
    };

    setMessages(prev => [...prev, botPlaceholder]);

    try {
      const stream = streamGeminiResponse(messages, text, attachments);
      let fullText = '';

      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(msg =>
          msg.id === botMessageId ? { ...msg, text: fullText } : msg
        ));

        if (currentWorkspaceId) {
          setChatHistories(prev => {
            const currentHist = prev[currentWorkspaceId!] || [];
            const exists = currentHist.some(m => m.id === botMessageId);
            if (exists) {
              return {
                ...prev,
                [currentWorkspaceId!]: currentHist.map(m => m.id === botMessageId ? { ...m, text: fullText, isStreaming: true } : m)
              };
            } else {
              return {
                ...prev,
                [currentWorkspaceId!]: [...currentHist, { ...botPlaceholder, text: fullText }]
              };
            }
          });
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
      ));

      if (currentWorkspaceId) {
        setChatHistories(prev => ({
          ...prev,
          [currentWorkspaceId!]: prev[currentWorkspaceId!].map(m =>
            m.id === botMessageId ? { ...m, isStreaming: false } : m
          )
        }));
      }

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => prev.map(msg =>
        msg.id === botMessageId
          ? { ...msg, text: `❌ Error: ${error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi."}`, isStreaming: false, isError: true }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (text: string) => {
    handleSendMessage(text, []);
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-enter text-sm';
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Show marketing landing page first (unless already logged in)
  if (!user && !showAuthScreen) {
    return <LandingPage onGetStarted={() => setShowAuthScreen(true)} />;
  }

  // Show auth screen
  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#F9FAFB] overflow-hidden" style={{ position: 'fixed', inset: 0 }}>

      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        activeWorkspace={activeWorkspace}
        workspaces={Object.keys(chatHistories)}
        onSelectWorkspace={handleSelectWorkspace}
        onDeleteWorkspace={handleOpenDeleteModal}
        onNewAgent={handleNewAgent}
      />

      <div className="flex-1 flex flex-col h-full relative w-full">
        <Header
          isChatActive={!showLanding}
          onHistory={() => showToast("History synced to cloud.")}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full overscroll-none">

          {showLanding ? (
            /* --- Landing / Welcome State --- */
            <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-64px)] px-4 pb-24 md:pb-16 fade-in">

              <div className="mb-6 md:mb-10 text-center space-y-3 pt-6 md:pt-0">
                <h2 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
                  Welcome back, {user.name.split(' ')[0]}
                </h2>
                <p className="text-gray-500 max-w-xl mx-auto text-sm md:text-base">
                  Your AI Copilot awaits. Select a workspace from the left or start a new conversation below.
                </p>
              </div>

              <div className="w-full max-w-2xl mb-12">
                <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} isLanding={true} />
              </div>

              <div className="w-full max-w-5xl hidden md:block">
                <div className="flex items-center gap-2 mb-6 ml-2">
                  <h3 className="font-semibold text-gray-800 text-lg">Quick Templates</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: User, text: "Write a to do list with best practice for designers" },
                    { icon: Mail, text: "Draft a follow-up email for new leads from yesterday" },
                    { icon: List, text: "Generate a quick task list for my sales team" }
                  ].map((item, i) => (
                    <div
                      key={i}
                      onClick={() => handleTemplateClick(item.text)}
                      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group flex flex-col justify-between h-40"
                    >
                      <div>
                        <p className="text-gray-700 font-medium text-sm leading-relaxed">{item.text}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <item.icon size={18} className="text-gray-400" />
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                          <ArrowRight size={14} className="text-gray-400 group-hover:text-orange-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* --- Active Chat State --- */
            <div className="max-w-3xl mx-auto px-3 md:px-4 pt-6 pb-36 md:pb-32">
              {messages.length > (activeWorkspace ? 0 : 1) && messages.map((msg, i) => (
                // Skip the hidden init message for landing chat, show all for workspace chat
                (msg.id === 'system-init' && !activeWorkspace) ? null : <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

        </main>

        {/* Floating Input Area for Chat Mode */}
        {!showLanding && (
          <div className="absolute bottom-0 left-0 right-0 px-3 md:px-4 pb-4 md:pb-6 flex justify-center z-20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="w-full max-w-3xl bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-3xl p-1 shadow-2xl shadow-gray-200/50 border border-white">
              <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} isLanding={false} />
            </div>
          </div>
        )}

      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        workspaceName={deleteModalState.workspaceId || ''}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={handleConfirmDelete}
      />
      <ProfileSettings
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
      />
    </div>
  );
};

export default App;