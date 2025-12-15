import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

/**
 * WorkOS Webhook Handler
 * 
 * Configure this webhook URL in your WorkOS dashboard:
 * https://<your-convex-deployment>.convex.site/workos-webhook
 * 
 * Events to enable:
 * - user.created
 * - user.updated
 */
http.route({
  path: '/workos-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    // Get the webhook secret from environment
    const webhookSecret = process.env.WORKOS_WEBHOOK_SECRET

    // Verify webhook signature if secret is set
    if (webhookSecret) {
      const signature = req.headers.get('workos-signature')
      if (!signature) {
        return new Response('Missing signature', { status: 401 })
      }
      // Note: For production, implement proper signature verification
      // using the WorkOS SDK or crypto libraries
    }

    try {
      const body = await req.json()
      const { event, data } = body as {
        event: string
        data: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          profile_picture_url: string | null
        }
      }

      // Handle user events
      if (event === 'user.created' || event === 'user.updated') {
        const { id, email, first_name, last_name, profile_picture_url } = data

        // Build full name
        const name = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0]

        // Default avatar if none provided
        const avatarImage = profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`

        // Sync to database
        await ctx.runMutation(internal.users.syncUser, {
          identifier: id,
          email,
          name,
          avatarImage,
        })

        return new Response('OK', { status: 200 })
      }

      // Acknowledge other events
      return new Response('Event not handled', { status: 200 })
    } catch (error) {
      console.error('Webhook error:', error)
      return new Response('Internal error', { status: 500 })
    }
  }),
})

export default http


