import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '../../../convex/_generated/api';
import { Layout } from '../../components/Layout';

export const Route = createFileRoute('/changelog/$slug')({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.events.getEventBySlug, { slug: params.slug })
      ),
      context.queryClient.ensureQueryData(convexQuery(api.myFunctions.getUser, {})),
    ]);
  },
  component: ChangelogDetailPage,
});

function ChangelogDetailPage() {
  const { slug } = Route.useParams();
  const { data: user } = useSuspenseQuery(convexQuery(api.myFunctions.getUser, {}));
  const { data: event } = useSuspenseQuery(
    convexQuery(api.events.getEventBySlug, { slug })
  );

  if (!event) {
    return (
      <Layout user={user}>
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Event not found</h1>
          <p className="text-neutral-500 mb-6">This changelog entry may have been removed.</p>
          <Link
            to="/changelog"
            className="text-[14px] font-medium text-neutral-600 hover:text-neutral-900"
          >
            ← Back to changelog
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            to="/changelog"
            className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to changelog
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center px-2.5 py-1 rounded text-[12px] font-medium uppercase tracking-wide ${
              event.type === 'productRelease'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {event.type === 'productRelease' ? 'Product Release' : 'Improvement'}
            </span>
            <span className="text-[13px] text-neutral-400">
              {formatDate(event.stamp)}
            </span>
          </div>

          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-[-0.01em] mb-4">
            {event.title || 'Untitled'}
          </h1>

          {event.productInfo && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 mb-4">
              <span className="text-[13px] text-neutral-600">
                {event.productInfo.product} v{event.productInfo.version}
              </span>
            </div>
          )}

          {/* Author */}
          <div className="flex items-center gap-3">
            <img
              src={event.author.avatarImage}
              alt={event.author.name}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <p className="text-[14px] font-medium text-neutral-900">{event.author.name}</p>
            </div>
          </div>
        </div>

        {/* Comment */}
        {event.comment && (
          <div className="mb-8">
            <div className="prose prose-neutral max-w-none">
              <p className="text-[16px] text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {event.comment}
              </p>
            </div>
          </div>
        )}

        {/* Items */}
        {event.items.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-[15px] font-medium text-neutral-900">
                {event.type === 'productRelease' ? 'Included Items' : 'Related Item'}
              </h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {event.items.map((item) => (
                <Link
                  key={item._id}
                  to="/items/$itemId"
                  params={{ itemId: item._id }}
                  className="px-5 py-4 flex items-start gap-4 hover:bg-neutral-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-mono font-medium text-neutral-600">#{item.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-medium text-neutral-900 group-hover:text-neutral-700 mb-0.5">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-neutral-500 line-clamp-2">{item.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
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

