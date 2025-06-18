# Environment Setup Guide

## Overview

This guide covers setting up environment variables for local development and production deployment.

## Required Environment Variables

### Database (Supabase)
- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)

### AI Services (OpenAI)
- `OPENAI_API_KEY`: OpenAI API key for grammar checking and readability analysis

### Authentication (Clerk)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key (server-side only)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Sign in URL path (default: `/login`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Sign up URL path (default: `/signup`)

### Payments (Stripe) - Optional
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `NEXT_PUBLIC_STRIPE_PORTAL_LINK`: Stripe customer portal link
- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY`: Yearly subscription link
- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY`: Monthly subscription link

### Analytics (PostHog) - Optional
- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog project key
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host URL

## Development vs Production Keys

### Clerk Keys
- **Development/Test**: Keys starting with `pk_test_` and `sk_test_`
- **Production**: Keys starting with `pk_live_` and `sk_live_`

⚠️ **Important**: Using test keys in production will show a warning and have usage limitations.

## Setting Up Environment Variables

### Local Development
1. Copy `.env.example` to `.env.local`
2. Fill in all required variables
3. Use development/test keys for external services

### Production (Vercel)
1. Add environment variables through Vercel CLI:
   ```bash
   vercel env add VARIABLE_NAME production
   ```

2. Or through the Vercel Dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add variables for Production, Preview, and Development

### Syncing Environment Variables
```bash
# Pull environment variables from Vercel (DO NOT COMMIT THIS FILE!)
vercel env pull .env.vercel

# Compare local and remote environments
diff .env.local .env.vercel
```

## Common Issues

### 1. OpenAI API Errors (500)
**Cause**: Incorrect or missing OpenAI API key in production

**Solution**:
```bash
# Remove old key
vercel env rm OPENAI_API_KEY

# Add correct key
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
vercel env add OPENAI_API_KEY development
```

### 2. Clerk Development Key Warning
**Cause**: Using test keys (`pk_test_`, `sk_test_`) in production

**Solution**:
1. Create production keys in Clerk Dashboard
2. Update environment variables with production keys
3. Redeploy application

### 3. Database Connection Issues
**Cause**: Incorrect database URL or missing database

**Solution**:
1. Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
2. Ensure database exists and is accessible
3. Check Supabase project status

## Security Best Practices

1. **Never commit secrets**: Files like `.env.vercel` contain real secrets and should never be committed
2. **Use environment-specific keys**: Development keys for development, production keys for production
3. **Rotate keys regularly**: Especially for production environments
4. **Monitor usage**: Keep track of API usage and costs
5. **Use least privilege**: Only grant necessary permissions to service accounts

## Files to Never Commit
- `.env.local` (already in .gitignore)
- `.env.vercel` (contains real secrets from Vercel)
- Any file containing actual API keys or passwords 