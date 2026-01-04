
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (your Next.js backend)
-- This allows your backend to access all rows when using the service role key

CREATE POLICY "Enable all for service role" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON public.engagement_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON public.revenue_metrics FOR ALL USING (true) WITH CHECK (true);
