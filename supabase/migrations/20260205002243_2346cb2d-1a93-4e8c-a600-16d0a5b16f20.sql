-- Add parent_id to comments table for nested replies
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add index for efficient querying of replies
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Add profile_completed flag to profiles for onboarding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;