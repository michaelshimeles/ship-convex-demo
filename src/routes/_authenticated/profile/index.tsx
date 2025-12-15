import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '../../../../convex/_generated/api';
import { Layout } from '../../../components/Layout';

export const Route = createFileRoute('/_authenticated/profile/')({
  // Preload data during navigation - makes the transition instant
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {})),
      context.queryClient.ensureQueryData(convexQuery(api.bids.getUserBids, {})),
    ]);
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: userBids } = useSuspenseQuery(convexQuery(api.bids.getUserBids, {}));

  const initials = user?.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <Layout user={user}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-[-0.02em] mb-2">
            Profile
          </h1>
          <p className="text-[15px] text-neutral-500">Manage your account settings</p>
        </div>

        {/* My Bids */}
        {userBids.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-neutral-900">My Bids</h2>
              <span className="text-[13px] text-neutral-400">
                {userBids.reduce((sum, bid) => sum + bid.amount, 0)} points total
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {userBids.map((bid) => (
                <Link
                  key={bid._id}
                  to="/items/$itemId"
                  params={{ itemId: bid.item._id }}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-mono font-medium text-neutral-600">
                      #{bid.item.number}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-neutral-900 truncate">{bid.item.title}</p>
                    <p className="text-[12px] text-neutral-400">{bid.item.state}</p>
                  </div>
                  <span className="text-[14px] font-medium text-neutral-900">{bid.amount}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {/* Avatar Section */}
          <div className="p-6 flex items-center gap-5 border-b border-neutral-100">
            {user?.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt={user.name ?? 'Profile'}
                className="w-14 h-14 rounded-full ring-2 ring-neutral-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center ring-2 ring-neutral-100">
                <span className="text-lg font-semibold text-white">{initials}</span>
              </div>
            )}
            <div>
              <h2 className="text-[17px] font-medium text-neutral-900">
                {user?.name ?? 'Anonymous User'}
              </h2>
              <p className="text-[14px] text-neutral-500">{user?.email ?? 'No email'}</p>
            </div>
          </div>

          {/* Details Section */}
          <div className="divide-y divide-neutral-100">
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Name" value={user?.name} />
            <InfoRow label="Subject ID" value={user?.subject} mono />
            <InfoRow label="Issuer" value={user?.issuer} mono />
            {user?.emailVerified !== undefined && (
              <div className="px-6 py-4 flex items-center justify-between">
                <span className="text-[14px] text-neutral-500">Email Status</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                  />
                  <span className="text-[14px] text-neutral-900">
                    {user.emailVerified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug Section */}
        <details className="mt-6 group">
          <summary className="cursor-pointer text-[13px] font-medium text-neutral-500 hover:text-neutral-700 transition-colors flex items-center gap-2">
            <svg
              className="w-4 h-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            View raw data
          </summary>
          <div className="mt-3 rounded-xl bg-neutral-900 overflow-hidden shadow-lg">
            <div className="px-4 py-2 bg-neutral-800 border-b border-neutral-700 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <span className="ml-2 text-[11px] text-neutral-500 font-mono">user.json</span>
            </div>
            <pre className="p-4 text-[12px] text-neutral-400 overflow-auto font-mono leading-relaxed">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </Layout>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <span className="text-[14px] text-neutral-500 shrink-0">{label}</span>
      <span
        className={`text-[14px] text-neutral-900 text-right truncate ${mono ? 'font-mono text-[12px] text-neutral-600' : ''
          }`}
      >
        {value ?? <span className="text-neutral-400 italic">Not provided</span>}
      </span>
    </div>
  );
}
