'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function ChatView() {
  const { theme, channels, activeChannel, setActiveChannel, messages, addMessage } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [newMessage, setNewMessage] = useState('');

  const currentChannel = channels.find(c => c.id === activeChannel) || channels[0];
  const channelMessages = messages.filter(m => m.channelId === (activeChannel || 'ch1'));

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    addMessage({
      id: `m${Date.now()}`,
      channelId: activeChannel || 'ch1',
      userId: '1',
      userName: 'Sneha Sharma',
      userAvatar: '🧘‍♀️',
      content: newMessage,
      reactions: {},
      createdAt: new Date().toISOString(),
    });
    setNewMessage('');
  };

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden" style={{ border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` }}>
      {/* Channels Sidebar */}
      <div className="w-64 flex-shrink-0 border-r overflow-y-auto" style={{ background: isDark ? 'rgba(10,10,15,0.5)' : 'rgba(248,247,255,0.5)', borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: textColor }}>💬 Channels</h3>
          <div className="space-y-1">
            {channels.map(ch => (
              <motion.button key={ch.id} whileHover={{ x: 2 }} onClick={() => setActiveChannel(ch.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: (activeChannel || 'ch1') === ch.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                  color: (activeChannel || 'ch1') === ch.id ? '#a855f7' : mutedColor,
                }}>
                <span className="text-sm">{ch.type === 'private' ? '🔒' : '#'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ch.name}</p>
                  {ch.lastMessage && <p className="text-[10px] truncate" style={{ color: mutedColor }}>{ch.lastMessage}</p>}
                </div>
                {ch.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{ch.unreadCount}</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col" style={{ background: isDark ? 'rgba(18,18,26,0.3)' : 'rgba(255,255,255,0.3)' }}>
        {/* Chat Header */}
        <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
          <span className="text-lg">#</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: textColor }}>{currentChannel?.name || 'general'}</p>
            <p className="text-[10px]" style={{ color: mutedColor }}>{currentChannel?.description}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {channelMessages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}>{msg.userAvatar}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: textColor }}>{msg.userName}</span>
                  <span className="text-[10px]" style={{ color: mutedColor }}>{new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: isDark ? '#d4d4d8' : '#3f3f46' }}>{msg.content}</p>
                {Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span key={emoji} className="text-xs px-2 py-0.5 rounded-full" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}>{emoji} {users.length}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
          <div className="flex items-center gap-3">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={`Message #${currentChannel?.name || 'general'}`}
              className="input-field flex-1"
            />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={sendMessage} className="btn-primary">Send</motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
