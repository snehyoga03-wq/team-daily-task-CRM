'use client';

import { useAuthStore } from './auth';
import { useAppStore } from './store';
import { useEffect } from 'react';

/**
 * Check if the current user has admin role
 */
export function useIsAdmin(): boolean {
  const { currentUser } = useAuthStore();
  return currentUser?.role === 'admin';
}

/**
 * Redirect non-admin users to dashboard
 */
export function useRequireAdmin(): boolean {
  const isAdmin = useIsAdmin();
  const { setActiveView } = useAppStore();

  useEffect(() => {
    if (!isAdmin) {
      setActiveView('dashboard');
    }
  }, [isAdmin, setActiveView]);

  return isAdmin;
}
