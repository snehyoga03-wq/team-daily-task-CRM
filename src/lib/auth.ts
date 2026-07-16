'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, DbUser } from './supabase';

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.length > 10 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length > 10 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

interface AuthState {
  currentUser: DbUser | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (name: string, phone: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isLoading: false,
      error: null,

      login: async (name: string, phone: string) => {
        set({ isLoading: true, error: null });

        const cleanPhone = cleanPhoneNumber(phone);
        const rawPhone = phone.replace(/[\s\-\+\(\)]/g, '');
        const possiblePhones = Array.from(new Set([
          cleanPhone,
          rawPhone,
          cleanPhone.startsWith('91') ? cleanPhone.slice(2) : `91${cleanPhone}`,
          cleanPhone.startsWith('0') ? cleanPhone.slice(1) : `0${cleanPhone}`,
          phone.trim()
        ].filter(Boolean)));

        try {
          // Try to find user by any possible matching phone number variation
          const { data: existingUsers, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .in('phone', possiblePhones);

          if (existingUsers && existingUsers.length > 0) {
            // User exists — log them in
            const match = existingUsers.find(u => u.phone === cleanPhone) ||
                          existingUsers.find(u => u.full_name?.toLowerCase() === name.trim().toLowerCase()) ||
                          existingUsers.find(u => u.role === 'admin') ||
                          existingUsers[0];

            if (match && match.phone !== cleanPhone && cleanPhone.length >= 10) {
              supabase.from('users').update({ phone: cleanPhone }).eq('id', match.id).then();
              match.phone = cleanPhone;
            }

            set({ currentUser: match, isLoading: false });
            return true;
          }

          // User doesn't exist — block entry
          set({ error: 'User not found. Contact admin for the correct user ID.', isLoading: false });
          return false;
        } catch (err: any) {
          set({ error: err.message || 'Login failed', isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ currentUser: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'snehyoga-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
      }),
    }
  )
);
