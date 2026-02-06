-- Create views table to track unique post views
CREATE TABLE public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NOT NULL REFERENCES public.logs(id) ON DELETE CASCADE,
  viewer_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(log_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view counts (for aggregation)
CREATE POLICY "Post views are publicly readable"
ON public.post_views
FOR SELECT
USING (true);

-- Allow authenticated users to insert their view
CREATE POLICY "Authenticated users can record views"
ON public.post_views
FOR INSERT
WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

-- Create index for fast counting
CREATE INDEX idx_post_views_log_id ON public.post_views(log_id);