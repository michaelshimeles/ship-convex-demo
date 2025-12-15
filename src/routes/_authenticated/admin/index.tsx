import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Layout } from '../../../components/Layout';
import { useState } from 'react';

export const Route = createFileRoute('/_authenticated/admin/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.admin.isAdmin, {})),
      context.queryClient.ensureQueryData(convexQuery(api.admin.listUsers, {})),
      context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {})),
    ]);
  },
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: isAdmin } = useSuspenseQuery(convexQuery(api.admin.isAdmin, {}));
  const { data: users } = useSuspenseQuery(convexQuery(api.admin.listUsers, {}));

  const [editingUser, setEditingUser] = useState<{
    id: Id<'users'>;
    name: string;
    coefficient: number;
  } | null>(null);

  if (!isAdmin) {
    return (
      <Layout user={user}>
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Access Denied</h1>
          <p className="text-neutral-500 mb-6">You don't have permission to access this page.</p>
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="text-[14px] font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-[-0.02em] mb-2">
            Admin
          </h1>
          <p className="text-[15px] text-neutral-500">Manage users and their bid coefficients</p>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-neutral-900">Users</h2>
            <span className="text-[13px] text-neutral-400">{users.length} users</span>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[14px] text-neutral-400">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {/* Header */}
              <div className="px-5 py-3 grid grid-cols-12 gap-4 bg-neutral-50 text-[12px] font-medium text-neutral-500 uppercase tracking-wide">
                <div className="col-span-5">User</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-2">Coefficient</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Rows */}
              {users.map((user) => (
                <div key={user._id} className="px-5 py-4 grid grid-cols-12 gap-4 items-center">
                  {/* User info */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <img
                      src={user.avatarImage}
                      alt={user.name}
                      className="w-9 h-9 rounded-full shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-neutral-900 truncate">{user.name}</p>
                      <p className="text-[12px] text-neutral-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide ${user.role === 'admin'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-neutral-100 text-neutral-600'
                      }`}>
                      {user.role}
                    </span>
                  </div>

                  {/* Coefficient */}
                  <div className="col-span-2">
                    <span className={`text-[14px] font-mono ${user.coefficient !== 1 ? 'text-blue-600 font-medium' : 'text-neutral-600'
                      }`}>
                      {user.coefficient}x
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <RoleToggle userId={user._id} currentRole={user.role} />
                    <button
                      onClick={() => setEditingUser({
                        id: user._id,
                        name: user.name,
                        coefficient: user.coefficient,
                      })}
                      className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Coefficient Modal */}
        {editingUser && (
          <EditCoefficientModal
            userId={editingUser.id}
            userName={editingUser.name}
            currentValue={editingUser.coefficient}
            onClose={() => setEditingUser(null)}
          />
        )}
      </div>
    </Layout>
  );
}

function EditCoefficientModal({
  userId,
  userName,
  currentValue,
  onClose,
}: {
  userId: Id<'users'>;
  userName: string;
  currentValue: number;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentValue.toString());
  const queryClient = useQueryClient();

  const setCoefficient = useConvexMutation(api.admin.setCoefficient);
  const mutation = useMutation({
    mutationFn: async () => {
      await setCoefficient({ userId, value: parseFloat(value) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-[17px] font-semibold text-neutral-900">Edit Coefficient</h2>
          <p className="text-[13px] text-neutral-500 mt-0.5">for {userName}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <p className="text-[14px] text-neutral-600 mb-4">
              The coefficient multiplies this user's bids when calculating item priority.
              A value of 1 is the default (no modification).
            </p>
            <div>
              <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">
                Coefficient Value
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                step="0.1"
                min="0"
                className="w-full h-10 px-3 text-[14px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                autoFocus
              />
            </div>
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
              disabled={mutation.isPending || isNaN(parseFloat(value)) || parseFloat(value) < 0}
              className="h-9 px-4 text-[14px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleToggle({
  userId,
  currentRole,
}: {
  userId: Id<'users'>;
  currentRole: 'admin' | 'user';
}) {
  const queryClient = useQueryClient();

  const setUserRole = useConvexMutation(api.admin.setUserRole);
  const mutation = useMutation({
    mutationFn: async () => {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await setUserRole({ userId, role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  if (currentRole === 'admin') {
    return (
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="text-[12px] font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        title="Demote to user"
      >
        {mutation.isPending ? '...' : 'Demote'}
      </button>
    );
  }

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="text-[12px] font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50"
      title="Promote to admin"
    >
      {mutation.isPending ? '...' : 'Promote'}
    </button>
  );
}

