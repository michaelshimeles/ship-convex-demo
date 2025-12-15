import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '../../../../convex/_generated/api';
import { Layout } from '../../../components/Layout';
import { useState } from 'react';

export const Route = createFileRoute('/_authenticated/items/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.items.listItems, {})),
      context.queryClient.ensureQueryData(convexQuery(api.bids.getItemsByPriority, {})),
      context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {})),
    ]);
  },
  component: ItemsPage,
});

type ItemState = 'requested' | 'waiting' | 'scheduled' | 'inProgress' | 'completed' | 'cancelled';

const stateColors: Record<ItemState, { bg: string; text: string; dot: string }> = {
  requested: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  waiting: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  inProgress: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
};

const stateLabels: Record<ItemState, string> = {
  requested: 'Requested',
  waiting: 'Waiting',
  scheduled: 'Scheduled',
  inProgress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function ItemsPage() {
  const [filter, setFilter] = useState<ItemState | 'all'>('all');

  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: items } = useSuspenseQuery(convexQuery(api.items.listItems, {}));
  const { data: itemsByPriority } = useSuspenseQuery(convexQuery(api.bids.getItemsByPriority, {}));

  // Create a map of item ID to priority info
  const priorityMap = new Map(
    itemsByPriority.map((item) => [item._id, { priority: item.priority, bidCount: item.bidCount }])
  );

  // Filter items
  const filteredItems = filter === 'all'
    ? items
    : items.filter((item) => item.state === filter);

  // Sort by priority (highest first)
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aPriority = priorityMap.get(a._id)?.priority ?? 0;
    const bPriority = priorityMap.get(b._id)?.priority ?? 0;
    return bPriority - aPriority;
  });

  const states: Array<ItemState | 'all'> = ['all', 'requested', 'waiting', 'scheduled', 'inProgress', 'completed', 'cancelled'];

  return (
    <Layout user={user}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold text-neutral-900 tracking-[-0.02em] mb-2">
              Items
            </h1>
            <p className="text-[15px] text-neutral-500">Feature requests and improvements</p>
          </div>
          <Link
            to="/items/new"
            className="h-9 px-4 text-[14px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Item
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {states.map((state) => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${filter === state
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
                }`}
            >
              {state === 'all' ? 'All' : stateLabels[state]}
              <span className="ml-1.5 text-[11px] opacity-60">
                {state === 'all'
                  ? items.length
                  : items.filter((i) => i.state === state).length}
              </span>
            </button>
          ))}
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {sortedItems.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-[15px] text-neutral-600 mb-1">No items found</p>
              <p className="text-[13px] text-neutral-400">Create your first item to get started</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const priorityInfo = priorityMap.get(item._id);
              return (
                <ItemRow
                  key={item._id}
                  item={item}
                  priority={priorityInfo?.priority ?? 0}
                  bidCount={priorityInfo?.bidCount ?? 0}
                />
              );
            })
          )}
        </div>

      </div>
    </Layout>
  );
}

function ItemRow({
  item,
  priority,
  bidCount,
}: {
  item: {
    _id: string;
    number: number;
    title: string;
    description: string;
    state: ItemState;
  };
  priority: number;
  bidCount: number;
}) {
  const colors = stateColors[item.state];

  return (
    <Link
      to="/items/$itemId"
      params={{ itemId: item._id }}
      className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Number */}
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <span className="text-[13px] font-mono font-medium text-neutral-600">#{item.number}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-medium text-neutral-900 truncate group-hover:text-neutral-700">
              {item.title}
            </h3>
          </div>
          <p className="text-[13px] text-neutral-500 line-clamp-1">{item.description}</p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Chip votes */}
          {priority > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-amber-600">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="font-medium">{priority}</span>
              <span className="text-neutral-400">({bidCount} vote{bidCount !== 1 ? 's' : ''})</span>
            </div>
          )}

          {/* State Badge */}
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${colors.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            <span className={`text-[12px] font-medium ${colors.text}`}>
              {stateLabels[item.state]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}


