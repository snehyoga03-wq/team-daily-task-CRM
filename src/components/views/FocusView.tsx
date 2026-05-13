'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

const sounds = ['Rain', 'Forest', 'Ocean', 'Fire', 'Wind', 'Silence'];

export default function FocusView() {
  const { theme, isFocusActive, startFocusSession, endFocusSession } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Silence');
  const [sessionsToday, setSessionsToday] = useState(3);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      endFocusSession();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft, endFocusSession]);

  const toggleTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      startFocusSession({ id: Date.now().toString(), duration, completedMinutes: 0, type: 'focus', startedAt: new Date().toISOString() });
    } else {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    endFocusSession();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - timeLeft / (duration * 60);
  const circumference = 2 * Math.PI * 140;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
      {/* Timer */}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
        <svg width="320" height="320" viewBox="0 0 320 320">
          <defs>
            <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {/* Background ring */}
          <circle cx="160" cy="160" r="140" fill="none" stroke={isDark ? '#2a2a3a' : '#e5e2f0'} strokeWidth="8" />
          {/* Progress ring */}
          <motion.circle
            cx="160" cy="160" r="140" fill="none" stroke="url(#focusGrad)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 160 160)" filter={isRunning ? 'url(#glow)' : undefined}
            initial={false} animate={{ strokeDashoffset: circumference * (1 - progress) }}
          />
          {/* Inner glow */}
          {isRunning && <circle cx="160" cy="160" r="120" fill={isDark ? 'rgba(139,92,246,0.03)' : 'rgba(139,92,246,0.02)'} />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span key={timeLeft} initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-6xl font-light tracking-wider" style={{ color: textColor }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </motion.span>
          <p className="text-sm mt-2" style={{ color: mutedColor }}>{isRunning ? 'Deep Focus Mode' : 'Ready to focus?'}</p>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTimer}
          className="px-8 py-3 rounded-2xl text-sm font-semibold text-white"
          style={{ background: isRunning ? 'rgba(244,63,94,0.8)' : 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
          {isRunning ? '⏸ Pause' : '▶ Start Focus'}
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={resetTimer}
          className="px-6 py-3 rounded-2xl text-sm font-medium"
          style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}>
          ↺ Reset
        </motion.button>
      </div>

      {/* Duration Picker */}
      <div className="flex items-center gap-3">
        {[15, 25, 45, 60].map(d => (
          <motion.button key={d} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setDuration(d); setTimeLeft(d * 60); setIsRunning(false); }}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: duration === d ? 'rgba(139,92,246,0.15)' : isDark ? '#1a1a25' : '#f3f0ff',
              color: duration === d ? '#a855f7' : mutedColor,
              border: `1px solid ${duration === d ? 'rgba(139,92,246,0.3)' : 'transparent'}`,
            }}>
            {d} min
          </motion.button>
        ))}
      </div>

      {/* Ambient Sounds */}
      <div>
        <p className="text-xs text-center mb-3" style={{ color: mutedColor }}>🎵 Ambient Sound</p>
        <div className="flex flex-wrap justify-center gap-2">
          {sounds.map(s => (
            <motion.button key={s} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedSound(s)}
              className="px-4 py-2 rounded-xl text-xs font-medium"
              style={{
                background: selectedSound === s ? 'rgba(6,182,212,0.15)' : isDark ? '#1a1a25' : '#f3f0ff',
                color: selectedSound === s ? '#06b6d4' : mutedColor,
                border: `1px solid ${selectedSound === s ? 'rgba(6,182,212,0.3)' : 'transparent'}`,
              }}>
              {s}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        {[
          { label: 'Sessions Today', value: sessionsToday, icon: '🎯' },
          { label: 'Focus Hours', value: '3.2h', icon: '⏰' },
          { label: 'Streak', value: '12 days', icon: '🔥' },
        ].map((s, i) => (
          <div key={i} className="stat-card text-center">
            <span className="text-lg">{s.icon}</span>
            <p className="text-lg font-bold mt-1" style={{ color: textColor }}>{s.value}</p>
            <p className="text-[10px]" style={{ color: mutedColor }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
