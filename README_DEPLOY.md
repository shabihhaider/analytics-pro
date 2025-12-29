# Whop Analytics App - Deployment Guide 🚀

This guide covers how to deploy the "Whop Analytics App" to Vercel and configure it for the live Whop App Store.

## 1. Prerequisites
- **Git Repository:** Push your code to GitHub/GitLab.
- **Vercel Account:** Connect your repository to Vercel.
- **Supabase Project (Production):** A separate Supabase project is recommended for production data.

## 2. Infrastructure Setup
### Database
Run the contents of `migration_prod.sql` in your **Production** Supabase SQL Editor.
> This creates the necessary tables (`users`, `members`, etc.) and enables the `pgcrypto` extension.

### Vercel Project
1. Import your repository into Vercel.
2. In **Environment Variables**, add the following:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string to Prod Supabase (User `postgres` or transaction pooler) | `postgresql://postgres:[password]@db.supabase.co:5432/postgres` |
| `WHOP_API_KEY` | Your Whop Dev API Key (Production Mode) | `biz_...` |
| `WHOP_CLIENT_ID` | From Whop Dev Dashboard -> Configuration | `Client ID` value |
| `WHOP_CLIENT_SECRET` | From Whop Dev Dashboard -> Configuration | `Client Secret` value |
| `WHOP_COMPANY_ID` | Your Company ID (for internal syncing) | `biz_...` |
| `NEXT_PUBLIC_WHOP_APP_ID` | The App ID (used in `sync.ts` logic) | `app_...` |

3. **Deploy** the project.

## 3. Whop Developer Dashboard Configuration

Go to [Whop Developers](https://whop.com/dev) -> Your App -> **Configuration**.

### URLs
Replace `http://localhost:3000` with your **Production Vercel URL** (e.g., `https://whop-analytics-app.vercel.app`).

| Field | Value |
| :--- | :--- |
| **Redirect URI** | `https://[YOUR-VERCEL-DOMAIN]/api/auth/callback` |
| **Frame URL** | `https://[YOUR-VERCEL-DOMAIN]` |

### Views
Ensure code is set to **"Production"** mode (if applicable toggle exists, otherwise just use the production URL).

## 4. Verification
1. Go to your **Business Dashboard** (as a user).
2. Uninstall the "Dev" version of the app.
3. Install the **Production** version (if listed/approved) or use the Preview link with the Prod keys.
4. Verify the dashboard loads without the `white screen of death` (thanks to `error.tsx`).
5. Click **"Sync Data"** to verify the Production Database connection.

## Troubleshooting
- **White Screen?** Check Vercel Logs. Usually a missing Env Var.
- **Sync Fails?** Check `WHOP_API_KEY` permissions (`plan:basic:read` is required).
