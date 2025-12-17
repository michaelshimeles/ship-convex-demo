import { Link, useLocation, getRouteApi } from '@tanstack/react-router';
import { useAuth } from '@workos/authkit-tanstack-react-start/client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Get the root route API to access its loader data
const rootRoute = getRouteApi('__root__');

interface LayoutProps {
  children: ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    pictureUrl?: string | null;
    chips?: number;
    role?: 'admin' | 'user';
  } | null;
  isLoading?: boolean;
}

export function Layout({ children, user, isLoading }: LayoutProps) {
  // Get signInUrl from the root route's loader data
  const rootData = rootRoute.useLoaderData() as { signInUrl?: string | null } | undefined;
  const signInUrl = rootData?.signInUrl;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar user={user} isLoading={isLoading} signInUrl={signInUrl} />
      <main className="pt-14 min-h-[calc(100vh-3.5rem)]">{children}</main>
    </div>
  );
}

function Navbar({
  user,
  isLoading,
  signInUrl,
}: {
  user?: {
    name?: string | null;
    email?: string | null;
    pictureUrl?: string | null;
    chips?: number;
    role?: 'admin' | 'user';
  } | null;
  isLoading?: boolean;
  signInUrl?: string | null;
}) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = user?.role === 'admin';


  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-neutral-200 bg-white">
      <div className="h-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        {/* Left side - Logo + Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" preload="viewport">
            <div className="w-6 h-6 bg-neutral-900 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-[15px] text-neutral-900">Ship</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="/items" active={isActive('/items') || location.pathname.startsWith('/items/')}>
              Items
            </NavLink>
            <NavLink href="/changelog" active={isActive('/changelog') || location.pathname.startsWith('/changelog/')}>
              Changelog
            </NavLink>
            <NavLink href="/profile" active={isActive('/profile')}>
              Profile
            </NavLink>
            {isAdmin && (
              <NavLink href="/dashboard" active={isActive('/dashboard')}>
                Admin
              </NavLink>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <button className="hidden sm:flex items-center gap-2 h-8 px-3 text-[13px] text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-md border border-neutral-200 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="ml-4 text-[11px] text-neutral-400 bg-white px-1.5 py-0.5 rounded border border-neutral-200">⌘K</kbd>
          </button>

          {/* Chip balance - fixed width to prevent layout shift */}
          {user && (
            <div className="flex items-center gap-1.5 h-8 px-3 bg-amber-50 border border-amber-200 rounded-md min-w-[72px]">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="text-[13px] font-medium text-amber-700 tabular-nums min-w-[28px] text-right">
                {user.chips ?? 0}
              </span>
            </div>
          )}

          {/* User actions */}
          {isLoading ? (
            <ProfileSkeleton />
          ) : user ? (
            <ProfileDropdown user={user} />
          ) : signInUrl ? (
            <a
              href={signInUrl}
              className="h-8 px-4 text-[13px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors flex items-center"
            >
              Log in
            </a>
          ) : (
            <div className="h-8 w-16 bg-neutral-200 rounded-md animate-pulse" />
          )}

          {/* GitHub icon */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={href}
      preload="viewport"
      className={`text-[14px] font-medium transition-colors ${active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
        }`}
    >
      {children}
    </Link>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-2 h-8 pl-1 pr-2">
      {/* Avatar skeleton */}
      <div className="w-7 h-7 rounded-full bg-neutral-200 animate-pulse" />
      {/* Chevron skeleton */}
      <div className="w-3.5 h-3.5 rounded bg-neutral-200 animate-pulse" />
    </div>
  );
}

function ProfileDropdown({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    pictureUrl?: string | null;
    chips?: number;
    role?: 'admin' | 'user';
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-full hover:bg-neutral-100 transition-colors"
      >
        {user.pictureUrl ? (
          <img
            src={user.pictureUrl}
            alt={user.name || 'Profile'}
            className="w-7 h-7 rounded-full object-cover ring-2 ring-neutral-200"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center ring-2 ring-neutral-200">
            <span className="text-[11px] font-semibold text-white">{initials}</span>
          </div>
        )}
        <svg
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              {user.pictureUrl ? (
                <img
                  src={user.pictureUrl}
                  alt={user.name || 'Profile'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-neutral-900 truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-[12px] text-neutral-500 truncate">{user.email}</p>
              </div>
            </div>
            {/* Chip balance in dropdown */}
            {typeof user.chips === 'number' && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="text-[13px] font-medium text-amber-700">{user.chips} chips</span>
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              View Profile
            </Link>
            {isAdmin && (
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                Admin
              </Link>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-neutral-100 pt-1 mt-1">
            <button
              onClick={async () => {
                setIsOpen(false);
                // Use signOut from useAuth which properly handles the redirect
                await signOut();
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
