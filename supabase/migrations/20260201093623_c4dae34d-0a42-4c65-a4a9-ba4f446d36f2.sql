-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Roles are viewable by admins"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Roles can be managed by admins"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Report reason enum
CREATE TYPE public.report_reason AS ENUM (
    'spam',
    'harassment',
    'inappropriate_content',
    'misinformation',
    'self_harm',
    'other'
);

-- Report status enum
CREATE TYPE public.report_status AS ENUM ('pending', 'resolved', 'dismissed');

-- Reports table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    log_id UUID NOT NULL REFERENCES public.logs(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    details TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    resolved_by UUID,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin action type enum
CREATE TYPE public.admin_action_type AS ENUM (
    'suspend_user',
    'unsuspend_user',
    'hide_post',
    'unhide_post',
    'soft_delete_post',
    'restore_post',
    'lock_comments',
    'unlock_comments',
    'resolve_report',
    'dismiss_report',
    'grant_role',
    'revoke_role'
);

-- Audit logs table (critical for transparency)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action_type admin_action_type NOT NULL,
    target_entity TEXT NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add moderation fields to profiles
ALTER TABLE public.profiles
ADD COLUMN suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN suspension_reason TEXT,
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;

-- Add moderation fields to logs
ALTER TABLE public.logs
ADD COLUMN hidden_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN comments_locked BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_log_id ON public.reports(log_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_profiles_suspended ON public.profiles(suspended_at) WHERE suspended_at IS NOT NULL;
CREATE INDEX idx_logs_hidden ON public.logs(hidden_at) WHERE hidden_at IS NOT NULL;
CREATE INDEX idx_logs_deleted ON public.logs(deleted_at) WHERE deleted_at IS NOT NULL;