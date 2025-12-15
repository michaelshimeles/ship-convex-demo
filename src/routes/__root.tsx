import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getAuth } from '@workos/authkit-tanstack-react-start';
import appCssUrl from '../app.css?url';
import { AppProviders } from '../router';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ConvexReactClient } from 'convex/react';
import type { ConvexQueryClient } from '@convex-dev/react-query';

const fetchWorkosAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await getAuth();
  const { user } = auth;

  return {
    userId: user?.id ?? null,
    token: user ? auth.accessToken : null,
  };
});

// Cache key for auth query
const AUTH_QUERY_KEY = ['workos-auth'] as const;

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
  beforeLoad: async (ctx) => {
    // Use React Query to cache auth state - avoids server round-trips on client-side navigation
    const { userId, token } = await ctx.context.queryClient.ensureQueryData({
      queryKey: AUTH_QUERY_KEY,
      queryFn: () => fetchWorkosAuth(),
      // Auth state is fresh for 5 minutes on client - prevents refetch on every navigation
      staleTime: 5 * 60 * 1000,
    });

    // During SSR only (the only time serverHttpClient exists),
    // set the Clerk auth token to make HTTP queries with.
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return { userId, token };
  },
});

function RootComponent() {
  const { convexClient } = Route.useRouteContext();
  return (
    <RootDocument>
      <AppProviders convexClient={convexClient}>
        <Outlet />
      </AppProviders>
    </RootDocument>
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
