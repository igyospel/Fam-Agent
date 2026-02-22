import React, { useState, useEffect } from 'react';
import { Share2, Mail, Bell, RotateCcw, Menu } from 'lucide-react';

interface HeaderProps {
  isChatActive: boolean;
  onHistory: () => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isChatActive, onHistory, onToggleSidebar }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-30 transition-all w-full">

      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg md:hidden active:scale-95 transition-all"
        >
          <Menu size={24} />
        </button>

        <span className="hidden sm:block bg-orange-500/10 text-orange-400 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.2em] border border-orange-500/20 md:ml-2 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
          {currentTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/,/g, '')}
          <span className="opacity-50 mx-1.5">|</span>
          {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-3">

        <button
          onClick={onHistory}
          className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-full text-xs font-medium transition-colors"
        >
          <RotateCcw size={14} />
          History
        </button>

        <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>

        <div className="flex items-center">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors tooltip" title="Share">
            <Share2 size={18} />
          </button>
          <button className="hidden sm:block p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Messages">
            <Mail size={18} />
          </button>
          <button className="hidden sm:block p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors relative" title="Notifications">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border border-[#0a0a0a] animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span>
          </button>
        </div>
      </div>

    </header>
  );
};

export default Header;