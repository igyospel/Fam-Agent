import React, { useState } from 'react';
import {
  LayoutGrid,
  Search,
  FileText,
  Settings,
  Sparkles,
  Plus,
  MessageSquare,
  LogOut,
  X,
  Trash2
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  activeWorkspace: string | null;
  workspaces: string[];
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onNewAgent: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  isOpen,
  onClose,
  onLogout,
  onOpenProfile,
  activeWorkspace,
  workspaces,
  onSelectWorkspace,
  onDeleteWorkspace,
  onNewAgent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filterItems = (items: string[]) => {
    return items.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredWorkspaces = filterItems(workspaces);

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div className={`
        fixed md:relative top-0 left-0 h-full w-72 md:w-64 bg-[#0a0a0a] border-r border-white/5 
        flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out z-50 shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header Logo */}
        <div className="h-16 flex items-center justify-between px-6 pt-2">
          <div className="flex items-center cursor-pointer group" onClick={onNewAgent}>
            <div className="flex items-center justify-center mr-3 hover:scale-105 transition-transform duration-300 origin-left pl-1">
              <img src="/logomain.png" alt="Agent Arga" className="h-7 md:h-8 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] transition-all" />
            </div>
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Action Buttons */}
          <button
            onClick={onNewAgent}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-[1.2rem] py-3 px-4 text-sm font-bold shadow-[0_0_20px_-5px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Initialize Agent
          </button>
          <button
            onClick={() => alert("Import functionality coming in next update.")}
            className="w-full bg-white/5 border border-white/10 text-gray-300 rounded-[1.2rem] py-3 px-4 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <FileText size={14} className="text-gray-400" />
            Import Memory
          </button>

          {/* Search */}
          <div className="relative mt-8 group">
            <Search className="absolute left-3.5 top-3 text-gray-500 group-focus-within:text-orange-400 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl pl-10 pr-8 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-gray-600"
            />
            <div className="absolute right-3.5 top-3 text-[10px] text-gray-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 hidden md:block">⌘K</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 custom-scrollbar">

          {/* Dashboards Header */}
          <div>
            <div
              className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2"
            >
              <LayoutGrid size={12} className="mr-2" />
              Active Sessions
            </div>
          </div>

          {/* Dynamic Project List */}
          <div className="space-y-1">
            {filteredWorkspaces.length > 0 ? (
              filteredWorkspaces.map((item, i) => (
                <div
                  key={i}
                  onClick={() => onSelectWorkspace(item)}
                  className={`group flex items-center justify-between px-3 py-2.5 text-sm rounded-xl cursor-pointer transition-all duration-300 ${activeWorkspace === item
                    ? 'bg-white/10 text-white font-medium shadow-sm border border-white/5'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                    }`}
                >
                  <div className="flex items-center min-w-0 overflow-hidden flex-1">
                    <MessageSquare size={14} className={`mr-3 flex-shrink-0 ${activeWorkspace === item ? 'text-orange-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                    <span className="truncate">{item}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteWorkspace(item);
                    }}
                    className="ml-2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-600 italic">No history found</div>
            )}
          </div>

        </div>

        {/* Bottom Section */}
        <div className="p-4">
          {/* User Profile */}
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
            <div
              className="relative cursor-pointer shrink-0"
              onClick={onOpenProfile}
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                alt="Profile"
                className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#0a0a0a] rounded-full"></div>
            </div>

            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={onOpenProfile}
            >
              <p className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest font-medium" title={user.email}>{user.email}</p>
            </div>

            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;