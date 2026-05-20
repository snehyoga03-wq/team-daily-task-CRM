'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, DbUser } from './supabase';

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

        // Clean phone number - remove spaces, dashes, +91 prefix
        const cleanPhone = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');

        try {
          // Try to find user by phone number
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('phone', cleanPhone)
            .single();

          if (existingUser) {
            // User exists — log them in
            set({ currentUser: existingUser, isLoading: false });
            return true;
          }

          // User doesn't exist — create new team member
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              full_name: name.trim(),
              phone: cleanPhone,
              role: 'member',
              xp_points: 0,
              level: 1,
              streak_days: 0,
              is_active: true,
            })
            .select()
            .single();

          if (insertError) {
            set({ error: insertError.message, isLoading: false });
            return false;
          }

          set({ currentUser: newUser, isLoading: false });
          return true;
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
