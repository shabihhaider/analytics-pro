# Phase 2: Member Engagement & Sync Guide

## Overview
Phase 2 focused on enabling the **Data Sync Engine** to fetch Members and Chat Messages from Whop, calculate an "Engagement Score," and display it on the Dashboard.

## 🔐 Critical Learnings (Whop API)

### 1. Permission & Scope Model
*   **Frozen Permissions:** Changing permissions in the Developer Dashboard **does not** automatically update the API Key/Token for installed apps.
*   **The Fix:** You must **Uninstall** and **Re-install** the app on your test company to propagate new permissions.
*   **Required Scopes:**
    *   `member:basic:read`: To list company members.
    *   `chat:read`: To list channels and read messages.

### 2. Environment Variables Strategy
We identified a crucial distinction between IDs:

| Variable | Value Format | Purpose |
| :--- | :--- | :--- |
| `WHOP_API_KEY` | `apik_...` | Authentication. Must be generated **after** permissions are set and app is installed. |
| `WHOP_COMPANY_ID` | `biz_...` | **Target Data Source.** Used when fetching Members or Channels (`company_id: process.env.WHOP_COMPANY_ID`). |
| `NEXT_PUBLIC_WHOP_APP_ID` | `app_...` | **App Identity.** Used for client-side SDK initialization or ensuring the user belongs to this app. |

> ⚠️ **Common Error:** Using `APP_ID` when the SDK expects `COMPANY_ID` results in a `404 Not Found` (Bot not found) error because the API tries to find "channels belonging to the App" instead of the Company.

## 🛠️ Implementation Details

### Member Sync (`src/lib/whop/sync.ts`)
1.  **Fetch:** Calls `whop.memberships.list({ company_id: ... })`.
2.  **Upsert:** configuration uses `ON CONFLICT` to avoid duplicates.
3.  **Mapping:**
    *   `whop_users` table maps to `member.user.id`.
    *   `members` table maps to `member.id`.

### Message Sync & Engagement
1.  **Fetch Channels:** Lists top 5 active channels.
2.  **Fetch Messages:** Scans last 100 messages per channel.
3.  **Engagement Score:**
    *   **Activity:** 5 points per message (capped at 50).
    *   **Loyalty:** 30 or 50 points based on `daysSinceJoined`.
    *   **Total:** `Math.min(100, Activity + Loyalty)`.

## 🐛 Troubleshooting Guide

| Error | Cause | Solution |
| :--- | :--- | :--- |
| `403 Forbidden: requires 'member:basic:read'` | App installed before permission added. | Uninstall App -> Add Permission -> Re-install -> Restart Server. |
| `404 Not Found: This Bot was not found` | Wrong ID passed to `chatChannels.list`. | Ensure you are passing `WHOP_COMPANY_ID` (`biz_...`), NOT `APP_ID`. |
| `No chat channels found` | Correct logic, but empty company. | Go to Whop Dashboard -> Create a channel -> Send a message -> Sync again. |

## ✅ Verification Checklist
- [x] `.env` contains valid `WHOP_API_KEY` and `WHOP_COMPANY_ID`.
- [x] App is installed on the test company with "View Members" access.
- [x] Dashboard loads without crashing.
- [x] "Sync Data" button returns `success` toast or logs "Sync complete".
