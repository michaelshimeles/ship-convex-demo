import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { api } from '../../../../convex/_generated/api';
import { Layout } from '../../../components/Layout';

export const Route = createFileRoute('/_authenticated/dashboard/')({
  loader: async ({ context }) => {
    // Check admin status first
    const isAdmin = await context.queryClient.ensureQueryData(convexQuery(api.admin.isAdmin, {}));
    
    // Redirect non-admins to profile
    if (!isAdmin) {
      throw redirect({ to: '/profile' });
    }

    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.items.getItemCounts, {})),
      context.queryClient.ensureQueryData(convexQuery(api.events.getEventCount, {})),
      context.queryClient.ensureQueryData(convexQuery(api.admin.getUserCount, {})),
      context.queryClient.ensureQueryData(convexQuery(api.devLogs.getRecentActivity, { limit: 5 })),
      context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {})),
    ]);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: itemCounts } = useSuspenseQuery(convexQuery(api.items.getItemCounts, {}));
  const { data: eventCount } = useSuspenseQuery(convexQuery(api.events.getEventCount, {}));
  const { data: userCount } = useSuspenseQuery(convexQuery(api.admin.getUserCount, {}));
  const { data: recentActivity } = useSuspenseQuery(convexQuery(api.devLogs.getRecentActivity, { limit: 5 }));
  const { data: isAdmin } = useSuspenseQuery(convexQuery(api.admin.isAdmin, {}));

  return (
    <Layout user={user}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-[-0.02em] mb-2">
            Admin
          </h1>
          <p className="text-[15px] text-neutral-500">System overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Items"
            value={itemCounts.total.toString()}
            subtitle={`${itemCounts.inProgress} in progress`}
          />
          <StatCard
            title="Completed"
            value={itemCounts.completed.toString()}
            subtitle={`${itemCounts.cancelled} cancelled`}
            positive={itemCounts.completed > 0}
          />
          <StatCard
            title="Events"
            value={eventCount.toString()}
            subtitle="Changelog entries"
          />
          <StatCard
            title="Users"
            value={userCount.toString()}
            subtitle="Registered users"
          />
        </div>

        {/* Item State Breakdown */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[15px] font-medium text-neutral-900">Items by State</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              <StateCount label="Requested" count={itemCounts.requested} color="amber" />
              <StateCount label="Waiting" count={itemCounts.waiting} color="purple" />
              <StateCount label="Scheduled" count={itemCounts.scheduled} color="blue" />
              <StateCount label="In Progress" count={itemCounts.inProgress} color="cyan" />
              <StateCount label="Completed" count={itemCounts.completed} color="emerald" />
              <StateCount label="Cancelled" count={itemCounts.cancelled} color="neutral" />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-neutral-900">Recent Activity</h2>
              <Link
                to="/items"
                className="text-[13px] text-neutral-500 hover:text-neutral-900"
              >
                View all →
              </Link>
            </div>
            <div className="p-5">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[14px] text-neutral-600">No recent activity</p>
                  <p className="text-[13px] text-neutral-400 mt-1">Activity will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <Link
                      key={activity._id}
                      to="/items/$itemId"
                      params={{ itemId: activity.item._id }}
                      className="flex gap-3 group"
                    >
                      <img
                        src={activity.author.avatarImage}
                        alt={activity.author.name}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-neutral-900 group-hover:text-neutral-600 truncate">
                          <span className="font-medium">{activity.author.name}</span>
                          {' commented on '}
                          <span className="font-medium">#{activity.item.number}</span>
                        </p>
                        <p className="text-[12px] text-neutral-400 truncate">{activity.message}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {formatRelativeTime(activity.stamp)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-[15px] font-medium text-neutral-900">Quick Actions</h2>
            </div>
            <div className="p-2">
              <ActionButton
                icon="list"
                label="View all items"
                href="/items"
              />
              <ActionButton
                icon="calendar"
                label="View changelog"
                href="/changelog"
              />
              {isAdmin && (
                <ActionButton
                  icon="settings"
                  label="Admin settings"
                  href="/admin"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  positive = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-neutral-500">{title}</span>
      </div>
      <span className={`text-2xl font-semibold ${positive ? 'text-emerald-600' : 'text-neutral-900'}`}>
        {value}
      </span>
      {subtitle && (
        <p className="text-[12px] text-neutral-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function StateCount({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: 'amber' | 'purple' | 'blue' | 'cyan' | 'emerald' | 'neutral';
}) {
  const colors = {
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    cyan: 'bg-cyan-500',
    emerald: 'bg-emerald-500',
    neutral: 'bg-neutral-400',
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${colors[color]}`} />
        <span className="text-[20px] font-semibold text-neutral-900">{count}</span>
      </div>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  href
}: {
  icon: 'plus' | 'list' | 'calendar' | 'settings';
  label: string;
  href: string;
}) {
  const icons = {
    plus: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    ),
    list: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    ),
    calendar: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    settings: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    ),
  };

  return (
    <Link
      to={href}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-50 transition-colors group text-left"
    >
      <div className="w-8 h-8 rounded-md bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center transition-colors">
        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icons[icon]}
        </svg>
      </div>
      <span className="text-[14px] text-neutral-700 group-hover:text-neutral-900 transition-colors">{label}</span>
    </Link>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
