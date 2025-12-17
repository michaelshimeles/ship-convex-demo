'use client';

import { useMutation } from 'convex/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '../../convex/_generated/api';

interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
}

interface UserSyncProps {
  profile?: UserProfile | null;
}

/**
 * Client-only component that syncs the authenticated user to Convex
 * This runs only when the user is authenticated with WorkOS but doesn't exist in Convex yet
 * Accepts the user profile from WorkOS session which has email, name, etc.
 */
export function UserSync({ profile }: UserSyncProps) {
  const syncUser = useMutation(api.users.syncCurrentUser);
  const queryClient = useQueryClient();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    // Pass the profile to the mutation so it has access to email, name, etc.
    syncUser({ profile: profile ?? undefined })
      .then(() => {
        // Invalidate user query to refetch after sync
        queryClient.invalidateQueries({ queryKey: ['convex', 'myFunctions', 'getUser'] });
      })
      .catch((error) => {
        console.error('[UserSync] Failed to sync user:', error);
        hasSyncedRef.current = false; // Allow retry on error
      });
  }, [syncUser, queryClient, profile]);

  // This component doesn't render anything
  return null;
}

