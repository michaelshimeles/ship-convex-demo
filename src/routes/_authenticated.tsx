import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { getAuth, getSignInUrl } from '@workos/authkit-tanstack-react-start';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';

export const Route = createFileRoute('/_authenticated')({
  loader: async ({ context, location }) => {
    // Check auth on the server side
    const auth = await getAuth();

    if (!auth.user) {
      // Redirect directly to WorkOS sign-in with return path
      const signInUrl = await getSignInUrl({
        data: { returnPathname: location.pathname },
      });
      throw redirect({ href: signInUrl });
    }

    // Preload user data for all authenticated routes - prevents layout shift
    await context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {}));
    
    return { userId: auth.user.id };
  },
  component: () => <Outlet />,
});
