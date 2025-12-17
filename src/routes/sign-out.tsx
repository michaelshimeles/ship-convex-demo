import { createFileRoute } from '@tanstack/react-router';
import { getAuth } from '@workos/authkit-tanstack-react-start';

// Server handler for sign out  
async function handleSignOut({ request }: { request: Request }) {
  const auth = await getAuth();
  
  // Get cookie name from env or use default
  const cookieName = process.env.WORKOS_COOKIE_NAME || 'wos-session';
  
  // Get the origin for the returnTo URL
  const url = new URL(request.url);
  const returnTo = `${url.origin}/`;
  
  // Build Set-Cookie header to clear the session
  const clearCookie = `${cookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
  
  if (!auth.user || !auth.sessionId) {
    // Not logged in, just redirect home with cleared cookie
    return new Response(null, {
      status: 302,
      headers: {
        Location: returnTo,
        'Set-Cookie': clearCookie,
      },
    });
  }
  
  // Import workos dynamically to get logout URL
  const { WorkOS } = await import('@workos-inc/node');
  const workos = new WorkOS(process.env.WORKOS_API_KEY);
  
  const logoutUrl = workos.userManagement.getLogoutUrl({
    sessionId: auth.sessionId,
    returnTo: returnTo,
  });
  
  // Clear session cookie and redirect to WorkOS logout
  return new Response(null, {
    status: 302,
    headers: {
      Location: logoutUrl,
      'Set-Cookie': clearCookie,
    },
  });
}

export const Route = createFileRoute('/sign-out')({
  server: {
    handlers: {
      GET: handleSignOut,
    },
  },
});

