'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type RobotEmotion = 'happy' | 'love' | 'sad' | 'surprised' | 'sleeping' | 'angry';

interface CuteRobotMascotProps {
  emotion?: RobotEmotion;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isSpeaking?: boolean;
}

export default function CuteRobotMascot({
  emotion = 'happy',
  size = 'md',
  className = '',
  isSpeaking = false,
}: CuteRobotMascotProps) {
  // Size mapping
  const sizeMap = {
    xs: { width: 28, height: 28, scale: 0.55 },
    sm: { width: 36, height: 36, scale: 0.7 },
    md: { width: 48, height: 48, scale: 0.95 },
    lg: { width: 64, height: 64, scale: 1.25 },
    xl: { width: 84, height: 84, scale: 1.65 },
  };

  const { width, height } = sizeMap[size] || sizeMap.md;

  // Colors based on emotion
  const getColors = () => {
    switch (emotion) {
      case 'angry':
        return {
          caseOuter: 'url(#redGradient)',
          caseInner: '#450a0a',
          screen: '#170505',
          antenna: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.6)',
          ear: '#b91c1c',
        };
      case 'love':
        return {
          caseOuter: 'url(#pinkGradient)',
          caseInner: '#3b0764',
          screen: '#0f172a',
          antenna: '#ec4899',
          glow: 'rgba(236, 72, 153, 0.6)',
          ear: '#db2777',
        };
      case 'sleeping':
        return {
          caseOuter: 'url(#blueGradient)',
          caseInner: '#1e1b4b',
          screen: '#0b0f19',
          antenna: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.3)',
          ear: '#38bdf8',
        };
      case 'sad':
        return {
          caseOuter: 'url(#greyGradient)',
          caseInner: '#1e293b',
          screen: '#0f172a',
          antenna: '#60a5fa',
          glow: 'rgba(96, 165, 250, 0.4)',
          ear: '#475569',
        };
      case 'surprised':
        return {
          caseOuter: 'url(#amberGradient)',
          caseInner: '#451a03',
          screen: '#0f172a',
          antenna: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.6)',
          ear: '#d97706',
        };
      case 'happy':
      default:
        return {
          caseOuter: 'url(#cyanGradient)',
          caseInner: '#1e1b4b',
          screen: '#0f172a',
          antenna: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.5)',
          ear: '#0284c7',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Background Glow Aura */}
      <motion.div
        animate={{
          scale: emotion === 'angry' || emotion === 'surprised' ? [1, 1.2, 1] : [1, 1.08, 1],
          opacity: emotion === 'sleeping' ? [0.3, 0.5, 0.3] : [0.6, 0.9, 0.6],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full blur-md -z-10"
        style={{ background: colors.glow }}
      />

      {/* Sleeping Zzz Floating Animation */}
      <AnimatePresence>
        {emotion === 'sleeping' && (
          <div className="absolute -top-3 -right-2 pointer-events-none z-20 flex flex-col items-center">
            <motion.span
              initial={{ opacity: 0, y: 5, x: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], y: -18, x: 8, scale: 1 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0 }}
              className="text-cyan-400 font-extrabold text-[12px] leading-none drop-shadow"
            >
              Z
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 5, x: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], y: -14, x: 12, scale: 0.8 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
              className="text-blue-300 font-bold text-[9px] leading-none drop-shadow"
            >
              z
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 5, x: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], y: -10, x: 15, scale: 0.6 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 1.4 }}
              className="text-indigo-300 font-semibold text-[7px] leading-none drop-shadow"
            >
              z
            </motion.span>
          </div>
        )}
      </AnimatePresence>

      {/* Sad Tear Falling Animation */}
      <AnimatePresence>
        {emotion === 'sad' && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: [0, 1, 1, 0], y: [0, 12, 18, 24] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeIn', delay: 0.3 }}
            className="absolute z-20 pointer-events-none"
            style={{ left: '32%', top: '56%' }}
          >
            <svg width="6" height="8" viewBox="0 0 6 8" fill="none">
              <path
                d="M3 0C3 0 0 3.5 0 5.5C0 7.15685 1.34315 8.5 3 8.5C4.65685 8.5 6 7.15685 6 5.5C6 3.5 3 0 3 0Z"
                fill="#60A5FA"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Robot SVG */}
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        animate={
          isSpeaking
            ? { y: [0, -3, 0], rotate: [0, -2, 2, 0] }
            : emotion === 'happy'
            ? { y: [0, -2, 0] }
            : emotion === 'angry'
            ? { x: [-1, 1, -1, 1, 0] }
            : { y: 0 }
        }
        transition={
          isSpeaking
            ? { duration: 0.4, repeat: Infinity }
            : emotion === 'happy'
            ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
            : emotion === 'angry'
            ? { duration: 0.3, repeat: Infinity }
            : { duration: 1 }
        }
      >
        <defs>
          <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#831843" />
          </linearGradient>

          <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          <linearGradient id="greyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ─── 1. Antenna ─────────────────────────────────────────── */}
        <g className="origin-bottom" style={{ transformOrigin: '50% 25%' }}>
          {/* Stem */}
          <line x1="50" y1="26" x2="50" y2="10" stroke={colors.ear} strokeWidth="3.5" strokeLinecap="round" />
          {/* Glowing Ball */}
          <motion.circle
            cx="50"
            cy="8"
            r="5.5"
            fill={colors.antenna}
            filter="url(#glow)"
            animate={{
              scale: emotion === 'angry' || emotion === 'surprised' ? [1, 1.3, 1] : [1, 1.15, 1],
              opacity: emotion === 'sleeping' ? [0.4, 0.7, 0.4] : [0.8, 1, 0.8],
            }}
            transition={{
              duration: emotion === 'angry' ? 0.3 : 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Center highlight on ball */}
          <circle cx="48.5" cy="6.5" r="1.8" fill="#ffffff" opacity="0.8" />
        </g>

        {/* ─── 2. Earphones / Side Pods ───────────────────────────── */}
        <rect x="8" y="44" width="8" height="24" rx="4" fill={colors.ear} />
        <rect x="84" y="44" width="8" height="24" rx="4" fill={colors.ear} />
        <rect x="11" y="48" width="3" height="16" rx="1.5" fill="#ffffff" opacity="0.4" />
        <rect x="86" y="48" width="3" height="16" rx="1.5" fill="#ffffff" opacity="0.4" />

        {/* ─── 3. Outer Head Case ─────────────────────────────────── */}
        <rect
          x="14"
          y="24"
          width="72"
          height="62"
          rx="26"
          fill={colors.caseOuter}
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />

        {/* Inner Case Bezel */}
        <rect x="18" y="28" width="64" height="54" rx="22" fill={colors.caseInner} />

        {/* ─── 4. Face Screen (Dark Glass) ────────────────────────── */}
        <rect
          x="22"
          y="32"
          width="56"
          height="46"
          rx="18"
          fill={colors.screen}
          stroke={colors.antenna}
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* Subtle Screen Reflection Arc */}
        <path d="M 28 36 Q 50 38 72 36" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.15" fill="none" strokeLinecap="round" />

        {/* ─── 5. Facial Expressions (Eyes & Mouth) ────────────────── */}
        <g>
          {/* --- HAPPY / NORMAL EXPRESSION --- */}
          {emotion === 'happy' && (
            <>
              {/* Left Eye */}
              <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 1] }} style={{ transformOrigin: '36px 50px' }}>
                <circle cx="36" cy="50" r="7" fill={colors.antenna} />
                <circle cx="38" cy="48" r="2.5" fill="#ffffff" />
                <circle cx="34" cy="52" r="1.2" fill="#ffffff" />
              </motion.g>

              {/* Right Eye */}
              <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 1] }} style={{ transformOrigin: '64px 50px' }}>
                <circle cx="64" cy="50" r="7" fill={colors.antenna} />
                <circle cx="66" cy="48" r="2.5" fill="#ffffff" />
                <circle cx="62" cy="52" r="1.2" fill="#ffffff" />
              </motion.g>

              {/* Cheerful Smile */}
              <motion.path
                d="M 40 64 Q 50 72 60 64"
                stroke={colors.antenna}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                animate={isSpeaking ? { d: ['M 40 64 Q 50 72 60 64', 'M 42 63 Q 50 75 58 63', 'M 40 64 Q 50 72 60 64'] } : {}}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
              {/* Cute Cheek Blushes */}
              <ellipse cx="28" cy="58" rx="4" ry="2" fill="#f43f5e" opacity="0.4" />
              <ellipse cx="72" cy="58" rx="4" ry="2" fill="#f43f5e" opacity="0.4" />
            </>
          )}

          {/* --- LOVE / EXCITED EXPRESSION --- */}
          {emotion === 'love' && (
            <>
              {/* Left Heart Eye */}
              <motion.g animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ transformOrigin: '36px 50px' }}>
                <path
                  d="M 36 54 Q 30 46 36 44 Q 42 46 36 54 Z"
                  fill="#ef4444"
                  filter="url(#glow)"
                  transform="scale(1.4) translate(-10, -12)"
                />
              </motion.g>

              {/* Right Heart Eye */}
              <motion.g animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.1 }} style={{ transformOrigin: '64px 50px' }}>
                <path
                  d="M 64 54 Q 58 46 64 44 Q 70 46 64 54 Z"
                  fill="#ef4444"
                  filter="url(#glow)"
                  transform="scale(1.4) translate(-18, -12)"
                />
              </motion.g>

              {/* Big Joyful Smile */}
              <path d="M 38 63 Q 50 74 62 63 Z" fill="#ef4444" />
              {/* Blushing Cheeks */}
              <ellipse cx="26" cy="57" rx="5" ry="2.5" fill="#f43f5e" opacity="0.7" />
              <ellipse cx="74" cy="57" rx="5" ry="2.5" fill="#f43f5e" opacity="0.7" />
            </>
          )}

          {/* --- SAD / OVERDUE EXPRESSION --- */}
          {emotion === 'sad' && (
            <>
              {/* Sad Slanted Eyes */}
              <g style={{ transformOrigin: '36px 52px' }}>
                <circle cx="36" cy="52" r="6" fill="#60a5fa" />
                <circle cx="37" cy="50" r="2" fill="#ffffff" />
                <path d="M 30 45 Q 36 43 42 47" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
              <g style={{ transformOrigin: '64px 52px' }}>
                <circle cx="64" cy="52" r="6" fill="#60a5fa" />
                <circle cx="65" cy="50" r="2" fill="#ffffff" />
                <path d="M 58 47 Q 64 43 70 45" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>

              {/* Sad Frown */}
              <path d="M 42 67 Q 50 61 58 67" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          )}

          {/* --- SURPRISED / URGENT EXPRESSION --- */}
          {emotion === 'surprised' && (
            <>
              {/* Wide Eyes */}
              <motion.circle cx="36" cy="50" r="8.5" fill="#f59e0b" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} />
              <circle cx="36" cy="50" r="3" fill="#ffffff" />

              <motion.circle cx="64" cy="50" r="8.5" fill="#f59e0b" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} />
              <circle cx="64" cy="50" r="3" fill="#ffffff" />

              {/* Surprised 'O' Mouth */}
              <motion.circle cx="50" cy="66" r="5" fill="#f59e0b" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            </>
          )}

          {/* --- SLEEPING / IDLE EXPRESSION --- */}
          {emotion === 'sleeping' && (
            <>
              {/* Closed Eyes Horizontal Lines */}
              <path d="M 30 52 Q 36 55 42 52" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 58 52 Q 64 55 70 52" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />

              {/* Sleeping small mouth dash */}
              <line x1="46" y1="65" x2="54" y2="65" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}

          {/* --- ANGRY / CRITICAL EXPRESSION --- */}
          {emotion === 'angry' && (
            <>
              {/* Angry Inward Eyebrows over glowing pupils */}
              <path d="M 28 44 L 44 50" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="37" cy="52" r="5" fill="#ef4444" filter="url(#glow)" />
              <circle cx="38" cy="51" r="2" fill="#ffffff" />

              <path d="M 72 44 L 56 50" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="63" cy="52" r="5" fill="#ef4444" filter="url(#glow)" />
              <circle cx="62" cy="51" r="2" fill="#ffffff" />

              {/* Angry zigzag mouth */}
              <path d="M 40 67 L 45 64 L 50 67 L 55 64 L 60 67" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </>
          )}
        </g>
      </motion.svg>
    </div>
  );
}
