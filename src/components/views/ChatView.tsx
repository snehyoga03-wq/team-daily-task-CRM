'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import NewDMModal from '../modals/NewDMModal';
import CreateGroupModal from '../modals/CreateGroupModal';

export default function ChatView() {
  const { theme, channels, activeChannel, setActiveChannel, messages, addMessage, teamMembers, markMessageAsReadBy, updateMessageStatus } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [newMessage, setNewMessage] = useState('');
  
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const currentChannel = channels.find(c => c.id === activeChannel) || channels[0];
  const channelMessages = messages.filter(m => m.channel_id === (activeChannel || channels[0]?.id));

  const directChannels = channels.filter(c => !c.is_group && c.type === 'direct');
  const groupChannels = channels.filter(c => c.is_group || c.type !== 'direct');

  useEffect(() => {
    if (currentUser && currentChannel) {
      channelMessages.forEach(msg => {
        if (msg.user_id !== currentUser.id && msg.status !== 'read' && !msg.read_by?.[currentUser.id]) {
          markMessageAsReadBy(msg.id, currentUser.id);
        }
      });
    }
  }, [activeChannel, channelMessages.length, currentUser, markMessageAsReadBy]);

  const sendMsg = () => {
    if (!newMessage.trim() || !currentUser) return;
    const msgId = `m${Date.now()}`;
    addMessage({
      id: msgId,
      channel_id: activeChannel || channels[0]?.id || '',
      user_id: currentUser.id,
      userName: currentUser.full_name,
      userAvatar: currentUser.full_name?.charAt(0) || '?',
      content: newMessage,
      attachments: [],
      reactions: {},
      reply_to: null,
      status: 'sent',
      read_by: {},
      created_at: new Date().toISOString(),
    });
    setNewMessage('');
    
    // Simulate WhatsApp-like delivery and read ticks for demo purposes
    setTimeout(() => {
      updateMessageStatus(msgId, 'delivered');
    }, 1500);
    setTimeout(() => {
      updateMessageStatus(msgId, 'read');
    }, 3500);
  };

  const getChannelName = (ch: any) => {
    if (ch.is_group || ch.type !== 'direct') return ch.name;
    const otherUserId = ch.members?.find((id: string) => id !== currentUser?.id);
    const otherUser = teamMembers.find(m => m.id === otherUserId);
    return otherUser ? otherUser.full_name : 'Direct Message';
  };

  const getChannelAvatar = (ch: any) => {
    if (ch.is_group || ch.type !== 'direct') return ch.type === 'private' ? '🔒' : '#';
    const otherUserId = ch.members?.find((id: string) => id !== currentUser?.id);
    const otherUser = teamMembers.find(m => m.id === otherUserId);
    return otherUser ? otherUser.full_name?.charAt(0) : '?';
  };
  
  const isChannelOnline = (ch: any) => {
    if (ch.is_group || ch.type !== 'direct') return false;
    const otherUserId = ch.members?.find((id: string) => id !== currentUser?.id);
    const otherUser = teamMembers.find(m => m.id === otherUserId);
    return otherUser?.is_online || false;
  };

  const renderTicks = (msg: any) => {
    if (msg.user_id !== currentUser?.id) return null;
    if (msg.status === 'read') return <span className="text-blue-500 text-xs ml-1 tracking-tighter">✓✓</span>;
    if (msg.status === 'delivered') return <span className="text-gray-400 text-xs ml-1 tracking-tighter">✓✓</span>;
    return <span className="text-gray-400 text-xs ml-1">✓</span>;
  };

  return (
    <>
      <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden" style={{ border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` }}>
        {/* Channels Sidebar */}
        <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ background: isDark ? 'rgba(10,10,15,0.5)' : 'rgba(248,247,255,0.5)', borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
          <div className="p-4 border-b" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
            <h2 className="text-lg font-bold" style={{ color: textColor }}>Chats</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {/* Direct Messages */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: mutedColor }}>Direct Messages</h3>
                <button onClick={() => setIsDMModalOpen(true)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-purple-500/20 text-purple-500 transition-colors">
                  +
                </button>
              </div>
              <div className="space-y-1">
                {directChannels.map(ch => (
                  <motion.button key={ch.id} whileHover={{ x: 2 }} onClick={() => setActiveChannel(ch.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: (activeChannel || channels[0]?.id) === ch.id ? (isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)') : 'transparent',
                    }}>
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {getChannelAvatar(ch)}
                      </div>
                      {isChannelOnline(ch) && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2" style={{ borderColor: isDark ? '#1a1a24' : '#f8f7ff' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: (activeChannel || channels[0]?.id) === ch.id ? '#a855f7' : textColor }}>
                        {getChannelName(ch)}
                      </p>
                      {ch.lastMessage && <p className="text-[11px] truncate" style={{ color: mutedColor }}>{ch.lastMessage}</p>}
                    </div>
                    {(ch.unreadCount || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{ch.unreadCount}</span>
                    )}
                  </motion.button>
                ))}
                {directChannels.length === 0 && <p className="text-xs px-2" style={{ color: mutedColor }}>No direct messages yet.</p>}
              </div>
            </div>

            {/* Groups */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: mutedColor }}>Groups</h3>
                <button onClick={() => setIsGroupModalOpen(true)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-purple-500/20 text-purple-500 transition-colors">
                  +
                </button>
              </div>
              <div className="space-y-1">
                {groupChannels.map(ch => (
                  <motion.button key={ch.id} whileHover={{ x: 2 }} onClick={() => setActiveChannel(ch.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: (activeChannel || channels[0]?.id) === ch.id ? (isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)') : 'transparent',
                    }}>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-500 text-sm font-bold flex-shrink-0">
                      {getChannelAvatar(ch)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: (activeChannel || channels[0]?.id) === ch.id ? '#a855f7' : textColor }}>
                        {getChannelName(ch)}
                      </p>
                      {ch.lastMessage && <p className="text-[11px] truncate" style={{ color: mutedColor }}>{ch.lastMessage}</p>}
                    </div>
                    {(ch.unreadCount || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{ch.unreadCount}</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col" style={{ background: isDark ? 'rgba(18,18,26,0.3)' : 'rgba(255,255,255,0.3)' }}>
          {/* Chat Header */}
          <div className="px-6 py-4 border-b flex items-center gap-4" style={{ background: isDark ? 'rgba(10,10,15,0.8)' : 'rgba(255,255,255,0.8)', borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-lg font-bold">
                {getChannelAvatar(currentChannel)}
              </div>
              {isChannelOnline(currentChannel) && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2" style={{ borderColor: isDark ? '#1a1a24' : '#ffffff' }} />
              )}
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: textColor }}>{getChannelName(currentChannel)}</p>
              <p className="text-xs" style={{ color: mutedColor }}>
                {currentChannel?.is_group || currentChannel?.type !== 'direct' 
                  ? `${currentChannel?.members?.length || 0} participants`
                  : (isChannelOnline(currentChannel) ? 'Online' : 'Offline')
                }
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {channelMessages.map((msg, idx) => {
              const isMe = msg.user_id === currentUser?.id;
              const showAvatar = !isMe && (idx === 0 || channelMessages[idx - 1].user_id !== msg.user_id);
              
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                  className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {!isMe && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 text-white ${showAvatar ? 'bg-purple-500' : 'bg-transparent'}`}>
                      {showAvatar ? msg.userAvatar : ''}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {!isMe && showAvatar && (
                      <span className="text-xs mb-1 ml-1" style={{ color: mutedColor }}>{msg.userName}</span>
                    )}
                    
                    <div className={`px-4 py-2.5 rounded-2xl relative ${isMe ? 'bg-purple-600 text-white rounded-br-sm' : 'rounded-bl-sm'}`}
                      style={!isMe ? { background: isDark ? '#2a2a3a' : '#ffffff', color: textColor, border: `1px solid ${isDark ? '#3f3f46' : '#e5e2f0'}` } : {}}
                    >
                      <p className="text-[15px] leading-relaxed">{msg.content}</p>
                      
                      <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                        <span className="text-[10px]">
                          {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {renderTicks(msg)}
                      </div>
                    </div>
                    
                    {Object.keys(msg.reactions || {}).length > 0 && (
                      <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <span key={emoji} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ background: isDark ? '#1e1e2d' : '#f8f7ff', borderColor: isDark ? '#3f3f46' : '#e5e2f0', color: textColor }}>
                            {emoji} {users.length}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Message Input */}
          <div className="p-4 bg-transparent border-t" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
            <div className="flex items-center gap-3 bg-opacity-50 p-2 rounded-2xl" style={{ background: isDark ? '#1e1e2d' : '#ffffff', border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` }}>
              <button className="p-2 text-gray-400 hover:text-purple-500 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                style={{ color: textColor }}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={sendMsg} 
                className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                disabled={!newMessage.trim()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <NewDMModal isOpen={isDMModalOpen} onClose={() => setIsDMModalOpen(false)} />
      <CreateGroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </>
  );
}
