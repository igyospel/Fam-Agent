import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Save, User, Mail, Users, Plus, Trash2, Send, Key, Copy, CheckCircle2, DollarSign, Activity } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateUser: (user: UserType) => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TEAM_STORAGE_KEY = 'agent_arga_team_members';

const loadTeam = (): TeamMember[] => {
  try {
    const saved = localStorage.getItem(TEAM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveTeam = (team: TeamMember[]) => {
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
};

const ROLES = ['Admin', 'Editor', 'Viewer'];

interface ApiKey {
  id: string;
  key: string;
  createdAt: number;
  usage?: number;
}

const API_KEY_STORAGE_KEY = 'agent_arga_api_keys';

const loadApiKeys = (): ApiKey[] => {
  try {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveApiKeys = (keys: ApiKey[]) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify(keys));
};

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'api'>('profile');
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    avatar: user.avatar || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Team state
  const [team, setTeam] = useState<TeamMember[]>(loadTeam);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [showInviteForm, setShowInviteForm] = useState(false);

  // API Key state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(loadApiKeys);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: user.name, email: user.email, avatar: user.avatar || '' });
      setTeam(loadTeam());
      setApiKeys(loadApiKeys());
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateUser({ ...user, name: formData.name, email: formData.email, avatar: formData.avatar });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const newMember: TeamMember = {
      id: Math.random().toString(36).substring(2),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    };
    const updated = [...team, newMember];
    setTeam(updated);
    saveTeam(updated);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('Viewer');
    setShowInviteForm(false);
  };

  const handleRemoveMember = (id: string) => {
    const updated = team.filter(m => m.id !== id);
    setTeam(updated);
    saveTeam(updated);
  };

  const handleRoleChange = (id: string, role: string) => {
    const updated = team.map(m => m.id === id ? { ...m, role } : m);
    setTeam(updated);
    saveTeam(updated);
  };

  const handleGenerateApiKey = () => {
    const newKeyStr = 'sk-arga-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newKey: ApiKey = {
      id: Math.random().toString(36).substring(2),
      key: newKeyStr,
      createdAt: Date.now(),
      usage: 0
    };
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    saveApiKeys(updated);
  };

  const handleSimulateUsage = (id: string) => {
    // Generate a random mocked API cost between $0.01 and $2.50
    const addedCost = (Math.random() * 2.50) + 0.01;
    const updated = apiKeys.map(k => {
      if (k.id === id) {
        return { ...k, usage: (k.usage || 0) + addedCost };
      }
      return k;
    });
    setApiKeys(updated);
    saveApiKeys(updated);
  };
  const handleRemoveApiKey = (id: string) => {
    const updated = apiKeys.filter(k => k.id !== id);
    setApiKeys(updated);
    saveApiKeys(updated);
  };

  const handleCopyApiKey = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const avatarUrl = formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=f97316&color=fff`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl w-[95%] max-w-2xl shadow-2xl overflow-hidden animate-enter flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 md:px-8 py-4 md:py-6 border-b border-white/10 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg md:text-xl font-bold text-white">Account Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs (Desktop) */}
          <div className="w-48 bg-[#050505]/50 border-r border-white/10 p-4 flex flex-col gap-2 hidden md:flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white/10 shadow-sm text-orange-400 border border-white/5' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <User size={18} />
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'team' ? 'bg-white/10 shadow-sm text-orange-400 border border-white/5' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Users size={18} />
              Team Members
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'api' ? 'bg-white/10 shadow-sm text-orange-400 border border-white/5' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Key size={18} />
              Developer API
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">

            {/* Mobile Tabs */}
            <div className="flex md:hidden gap-2 mb-6 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'profile' ? 'bg-white/10 shadow-sm text-white' : 'text-gray-400'}`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'team' ? 'bg-white/10 shadow-sm text-white' : 'text-gray-400'}`}
              >
                Team
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'api' ? 'bg-white/10 shadow-sm text-white' : 'text-gray-400'}`}
              >
                API
              </button>
            </div>

            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' ? (
              <div className="space-y-6 md:space-y-8 animate-enter">

                {/* Avatar */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 shadow-lg">
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                    >
                      <Camera className="text-white" size={24} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Profile Photo</h3>
                    <p className="text-sm text-gray-400">Click the image to upload a new photo.</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 max-w-md w-full">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3.5 text-gray-500" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:scale-[1.02] transition-transform flex items-center gap-2 w-full md:w-auto justify-center shadow-[0_0_20px_-5px_rgba(249,115,22,0.4)]"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              </div>

            ) : activeTab === 'team' ? (
              /* ── TEAM TAB ── */
              <div className="space-y-6 animate-enter">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">Team Members</h3>
                    <p className="text-sm text-gray-400">{team.length === 0 ? 'No members yet. Add your first one!' : `${team.length} member${team.length > 1 ? 's' : ''}`}</p>
                  </div>
                  <button
                    onClick={() => setShowInviteForm(v => !v)}
                    className="bg-white/5 border border-white/10 text-orange-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Add Member</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">New Member</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Full name"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        className="px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500 transition-all"
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                        className="px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 transition-all [&>option]:bg-[#0a0a0a]"
                      >
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                      <button
                        onClick={handleAddMember}
                        disabled={!inviteName.trim() || !inviteEmail.trim()}
                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send size={14} />
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Member List */}
                {team.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No team members yet</p>
                    <p className="text-xs mt-1">Click "Add Member" to get started</p>
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-2xl overflow-hidden">
                    {team.map((member, i) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-3 md:p-4 ${i !== team.length - 1 ? 'border-b border-white/10' : ''} bg-transparent hover:bg-white/5 transition-colors`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=f97316&color=fff`}
                            alt={member.name}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                          />
                          <div>
                            <p className="text-sm font-bold text-white">{member.name}</p>
                            <p className="text-xs text-gray-400">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={e => handleRoleChange(member.id, e.target.value)}
                            className="hidden sm:block text-xs border border-white/10 rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:border-orange-400 bg-black/50 [&>option]:bg-[#0a0a0a]"
                          >
                            {ROLES.map(r => <option key={r}>{r}</option>)}
                          </select>
                          <span className="sm:hidden px-2 py-1 bg-white/10 text-gray-300 text-[10px] font-bold rounded-full">{member.role}</span>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── API TAB ── */
              <div className="space-y-6 animate-enter">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">API Keys</h3>
                    <p className="text-sm text-gray-400">Manage your secret keys for API access.</p>
                  </div>
                  <button
                    onClick={handleGenerateApiKey}
                    className="bg-white/5 border border-white/10 text-orange-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Create secret key</span>
                    <span className="sm:hidden">Create</span>
                  </button>
                </div>

                {apiKeys.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Key size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No API keys generated</p>
                    <p className="text-xs mt-1">Create one to integrate Agent Arga into your applications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      <div className="col-span-4">Secret Key</div>
                      <div className="col-span-3">Created</div>
                      <div className="col-span-2 text-right">Usage</div>
                      <div className="col-span-3 text-right">Actions</div>
                    </div>
                    {apiKeys.map(apiKey => (
                      <div key={apiKey.id} className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-3 sm:gap-4 p-4 border border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
                        <div className="col-span-12 lg:col-span-4 w-full flex items-center font-mono text-[10px] md:text-xs text-white/90 bg-black/40 px-3 py-2 rounded-lg border border-white/5 overflow-hidden text-ellipsis whitespace-nowrap">
                          {apiKey.key}
                        </div>
                        <div className="col-span-12 lg:col-span-3 text-[10px] md:text-xs text-gray-500 w-full flex sm:block justify-between items-center sm:text-left border-b border-white/5 pb-2 sm:pb-0 sm:border-0">
                          <span className="sm:hidden font-semibold text-gray-400">Created:</span>
                          <span>{new Date(apiKey.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="col-span-12 lg:col-span-2 w-full flex sm:block justify-between items-center sm:text-right border-b border-white/5 pb-2 sm:pb-0 sm:border-0 text-sm font-medium">
                          <span className="sm:hidden font-semibold text-gray-400">Cost:</span>
                          <span className={`${(apiKey.usage || 0) > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                            ${(apiKey.usage || 0).toFixed(4)}
                          </span>
                        </div>
                        <div className="col-span-12 lg:col-span-3 flex items-center justify-end gap-2 w-full mt-2 sm:mt-0">
                          <button
                            onClick={() => handleSimulateUsage(apiKey.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2 text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500 rounded-lg transition-colors border border-transparent"
                            title="Simulate API calls (Demo)"
                          >
                            <Activity size={14} />
                          </button>
                          <button
                            onClick={() => handleCopyApiKey(apiKey.key)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2 text-gray-400 hover:text-white bg-black/30 hover:bg-black/50 rounded-lg transition-colors border border-transparent hover:border-white/10"
                            title="Copy key"
                          >
                            {copiedKey === apiKey.key ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => handleRemoveApiKey(apiKey.id)}
                            className="flex-none p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Revoke key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                  <h4 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2"><Key size={16} /> Base URL API Endpoint</h4>
                  <code className="text-[10px] md:text-xs text-orange-300 font-mono break-all inline-block p-2 bg-black/50 rounded-lg border border-orange-500/20 my-2">https://agentarga.fun/api/v1/chat/completions</code>
                  <p className="text-xs text-gray-400 mt-2">Built-in API endpoint that is perfectly compatible with the OpenAI spec wrapper (e.g., Cursor, Continue, AutoGPT, LLM packages). Simply use your newly generated <code className="text-orange-300">sk-arga-...</code> as a Bearer Token.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;