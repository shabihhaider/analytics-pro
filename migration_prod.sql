-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    whop_user_id varchar(255) NOT NULL UNIQUE,
    whop_company_id varchar(255) NOT NULL,
    email varchar(255),
    username varchar(255),
    subscription_tier varchar(50) DEFAULT 'free',
    subscription_status varchar(50) DEFAULT 'active',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    last_sync_at timestamp,
    settings jsonb DEFAULT '{}'
);

-- Members Table
CREATE TABLE IF NOT EXISTS members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    whop_member_id varchar(255) NOT NULL,
    whop_membership_id varchar(255) NOT NULL UNIQUE,
    email varchar(255),
    status varchar(50),
    joined_at timestamp,
    cancelled_at timestamp,
    product_id varchar(255),
    plan_id varchar(255),
    renewal_price decimal(10, 2) DEFAULT '0',
    currency varchar(3) DEFAULT 'usd',
    metadata jsonb DEFAULT '{}',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- Engagement Metrics (Composite PK for partitioning readiness)
CREATE TABLE IF NOT EXISTS engagement_metrics (
    id uuid DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    date date NOT NULL,
    message_count integer DEFAULT 0,
    activity_score integer DEFAULT 0,
    course_progress_delta decimal(5, 2) DEFAULT '0',
    last_active_at timestamp,
    engagement_score decimal(5, 2),
    created_at timestamp DEFAULT now(),
    PRIMARY KEY (member_id, date)
);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_user_id_date ON engagement_metrics(user_id, date);

-- Revenue Metrics
CREATE TABLE IF NOT EXISTS revenue_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    date date NOT NULL,
    mrr decimal(12, 2) DEFAULT '0',
    arr decimal(12, 2) DEFAULT '0',
    new_mrr decimal(12, 2) DEFAULT '0',
    churned_mrr decimal(12, 2) DEFAULT '0',
    expansion_mrr decimal(12, 2) DEFAULT '0',
    total_revenue decimal(12, 2) DEFAULT '0',
    total_members integer DEFAULT 0,
    active_members integer DEFAULT 0,
    churned_members integer DEFAULT 0,
    new_members integer DEFAULT 0,
    churn_rate decimal(5, 2) DEFAULT '0',
    created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_metrics_user_id_date_unique ON revenue_metrics(user_id, date);
