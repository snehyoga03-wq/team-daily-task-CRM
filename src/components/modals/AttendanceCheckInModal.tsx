'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import * as dataService from '@/lib/dataService';
import { motion, AnimatePresence } from 'framer-motion';

export default function AttendanceCheckInModal() {
  const { currentUser } = useAuthStore();
  const { theme, dataLoaded } = useAppStore();
  const isDark = theme === 'dark';

  const [showModal, setShowModal] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Keep live time updated
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check attendance requirements
  const checkAttendanceStatus = async () => {
    if (!currentUser) {
      setChecking(false);
      setShowModal(false);
      return;
    }

    try {
      setChecking(true);
      const record = await dataService.fetchUserTodayAttendance(currentUser.id);
      
      console.log('[AttendanceCheckInModal] User today attendance record:', record);

      // If user already has a check_in timestamp for today
      if (record && record.check_in) {
        setShowModal(false);
      } else {
        // User has not checked in for today -> Show modal
        setShowModal(true);
      }
    } catch (err) {
      console.error('[AttendanceCheckInModal] Error checking attendance:', err);
      // On error or no record found, show modal to ensure check-in option is available
      setShowModal(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      checkAttendanceStatus();
    } else {
      setShowModal(false);
      setChecking(false);
    }
  }, [currentUser, dataLoaded]);

  const handleCheckIn = async () => {
    if (!currentUser || submitting) return;
    try {
      setSubmitting(true);
      const result = await dataService.checkIn(currentUser.id);
      console.log('[AttendanceCheckInModal] Check-in successful:', result);
      setShowModal(false);
    } catch (err) {
      console.error('[AttendanceCheckInModal] Check in failed:', err);
      alert('Failed to check in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking || !showModal || !currentUser) {
    return null;
  }

  const now = currentTime || new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isLate = now.getHours() >= 10;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl relative border"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(26,26,38,0.98), rgba(16,16,24,0.98))'
              : 'linear-gradient(135deg, #ffffff, #f8f9ff)',
            borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)',
            boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.3)',
          }}
        >
          {/* Header Icon */}
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl shadow-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white animate-pulse">
            ⏰
          </div>

          {/* Title & Greeting */}
          <div className="text-center space-y-2 mb-6">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: isDark ? '#f4f4f5' : '#1e1b2e' }}
            >
              Daily Attendance Check-In
            </h2>
            <p className="text-sm" style={{ color: isDark ? '#a1a1aa' : '#6b6880' }}>
              Welcome back,{' '}
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {currentUser.full_name}
              </span>
              ! Please check in for today to continue.
            </p>
          </div>

          {/* Time & Date Display Box */}
          <div
            className="p-4 rounded-2xl mb-6 text-center border"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(139,92,246,0.04)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139,92,246,0.12)',
            }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: isDark ? '#71717a' : '#8e8aa0' }}>
              {dateStr}
            </p>
            <p className="text-3xl font-extrabold font-mono tracking-tight text-purple-600 dark:text-purple-400">
              {timeStr}
            </p>
          </div>

          {/* Status Note */}
          <div
            className={`p-3.5 rounded-xl text-xs font-medium mb-6 flex items-start gap-2.5 ${
              isLate
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <span className="text-base">{isLate ? '🟠' : '🟢'}</span>
            <div>
              {isLate ? (
                <span>
                  Standard start time is 10:00 AM. Checking in now will mark attendance as <strong>Late</strong>.
                </span>
              ) : (
                <span>
                  You are checking in on time today! (Official start: 10:00 AM)
                </span>
              )}
            </div>
          </div>

          {/* Check-In Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckIn}
            disabled={submitting}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.4)',
            }}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Recording Attendance...</span>
              </>
            ) : (
              <>
                <span>🚀 Check In Now</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
