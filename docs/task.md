# Whop Analytics App - Project Tracker

## 🟢 Phase 1: Foundation & Scaffold (Completed)
**Goal:** Initialize project, strict Next.js 14 environment, dependencies, and database schema.

- [x] **Project Initialization**
    - [x] Downgrade to Next.js 14 / React 18 (Strict Requirement)
    - [x] Install Core Dependencies (`@whop/sdk`, `drizzle-orm`, `postgres`, `@supabase/supabase-js`)
    - [x] Install Utility Dependencies (`zod`, `date-fns`, `zustand`, `lucide-react`)
    - [x] Set up Tailwind CSS + Shadcn/UI (Base structure)
- [x] **Database Schema**
    - [x] Configure Drizzle (`src/lib/db/index.ts`)
    - [x] Define Schema (`src/lib/db/schema.ts`) with partitioning support for `engagement_metrics`
    - [x] Generate Drizzle Config (`drizzle.config.ts`)
- [x] **Whop Integration Core**
    - [x] Create Type-Safe Whop Client Wrapper (`src/lib/whop/client.ts`)
    - [x] Implement Silent Iframe Auth Middleware (`src/middleware.ts`)
    - [x] Create Webhook Handler with Signature Verification (`src/app/api/webhooks/whop/route.ts`)
- [x] **Configuration & Fixes**
    - [x] Configure `.env.local`
    - [x] Fix TypeScript errors and `@whop/sdk` imports
    - [x] Fix Next.js 14 build errors (Converted `next.config.ts` to `.mjs`, Fixed Windows ESM path issue)

### 🧪 Phase 1 Testing Steps
1.  `npm run build` ✅ Verified (Exit code 0)
2.  `npx drizzle-kit generate` ✅ Verified
3.  `npm run dev` ✅ Verified

---

## 🟢 Phase 2: Core Features (Member Engagement) (Completed)
**Goal:** Implement the "Engagement Score" calculation and display it.

- [x] **Data Fetching & Sync**
    - [x] Implement `WhopSync.syncCompanyMembers` (Upsert logic verified)
    - [x] Implement `WhopSync.syncRecentMessages` (Top 5 Channels + Rate Limit Handling)
- [x] **Engagement Logic**
    - [x] Implement `calculateEngagementScore` algorithm (Message Volume + Recency)
    - [x] Create API Route: `GET /api/analytics/engagement`
- [x] **UI Components (Frosted UI)**
    - [x] Create `MetricCard` component (Shadcn + Tailwind)
    - [x] Build Main Dashboard Layout (Connected to API)
    - [x] Add "Sync Data" trigger button

### 🧪 Phase 2 Testing Steps
1.  **Build Verification:**
    ```bash
    npm run build
    # ✅ Verified: Compiled successfully.
    ```
2.  **Code Verification:**
    - `src/lib/whop/sync.ts`: Checked for correct SDK inputs (`first` vs `per_page`) and rate limit handling.
    - `src/lib/db/schema.ts`: Added Drizzle Relations for `db.query` support.
3.  **UI Check:** Dashboard currently displays real data (or 0s if empty) fetched from local DB.

---

## 🟡 Phase 3: Revenue & Risk Engine (In Progress)
**Goal:** Implement Revenue Analytics (MRR) and Churn Risk detection.

- [ ] **Schema Updates**
    - [ ] Add `renewalPrice` and `currency` to `members` table.
    - [ ] Run `npm run db:push`.
- [ ] **Revenue Engine**
    - [ ] Update `WhopSync.syncCompanyMembers` to capture price.
    - [ ] Create `src/lib/whop/revenue.ts` (Aggregation logic).
    - [ ] Create API: `GET /api/analytics/revenue`.
- [ ] **Churn Risk Engine**
    - [ ] Implement Heuristic Logic (Last Active > 14 days).
    - [ ] Create API: `GET /api/analytics/risk`.
- [ ] **UI Implementation**
    - [ ] Create `RevenueChart` (Recharts).
    - [ ] Create `RiskTable` (High Risk Members).
    - [ ] Integrate into Dashboard.
