import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { theme, teamMembers, createGroupChannel } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleCreate = () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !currentUser) return;
    createGroupChannel(groupName, selectedMembers, currentUser.id);
    setGroupName('');
    setSelectedMembers([]);
    onClose();
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const availableMembers = teamMembers.filter(m => m.id !== currentUser?.id);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl p-6 shadow-xl"
          style={{
            background: isDark ? '#1e1e2d' : '#ffffff',
            border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
            color: isDark ? '#e4e4e7' : '#1e1b2e'
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Create New Group</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDark ? '#a1a1aa' : '#52525b' }}>Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Marketing Team"
                className="w-full px-4 py-2 rounded-xl text-sm"
                style={{
                  background: isDark ? '#151521' : '#f4f4f5',
                  border: `1px solid ${isDark ? '#2a2a3a' : '#e4e4e7'}`,
                  color: isDark ? '#e4e4e7' : '#18181b',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#a1a1aa' : '#52525b' }}>Select Members</label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {availableMembers.map(member => (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: selectedMembers.includes(member.id) 
                        ? (isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)')
                        : (isDark ? '#151521' : '#f4f4f5'),
                      border: `1px solid ${selectedMembers.includes(member.id) ? '#8b5cf6' : 'transparent'}`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
                        {member.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium">{member.full_name}</span>
                    </div>
                    {selectedMembers.includes(member.id) && (
                      <span className="text-purple-500">✓</span>
                    )}
                  </div>
                ))}
                {availableMembers.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: isDark ? '#a1a1aa' : '#52525b' }}>No other team members found.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Group
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
