import { createFileRoute } from '@tanstack/react-router';
import { signOut } from '@workos/authkit-tanstack-react-start';

export const Route = createFileRoute('/sign-out')({
  loader: async () => {
    // This will redirect to WorkOS logout, then back to '/'
    await signOut({ data: { returnTo: '/' } });
  },
  component: () => null,
});

