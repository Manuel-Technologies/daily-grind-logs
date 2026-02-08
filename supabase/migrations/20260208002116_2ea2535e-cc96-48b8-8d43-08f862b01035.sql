-- Create a unique constraint to prevent duplicate views from same viewer on same post
-- Drop the index first if it exists
DROP INDEX IF EXISTS post_views_unique_viewer;

CREATE UNIQUE INDEX post_views_unique_viewer 
ON public.post_views (log_id, viewer_id) 
WHERE viewer_id IS NOT NULL;