import React from 'react';
import { Share2, Mail, Bell, RotateCcw, Menu } from 'lucide-react';

interface HeaderProps {
  isChatActive: boolean;
  onHistory: () => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isChatActive, onHistory, onToggleSidebar }) => {
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 transition-all w-full">

      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden active:scale-95 transition-transform"
        >
          <Menu size={24} />
        </button>

        <img src="/logoblack.png" alt="Agent Arga" className="h-5 md:h-6 w-auto object-contain" />
        <span className="hidden sm:block bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-orange-200">
          Beta v2.0
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-3">

        <button
          onClick={onHistory}
          className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-full text-xs font-medium transition-colors"
        >
          <RotateCcw size={14} />
          History
        </button>

        <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>

        <div className="flex items-center">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors tooltip" title="Share">
            <Share2 size={18} />
          </button>
          <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Messages">
            <Mail size={18} />
          </button>
          <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative" title="Notifications">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
          </button>
        </div>
      </div>

    </header>
  );
};

export default Header;