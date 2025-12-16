import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '../../convex/_generated/api';
import { Layout } from '../components/Layout';

export const Route = createFileRoute('/')({
  component: Home,
  loader: async ({ context }) => {
    // Preload user data for fast rendering
    context.queryClient.prefetchQuery(convexQuery(api.myFunctions.getUser, {}));
  },
});

function Home() {
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));

  return (
    <Layout user={user ? { name: user.name, email: user.email, pictureUrl: user.pictureUrl, chips: user.chips, role: user.role } : null}>
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-[42px] font-semibold text-neutral-900 leading-[1.15] tracking-[-0.02em] mb-6">
            Convex Ship
          </h1>
          <p className="text-[17px] text-neutral-500 leading-relaxed mb-8 max-w-md">
            Ship helps you collect, prioritize, and ship the features your users want most.
            Vote on items, track progress, and celebrate releases with your community.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/items"
              className="h-10 px-5 text-[14px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors inline-flex items-center"
            >
              Browse items
            </Link>
            <Link
              to="/changelog"
              className="h-10 px-5 text-[14px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors inline-flex items-center"
            >
              View changelog
            </Link>
          </div>
        </div>

      </div>
    </Layout>
  );
}
