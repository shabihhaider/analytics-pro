CREATE TABLE "engagement_metrics" (
	"id" uuid DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"member_id" uuid,
	"date" date NOT NULL,
	"message_count" integer DEFAULT 0,
	"activity_score" integer DEFAULT 0,
	"course_progress_delta" numeric(5, 2) DEFAULT '0',
	"last_active_at" timestamp,
	"engagement_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "engagement_metrics_member_id_date_pk" PRIMARY KEY("member_id","date")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"whop_member_id" varchar(255) NOT NULL,
	"whop_membership_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"status" varchar(50),
	"joined_at" timestamp,
	"cancelled_at" timestamp,
	"product_id" varchar(255),
	"plan_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "members_whop_membership_id_unique" UNIQUE("whop_membership_id")
);
--> statement-breakpoint
CREATE TABLE "revenue_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"date" date NOT NULL,
	"mrr" numeric(12, 2) DEFAULT '0',
	"arr" numeric(12, 2) DEFAULT '0',
	"new_mrr" numeric(12, 2) DEFAULT '0',
	"churned_mrr" numeric(12, 2) DEFAULT '0',
	"expansion_mrr" numeric(12, 2) DEFAULT '0',
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"total_members" integer DEFAULT 0,
	"active_members" integer DEFAULT 0,
	"churned_members" integer DEFAULT 0,
	"new_members" integer DEFAULT 0,
	"churn_rate" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whop_user_id" varchar(255) NOT NULL,
	"whop_company_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"username" varchar(255),
	"subscription_tier" varchar(50) DEFAULT 'free',
	"subscription_status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_sync_at" timestamp,
	"settings" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "users_whop_user_id_unique" UNIQUE("whop_user_id")
);
--> statement-breakpoint
ALTER TABLE "engagement_metrics" ADD CONSTRAINT "engagement_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_metrics" ADD CONSTRAINT "engagement_metrics_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_metrics" ADD CONSTRAINT "revenue_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_engagement_metrics_user_id_date" ON "engagement_metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_members_user_id" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_metrics_user_id_date_unique" ON "revenue_metrics" USING btree ("user_id","date");