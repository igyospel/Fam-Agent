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
        fixed md:relative top-0 left-0 h-full w-72 md:w-64 bg-white border-r border-gray-200 
        flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out z-50 shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header Logo */}
        <div className="h-16 flex items-center justify-between px-6">
          <div className="flex items-center cursor-pointer" onClick={onNewAgent}>
            <img src="/logoblack.png" alt="Agent Arga" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {/* Action Buttons */}
          <button
            onClick={onNewAgent}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-full py-2.5 px-4 text-sm font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            New Agent
          </button>
          <button
            onClick={() => alert("Import functionality coming in next update.")}
            className="w-full bg-white border border-gray-200 text-gray-600 rounded-full py-2.5 px-4 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <FileText size={14} />
            Import Agent
          </button>

          {/* Search */}
          <div className="relative mt-6 group">
            <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            <div className="absolute right-3 top-2.5 text-[10px] text-gray-400 border border-gray-200 rounded px-1 bg-white hidden md:block">⌘K</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 custom-scrollbar">

          {/* Dashboards Header */}
          <div>
            <div
              className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2"
            >
              <LayoutGrid size={14} className="mr-2" />
              Dashboards
            </div>
          </div>

          {/* Dynamic Project List */}
          <div className="space-y-0.5">
            {filteredWorkspaces.length > 0 ? (
              filteredWorkspaces.map((item, i) => (
                <div
                  key={i}
                  onClick={() => onSelectWorkspace(item)}
                  className={`group flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-all duration-200 ${activeWorkspace === item
                    ? 'bg-orange-50 text-orange-700 font-medium translate-x-1'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center min-w-0 overflow-hidden flex-1">
                    <MessageSquare size={14} className={`mr-2 flex-shrink-0 ${activeWorkspace === item ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    <span className="truncate">{item}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteWorkspace(item);
                    }}
                    className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-300 italic">No history found</div>
            )}
          </div>

        </div>

        {/* Bottom Section */}
        <div className="p-4 space-y-4">
          {/* User Profile */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 group">
            <div
              className="relative cursor-pointer"
              onClick={onOpenProfile}
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>

            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={onOpenProfile}
            >
              <p className="text-sm font-bold text-gray-700 truncate hover:text-orange-600 transition-colors">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate uppercase tracking-wide font-medium" title={user.email}>{user.email}</p>
            </div>

            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
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