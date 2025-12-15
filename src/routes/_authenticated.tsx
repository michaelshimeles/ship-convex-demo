import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { getSignInUrl } from '@workos/authkit-tanstack-react-start';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEffect, useRef } from 'react';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    // Use the cached auth from root context - no additional server round-trip
    const { userId } = context;

    if (!userId) {
      // Only make server call when we actually need to redirect
      const href = await getSignInUrl({ data: { returnPathname: location.pathname } });
      throw redirect({ href });
    }

    return { userId };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const hasSynced = useRef(false);

  useEffect(() => {
    // Sync user data on first render after authentication
    if (!hasSynced.current) {
      hasSynced.current = true;
      syncCurrentUser().catch(console.error);
    }
  }, [syncCurrentUser]);

  return <Outlet />;
}
