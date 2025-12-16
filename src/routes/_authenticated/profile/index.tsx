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
      context.queryClient.ensureQueryData(convexQuery(api.bids.getPortfolioStats, {})),
    ]);
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: portfolio } = useSuspenseQuery(convexQuery(api.bids.getPortfolioStats, {}));

  const initials = user?.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  const totalValue = portfolio.balance + portfolio.totalInvested;

  return (
    <Layout user={user}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-[-0.02em] mb-2">
            Profile
          </h1>
          <p className="text-[15px] text-neutral-500">Manage your account and portfolio</p>
        </div>

        {/* Portfolio Overview */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">
            Portfolio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Balance Card */}
            <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-lg">🪙</span>
                </div>
                <span className="text-[13px] font-medium text-amber-700">Available Balance</span>
              </div>
              <p className="text-[32px] font-bold text-amber-900 tracking-tight">
                {portfolio.balance.toLocaleString()}
              </p>
              <p className="text-[13px] text-amber-600 mt-1">chips ready to invest</p>
            </div>

            {/* Invested Card */}
            <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <span className="text-[13px] font-medium text-blue-700">Active Investments</span>
              </div>
              <p className="text-[32px] font-bold text-blue-900 tracking-tight">
                {portfolio.totalInvested.toLocaleString()}
              </p>
              <p className="text-[13px] text-blue-600 mt-1">
                across {portfolio.activeBids.length} item{portfolio.activeBids.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Total Value Card */}
            <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-lg">💎</span>
                </div>
                <span className="text-[13px] font-medium text-emerald-700">Total Portfolio</span>
              </div>
              <p className="text-[32px] font-bold text-emerald-900 tracking-tight">
                {totalValue.toLocaleString()}
              </p>
              <p className="text-[13px] text-emerald-600 mt-1">
                {portfolio.completedBids.length} completed investment{portfolio.completedBids.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Active Investments */}
        {portfolio.activeBids.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-blue-500">📈</span>
                <h2 className="text-[15px] font-medium text-neutral-900">Active Investments</h2>
              </div>
              <span className="text-[13px] text-neutral-400">
                {portfolio.totalInvested} chips invested
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {portfolio.activeBids.map((bid) => (
                <Link
                  key={bid._id}
                  to="/items/$itemId"
                  params={{ itemId: bid.item._id }}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-mono font-semibold text-blue-600">
                      #{bid.item.number}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-neutral-900 truncate">{bid.item.title}</p>
                    <p className="text-[12px] text-neutral-400 capitalize">{bid.item.state.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[15px] font-semibold text-blue-600">{bid.amount}</span>
                    <p className="text-[11px] text-neutral-400">chips</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Investments */}
        {portfolio.completedBids.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500">✅</span>
                <h2 className="text-[15px] font-medium text-neutral-900">Completed</h2>
              </div>
              <span className="text-[13px] text-neutral-400">
                {portfolio.completedBids.reduce((sum, bid) => sum + bid.amount, 0)} chips shipped
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {portfolio.completedBids.map((bid) => (
                <Link
                  key={bid._id}
                  to="/items/$itemId"
                  params={{ itemId: bid.item._id }}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-mono font-semibold text-emerald-600">
                      #{bid.item.number}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-neutral-900 truncate">{bid.item.title}</p>
                    {bid.item.completedAt && (
                      <p className="text-[12px] text-neutral-400">
                        Shipped {new Date(bid.item.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[15px] font-semibold text-emerald-600">{bid.amount}</span>
                    <p className="text-[11px] text-neutral-400">invested</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cancelled/Refunded */}
        {portfolio.cancelledBids.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">↩️</span>
                <h2 className="text-[15px] font-medium text-neutral-900">Refunded</h2>
              </div>
              <span className="text-[13px] text-neutral-400">
                {portfolio.cancelledBids.reduce((sum, bid) => sum + bid.amount, 0)} chips returned
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {portfolio.cancelledBids.map((bid) => (
                <Link
                  key={bid._id}
                  to="/items/$itemId"
                  params={{ itemId: bid.item._id }}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-neutral-50 transition-colors opacity-60"
                >
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-mono font-semibold text-neutral-500">
                      #{bid.item.number}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-neutral-600 truncate line-through">{bid.item.title}</p>
                    <p className="text-[12px] text-neutral-400">Cancelled</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[15px] font-semibold text-neutral-500">{bid.amount}</span>
                    <p className="text-[11px] text-neutral-400">refunded</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {portfolio.activeBids.length === 0 && portfolio.completedBids.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-[16px] font-medium text-neutral-900 mb-2">No investments yet</h3>
            <p className="text-[14px] text-neutral-500 mb-4">
              Start investing your chips in features you want to see shipped!
            </p>
            <Link
              to="/items"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-[14px] font-medium rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Browse Items
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">
            Account
          </h2>

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
