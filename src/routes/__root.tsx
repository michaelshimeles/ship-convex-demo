import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getAuth, getSignInUrl, getSignUpUrl } from '@workos/authkit-tanstack-react-start';
import appCssUrl from '../app.css?url';
import { AppProviders } from '../router';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ConvexReactClient } from 'convex/react';
import type { ConvexQueryClient } from '@convex-dev/react-query';

// User profile data from WorkOS
export interface WorkOSUserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
}

// Server function to fetch auth state and URLs
const fetchWorkosAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await getAuth();
  const { user } = auth;

  // Only fetch URLs if user is not authenticated
  let signInUrl: string | null = null;
  let signUpUrl: string | null = null;
  if (!user) {
    signInUrl = await getSignInUrl();
    signUpUrl = await getSignUpUrl();
  }

  // Extract user profile from WorkOS session
  const userProfile: WorkOSUserProfile | null = user ? {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl: user.profilePictureUrl,
  } : null;

  return {
    userId: user?.id ?? null,
    token: user ? auth.accessToken : null,
    userProfile,
    signInUrl,
    signUpUrl,
  };
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Convex + TanStack Start + WorkOS AuthKit',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCssUrl },
      { rel: 'icon', href: '/convex.svg' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
  loader: async (ctx) => {
    const { userId, token, userProfile, signInUrl, signUpUrl } = await fetchWorkosAuth();

    // During SSR only (the only time serverHttpClient exists),
    // set the auth token to make HTTP queries with.
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return { userId, token, userProfile, signInUrl, signUpUrl };
  },
});

function RootComponent() {
  const { convexClient } = Route.useRouteContext();
  return (
    <AppProviders convexClient={convexClient}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </AppProviders>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
