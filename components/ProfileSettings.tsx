import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Save, User, Mail, Users, Plus, Trash2, Send } from 'lucide-react';
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

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team'>('profile');
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

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: user.name, email: user.email, avatar: user.avatar || '' });
      setTeam(loadTeam());
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

  const avatarUrl = formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=f97316&color=fff`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-[95%] max-w-2xl shadow-2xl overflow-hidden animate-enter flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 md:px-8 py-4 md:py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">Account Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs (Desktop) */}
          <div className="w-48 bg-gray-50 border-r border-gray-100 p-4 flex flex-col gap-2 hidden md:flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <User size={18} />
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'team' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Users size={18} />
              Team Members
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">

            {/* Mobile Tabs */}
            <div className="flex md:hidden gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'profile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'team' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                Team
              </button>
            </div>

            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' ? (
              <div className="space-y-6 md:space-y-8 animate-enter">

                {/* Avatar */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
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
                    <h3 className="text-lg font-bold text-gray-900">Profile Photo</h3>
                    <p className="text-sm text-gray-500">Click the image to upload a new photo.</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 max-w-md w-full">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              </div>

            ) : (
              /* ── TEAM TAB ── */
              <div className="space-y-6 animate-enter">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
                    <p className="text-sm text-gray-500">{team.length === 0 ? 'No members yet. Add your first one!' : `${team.length} member${team.length > 1 ? 's' : ''}`}</p>
                  </div>
                  <button
                    onClick={() => setShowInviteForm(v => !v)}
                    className="bg-orange-50 text-orange-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors flex items-center gap-2"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Add Member</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                  <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">New Member</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Full name"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-all"
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-all"
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
                  <div className="text-center py-12 text-gray-400">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No team members yet</p>
                    <p className="text-xs mt-1">Click "Add Member" to get started</p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    {team.map((member, i) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-3 md:p-4 ${i !== team.length - 1 ? 'border-b border-gray-100' : ''} bg-white hover:bg-gray-50 transition-colors`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=f97316&color=fff`}
                            alt={member.name}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                          />
                          <div>
                            <p className="text-sm font-bold text-gray-800">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={e => handleRoleChange(member.id, e.target.value)}
                            className="hidden sm:block text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:border-orange-400 bg-white"
                          >
                            {ROLES.map(r => <option key={r}>{r}</option>)}
                          </select>
                          <span className="sm:hidden px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">{member.role}</span>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;