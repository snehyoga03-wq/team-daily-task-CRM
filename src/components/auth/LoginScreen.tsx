'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { motion } from 'framer-motion';

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    await login(name, phone);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #f8f7ff 0%, #ede9fe 50%, #f0fdfa 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo Card */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-4xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #9333ea, #06b6d4)',
              boxShadow: '0 12px 40px rgba(139,92,246,0.25)',
            }}
          >
            🧘
          </motion.div>
          <h1
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #9333ea, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SnehYoga CRM
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b6880' }}>
            Team Workspace Login
          </p>
        </div>

        {/* Login Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139,92,246,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          }}
        >
          {/* Name Field */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#6b6880' }}>
              Your Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">👤</span>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError(); }}
                placeholder="Enter your name"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  background: '#f8f8f8',
                  border: '1px solid rgba(139,92,246,0.12)',
                  color: '#1e1b2e',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.12)')}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#6b6880' }}>
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">📱</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); clearError(); }}
                placeholder="10-digit mobile number"
                pattern="[0-9+\-\s]{10,15}"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  background: '#f8f8f8',
                  border: '1px solid rgba(139,92,246,0.12)',
                  color: '#1e1b2e',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.12)')}
                required
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-xs text-center py-2 px-3 rounded-lg"
              style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}
            >
              {error}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !name.trim() || !phone.trim()}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #9333ea, #7e22ce)',
              boxShadow: '0 8px 25px rgba(139,92,246,0.3)',
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Logging in...
              </span>
            ) : (
              'Join Workspace →'
            )}
          </motion.button>

          <p className="text-[10px] text-center" style={{ color: '#6b6880' }}>
            New members are auto-registered on first login
          </p>
        </motion.form>

        {/* Footer */}
        <p className="text-[10px] text-center mt-6" style={{ color: '#9ca3af' }}>
          SnehYoga Internal CRM • Powered by 🧘
        </p>
      </motion.div>
    </div>
  );
}
