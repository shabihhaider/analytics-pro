ALTER TABLE "members" ADD COLUMN "renewal_price" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "currency" varchar(3) DEFAULT 'usd';