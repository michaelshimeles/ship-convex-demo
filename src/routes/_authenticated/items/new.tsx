import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { api } from '../../../../convex/_generated/api';
import { Layout } from '../../../components/Layout';
import { useRef, useState } from 'react';

export const Route = createFileRoute('/_authenticated/items/new')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {}));
  },
  component: NewItemPage,
});

function NewItemPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));

  const createItem = useConvexMutation(api.items.createItem);
  const mutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      await createItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      // Use window.location as a fallback for navigation
      window.location.href = '/items';
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    
    if (!title?.trim()) return;
    
    setIsSubmitting(true);
    mutation.mutate({ title: title.trim(), description: description?.trim() || '' });
  };

  return (
    <Layout user={user}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/items"
            className="inline-flex items-center gap-2 text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Items
          </Link>
        </div>

        {/* Chip Balance Warning */}
        {user && user.chips < 20 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <p className="text-[14px] font-medium text-amber-800">Not enough chips</p>
                <p className="text-[13px] text-amber-700">
                  You need 20 chips to create an item. You have {user.chips} chips.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-xl border border-neutral-200 bg-white">
          <div className="px-6 py-4 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[20px] font-semibold text-neutral-900">Create New Item</h1>
                <p className="text-[14px] text-neutral-500 mt-1">
                  Submit a new feature request or improvement idea
                </p>
              </div>
              {/* Chip cost badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="text-[13px] font-medium text-amber-700">20 chips</span>
              </div>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="p-6 space-y-5">
              <div>
                <label htmlFor="title" className="block text-[14px] font-medium text-neutral-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  placeholder="Enter a clear, descriptive title..."
                  className="w-full h-11 px-4 text-[15px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-[14px] font-medium text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Describe the feature or improvement in detail. What problem does it solve? How should it work?"
                  rows={6}
                  className="w-full px-4 py-3 text-[15px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none transition-shadow"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3">
              <Link
                to="/items"
                className="h-10 px-5 text-[14px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex items-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || (user?.chips !== undefined && user.chips < 20)}
                className="h-10 px-5 text-[14px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Create Item (20 chips)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
