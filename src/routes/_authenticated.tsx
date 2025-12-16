import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { getSignInUrl } from '@workos/authkit-tanstack-react-start';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';

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
  loader: async ({ context }) => {
    // Preload user data for all authenticated routes - prevents layout shift
    await context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {}));
  },
  component: () => <Outlet />,
});
