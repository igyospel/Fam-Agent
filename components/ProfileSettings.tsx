import React, { useState, useRef } from 'react';
import { X, Camera, Save, User, Mail, Users, Plus, Trash2 } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateUser: (user: UserType) => void;
}

const MOCK_TEAM = [
  { id: 1, name: 'Sarah Connor', role: 'Admin', avatar: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=random' },
  { id: 2, name: 'John Smith', role: 'Editor', avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=random' },
  { id: 3, name: 'Emily Chen', role: 'Viewer', avatar: 'https://ui-avatars.com/api/?name=Emily+Chen&background=random' },
];

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team'>('profile');
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    avatar: user.avatar || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateUser({
      ...user,
      name: formData.name,
      email: formData.email,
      avatar: formData.avatar
    });
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
          {/* Sidebar Tabs (Desktop) / Top Tabs (Mobile) */}
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

            {activeTab === 'profile' ? (
              <div className="space-y-6 md:space-y-8 animate-enter">
                
                {/* Avatar Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <img 
                        src={formData.avatar || `https://ui-avatars.com/api/?name=${formData.name}&background=random`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                    >
                      <Camera className="text-white" size={24} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
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
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
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
              <div className="space-y-6 animate-enter">
                <div className="flex items-center justify-between mb-2">
                   <div>
                     <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
                     <p className="text-sm text-gray-500">Manage who has access.</p>
                   </div>
                   <button className="bg-orange-50 text-orange-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors flex items-center gap-2">
                     <Plus size={14} />
                     <span className="hidden sm:inline">Invite Member</span>
                     <span className="sm:hidden">Invite</span>
                   </button>
                </div>

                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  {MOCK_TEAM.map((member, i) => (
                    <div key={member.id} className={`flex items-center justify-between p-3 md:p-4 ${i !== MOCK_TEAM.length - 1 ? 'border-b border-gray-100' : ''} bg-white hover:bg-gray-50 transition-colors`}>
                       <div className="flex items-center gap-3">
                         <img src={member.avatar} alt={member.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full" />
                         <div>
                           <p className="text-sm font-bold text-gray-800">{member.name}</p>
                           <p className="text-xs text-gray-500">{member.role}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="hidden sm:inline px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Active</span>
                          <button className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  ))}
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