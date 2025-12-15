import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '../../../convex/_generated/api';
import { Layout } from '../../components/Layout';

export const Route = createFileRoute('/changelog/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.events.getAllEvents, {})),
      context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {})),
    ]);
  },
  component: ChangelogPage,
});

function ChangelogPage() {
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: events } = useSuspenseQuery(convexQuery(api.events.getAllEvents, {}));

  return (
    <Layout user={user}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-10 text-left">
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-[-0.02em] mb-2">
            Changelog
          </h1>
          <p className="text-[16px] text-neutral-500">
            New updates and improvements to Ship
          </p>
        </div>

        {/* Timeline */}
        {events.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-[15px] text-neutral-600 mb-1">No updates yet</p>
            <p className="text-[13px] text-neutral-400">Check back soon for news</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-neutral-200" />

            {/* Events */}
            <div className="space-y-8">
              {events.map((event, index) => (
                <div key={event._id} className="relative flex gap-6">
                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      event.type === 'productRelease' 
                        ? 'bg-emerald-100' 
                        : 'bg-blue-100'
                    }`}>
                      {event.type === 'productRelease' ? (
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    {/* Date */}
                    <p className="text-[13px] text-neutral-400 mb-1">
                      {formatDate(event.stamp)}
                    </p>

                    {/* Card */}
                    <Link
                      to="/changelog/$slug"
                      params={{ slug: event.slug }}
                      className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide ${
                              event.type === 'productRelease'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {event.type === 'productRelease' ? 'Release' : 'Improvement'}
                            </span>
                          </div>
                          <h3 className="text-[17px] font-medium text-neutral-900 group-hover:text-neutral-700 mb-1">
                            {event.title || 'Untitled'}
                          </h3>
                          {event.comment && (
                            <p className="text-[14px] text-neutral-500 line-clamp-2">
                              {event.comment}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <img
                            src={event.author.avatarImage}
                            alt={event.author.name}
                            className="w-6 h-6 rounded-full"
                          />
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

