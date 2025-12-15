import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Layout } from '../../../components/Layout';
import { useState } from 'react';

export const Route = createFileRoute('/_authenticated/items/$itemId')({
  loader: async ({ context, params }) => {
    const itemId = params.itemId as Id<'items'>;
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.items.getItem, { itemId })),
      context.queryClient.ensureQueryData(convexQuery(api.bids.getItemBids, { itemId })),
      context.queryClient.ensureQueryData(convexQuery(api.bids.getUserBidForItem, { itemId })),
      context.queryClient.ensureQueryData(convexQuery(api.bids.getItemPriority, { itemId })),
      context.queryClient.ensureQueryData(convexQuery(api.devLogs.listMessages, { itemId })),
      context.queryClient.ensureQueryData(convexQuery(api.admin.getCancellation, { itemId })),
      context.queryClient.ensureQueryData(convexQuery(api.admin.isAdmin, {})),
      context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {})),
    ]);
  },
  component: ItemDetailPage,
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

// Valid state transitions
const validTransitions: Record<ItemState, ItemState[]> = {
  requested: ['waiting', 'cancelled'],
  waiting: ['scheduled', 'cancelled'],
  scheduled: ['inProgress', 'cancelled'],
  inProgress: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
};

function ItemDetailPage() {
  const { itemId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: item } = useSuspenseQuery(
    convexQuery(api.items.getItem, { itemId: itemId as Id<'items'> })
  );
  const { data: bids } = useSuspenseQuery(
    convexQuery(api.bids.getItemBids, { itemId: itemId as Id<'items'> })
  );
  const { data: userBid } = useSuspenseQuery(
    convexQuery(api.bids.getUserBidForItem, { itemId: itemId as Id<'items'> })
  );
  const { data: priority } = useSuspenseQuery(
    convexQuery(api.bids.getItemPriority, { itemId: itemId as Id<'items'> })
  );
  const { data: devLogs } = useSuspenseQuery(
    convexQuery(api.devLogs.listMessages, { itemId: itemId as Id<'items'> })
  );
  const { data: cancellation } = useSuspenseQuery(
    convexQuery(api.admin.getCancellation, { itemId: itemId as Id<'items'> })
  );
  const { data: isAdmin } = useSuspenseQuery(convexQuery(api.admin.isAdmin, {}));

  const [showCancelModal, setShowCancelModal] = useState(false);

  if (!item) {
    return (
      <Layout user={user}>
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Item not found</h1>
          <p className="text-neutral-500 mb-6">This item may have been deleted.</p>
          <Link
            to="/items"
            className="text-[14px] font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Back to items
          </Link>
        </div>
      </Layout>
    );
  }

  const colors = stateColors[item.state];
  const nextStates = validTransitions[item.state];

  return (
    <Layout user={user}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/items"
            className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to items
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
            <span className="text-[17px] font-mono font-semibold text-neutral-600">#{item.number}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[24px] font-semibold text-neutral-900 tracking-[-0.01em]">
                {item.title}
              </h1>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${colors.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                <span className={`text-[12px] font-medium ${colors.text}`}>
                  {stateLabels[item.state]}
                </span>
              </div>
            </div>
            <p className="text-[15px] text-neutral-600">{item.description}</p>
          </div>
        </div>

        {/* Cancellation notice */}
        {cancellation && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-medium text-red-800">Cancelled by {cancellation.admin.name}</p>
                <p className="text-[13px] text-red-700 mt-0.5">{cancellation.why}</p>
                <p className="text-[12px] text-red-500 mt-1">
                  {new Date(cancellation.stamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dev Log */}
            <DevLogSection itemId={itemId as Id<'items'>} devLogs={devLogs} isAdmin={isAdmin} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Priority */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h3 className="text-[13px] font-medium text-neutral-500 mb-3">Priority Score</h3>
              <div className="flex items-baseline gap-2">
                <div className="flex items-center gap-1">
                  <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span className="text-3xl font-semibold text-neutral-900">{priority}</span>
                </div>
                <span className="text-[13px] text-neutral-400">from {bids.length} vote{bids.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Bidding */}
            <BidSection 
              itemId={itemId as Id<'items'>} 
              userBid={userBid} 
              bids={bids}
              disabled={item.state === 'completed' || item.state === 'cancelled'}
              userChips={user?.chips ?? 100}
            />

            {/* State transitions (admin only) */}
            {isAdmin && nextStates.length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-[13px] font-medium text-neutral-500 mb-3">Admin Actions</h3>
                <div className="space-y-2">
                  {nextStates.filter(s => s !== 'cancelled').map((state) => (
                    <StateTransitionButton
                      key={state}
                      itemId={itemId as Id<'items'>}
                      newState={state}
                    />
                  ))}
                  {item.state !== 'cancelled' && item.state !== 'completed' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full h-9 px-3 text-[13px] font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                    >
                      Cancel Item
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Due Date */}
            {item.dueDate && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-[13px] font-medium text-neutral-500 mb-2">Due Date</h3>
                <p className="text-[14px] text-neutral-900">
                  {item.dueDate.type === 'week' && `Week ${item.dueDate.which}, ${item.dueDate.year}`}
                  {item.dueDate.type === 'month' && `${getMonthName(item.dueDate.which)} ${item.dueDate.year}`}
                  {item.dueDate.type === 'quarter' && `Q${item.dueDate.which} ${item.dueDate.year}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <CancelItemModal
            itemId={itemId as Id<'items'>}
            onClose={() => setShowCancelModal(false)}
          />
        )}
      </div>
    </Layout>
  );
}

function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1] || 'Unknown';
}

function BidSection({
  itemId,
  userBid,
  bids,
  disabled,
  userChips,
}: {
  itemId: Id<'items'>;
  userBid: { _id: string; amount: number } | null;
  bids: Array<{ _id: string; amount: number; user: { _id: string; name: string; avatarImage: string } }>;
  disabled: boolean;
  userChips: number;
}) {
  const [amount, setAmount] = useState(userBid?.amount?.toString() || '2');
  const queryClient = useQueryClient();

  const placeBid = useConvexMutation(api.bids.placeBid);
  const removeBid = useConvexMutation(api.bids.removeBid);

  const placeMutation = useMutation({
    mutationFn: async () => {
      await placeBid({ itemId, amount: parseInt(amount) });
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await removeBid({ itemId });
    },
    onSuccess: () => {
      setAmount('2');
      queryClient.invalidateQueries();
    },
  });

  const parsedAmount = parseInt(amount) || 0;
  const existingBidAmount = userBid?.amount || 0;
  const chipsNeeded = userBid ? Math.max(0, parsedAmount - existingBidAmount) : parsedAmount;
  const hasEnoughChips = userChips >= chipsNeeded;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-neutral-500">Vote with Chips</h3>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md">
          <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span className="text-[12px] font-medium text-amber-700">{userChips}</span>
        </div>
      </div>
      
      {disabled ? (
        <p className="text-[13px] text-neutral-400">Voting is closed for this item</p>
      ) : (
        <>
          <p className="text-[12px] text-neutral-400 mb-2">
            Min: 2 chips • Earn 1.5x back if shipped
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Chips..."
              min="2"
              step="2"
              className="flex-1 h-9 px-3 text-[14px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
            <button
              onClick={() => placeMutation.mutate()}
              disabled={!amount || parsedAmount < 2 || (!hasEnoughChips && chipsNeeded > 0) || placeMutation.isPending}
              className="h-9 px-3 text-[13px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {userBid ? 'Update' : 'Vote'}
            </button>
          </div>
          {chipsNeeded > 0 && !hasEnoughChips && (
            <p className="mt-2 text-[12px] text-red-500">
              Not enough chips. You need {chipsNeeded} more.
            </p>
          )}
        </>
      )}

      {userBid && !disabled && (
        <button
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="mt-2 text-[12px] text-emerald-600 hover:text-emerald-700"
        >
          Remove vote (refund {userBid.amount} chips)
        </button>
      )}

      {/* Voters list */}
      {bids.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-[12px] text-neutral-400 mb-2">Voters</p>
          <div className="space-y-2">
            {bids.map((bid) => (
              <div key={bid._id} className="flex items-center gap-2">
                <img
                  src={bid.user.avatarImage}
                  alt={bid.user.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-[13px] text-neutral-700 flex-1">{bid.user.name}</span>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span className="text-[13px] font-medium text-neutral-900">{bid.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StateTransitionButton({
  itemId,
  newState,
}: {
  itemId: Id<'items'>;
  newState: ItemState;
}) {
  const queryClient = useQueryClient();
  const transitionState = useConvexMutation(api.items.transitionState);

  const mutation = useMutation({
    mutationFn: async () => {
      await transitionState({ itemId, newState });
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="w-full h-9 px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors disabled:opacity-50"
    >
      Move to {stateLabels[newState]}
    </button>
  );
}

function DevLogSection({
  itemId,
  devLogs,
  isAdmin,
}: {
  itemId: Id<'items'>;
  devLogs: Array<{
    _id: string;
    stamp: number;
    message: string;
    author: { _id: string; name: string; avatarImage: string };
  }>;
  isAdmin: boolean;
}) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const addMessage = useConvexMutation(api.devLogs.addMessage);
  const mutation = useMutation({
    mutationFn: async () => {
      await addMessage({ itemId, message });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-[15px] font-medium text-neutral-900">Dev Log</h2>
        {!isAdmin && (
          <p className="text-[12px] text-neutral-400 mt-0.5">Internal team notes</p>
        )}
      </div>
      
      <div className="p-5">
        {/* Messages */}
        {devLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[14px] text-neutral-400">No messages yet</p>
          </div>
        ) : (
          <div className={`space-y-4 ${isAdmin ? 'mb-6' : ''}`}>
            {devLogs.map((log) => (
              <div key={log._id} className="flex gap-3">
                <img
                  src={log.author.avatarImage}
                  alt={log.author.name}
                  className="w-8 h-8 rounded-full shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-neutral-900">{log.author.name}</span>
                    <span className="text-[12px] text-neutral-400">
                      {formatRelativeTime(log.stamp)}
                    </span>
                  </div>
                  <p className="text-[14px] text-neutral-600">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add message form (admin only) */}
        {isAdmin && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 h-10 px-3 text-[14px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!message.trim() || mutation.isPending}
              className="h-10 px-4 text-[14px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
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

function CancelItemModal({
  itemId,
  onClose,
}: {
  itemId: Id<'items'>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const cancelItem = useConvexMutation(api.admin.cancelItem);
  const mutation = useMutation({
    mutationFn: async () => {
      await cancelItem({ itemId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-[17px] font-semibold text-neutral-900">Cancel Item</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <p className="text-[14px] text-neutral-600 mb-4">
              Please provide a reason for cancelling this item. This action cannot be undone.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for cancellation..."
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              autoFocus
            />
          </div>
          <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-[14px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || mutation.isPending}
              className="h-9 px-4 text-[14px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

