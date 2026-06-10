import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';

interface NewDMModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewDMModal({ isOpen, onClose }: NewDMModalProps) {
  const { theme, teamMembers, createDirectChannel } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';

  const handleStartDM = (userId: string) => {
    if (!currentUser) return;
    createDirectChannel(userId, currentUser.id);
    onClose();
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
            <h2 className="text-xl font-semibold">Start Direct Message</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#a1a1aa' : '#52525b' }}>Select Teammate</label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {availableMembers.map(member => (
                  <div
                    key={member.id}
                    onClick={() => handleStartDM(member.id)}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: isDark ? '#151521' : '#f4f4f5',
                      border: `1px solid transparent`
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = isDark ? '#151521' : '#f4f4f5' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                          {member.full_name?.charAt(0) || '?'}
                        </div>
                        {member.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full" style={{ borderColor: isDark ? '#1e1e2d' : '#ffffff' }} />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium block">{member.full_name}</span>
                        <span className="text-xs" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                          {member.is_online ? 'Online' : member.last_seen ? `Last seen ${new Date(member.last_seen).toLocaleDateString()}` : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {availableMembers.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: isDark ? '#a1a1aa' : '#52525b' }}>No other team members found.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
