import { redirect, useRouteContext } from '@tanstack/react-router';
import { getAuth, getSignInUrl } from '@workos/authkit-tanstack-react-start';
import type { ReactNode } from 'react';

/**
 * Require authentication in a route loader.
 * Redirects to sign-in if not authenticated, otherwise returns the user.
 */
export async function requireAuth(pathname: string) {
  const { user } = await getAuth();

  if (!user) {
    const href = await getSignInUrl({ data: { returnPathname: pathname } });
    throw redirect({ href });
  }

  return { user };
}

/**
 * Hook to get the current auth state from the router context.
 */
export function useAuth() {
  const { userId, token } = useRouteContext({ from: '__root__' });
  return {
    isAuthenticated: !!userId,
    userId,
    token,
  };
}

/**
 * Renders children only if the user is authenticated.
 */
// export function Authenticated({ children }: { children: ReactNode }) {
//   const { isAuthenticated } = useAuth();
//   if (!isAuthenticated) return null;
//   return <>{children}</>;
// }

/**
 * Renders children only if the user is NOT authenticated.
 */
// export function Unauthenticated({ children }: { children: ReactNode }) {
//   const { isAuthenticated } = useAuth();
//   if (isAuthenticated) return null;
//   return <>{children}</>;
// }
