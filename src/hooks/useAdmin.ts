import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export function useAdminRole() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
      setLoading(false);
    }

    checkAdminRole();
  }, [user]);

  return { isAdmin, loading };
}

export interface AdminUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  last_login_at: string | null;
}

export interface AdminLog {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  hidden_at: string | null;
  deleted_at: string | null;
  comments_locked: boolean;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  reports_count?: number;
}

export interface Report {
  id: string;
  reporter_id: string;
  log_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  log?: AdminLog;
  reporter?: {
    username: string;
  };
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_entity: string;
  target_id: string;
  reason: string | null;
  metadata: unknown;
  created_at: string;
  admin?: {
    username: string;
  };
}

export interface AdminMetrics {
  dailyActiveUsers: number;
  dailyPosts: number;
  weeklyRetention: number;
  avgPostsPerUserPerWeek: number;
  totalUsers: number;
  totalPosts: number;
  pendingReports: number;
  suspendedUsers: number;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}

export function useAdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data: logsData, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for each log
    const userIds = [...new Set((logsData || []).map(log => log.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Fetch report counts
    const logIds = (logsData || []).map(log => log.id);
    const { data: reportCounts } = await supabase
      .from('reports')
      .select('log_id')
      .in('log_id', logIds)
      .eq('status', 'pending');

    const reportCountMap = new Map<string, number>();
    reportCounts?.forEach(r => {
      reportCountMap.set(r.log_id, (reportCountMap.get(r.log_id) || 0) + 1);
    });

    const enrichedLogs = (logsData || []).map(log => ({
      ...log,
      profiles: profileMap.get(log.user_id),
      reports_count: reportCountMap.get(log.id) || 0,
    }));

    setLogs(enrichedLogs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

export function useAdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data: reportsData, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
      return;
    }

    // Fetch related logs
    const logIds = [...new Set((reportsData || []).map(r => r.log_id))];
    const { data: logs } = await supabase
      .from('logs')
      .select('*')
      .in('id', logIds);

    const logMap = new Map(logs?.map(l => [l.id, l]) || []);

    // Fetch reporter profiles
    const reporterIds = [...new Set((reportsData || []).map(r => r.reporter_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', reporterIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedReports = (reportsData || []).map(report => ({
      ...report,
      log: logMap.get(report.log_id),
      reporter: profileMap.get(report.reporter_id),
    }));

    setReports(enrichedReports);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}

export function useAuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    const { data: logsData, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
      return;
    }

    // Fetch admin profiles
    const adminIds = [...new Set((logsData || []).map(l => l.admin_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', adminIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedLogs = (logsData || []).map(log => ({
      ...log,
      admin: profileMap.get(log.admin_id),
    }));

    setAuditLogs(enrichedLogs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return { auditLogs, loading, refetch: fetchAuditLogs };
}

export function useAdminMetrics() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total posts
      const { count: totalPosts } = await supabase
        .from('logs')
        .select('*', { count: 'exact', head: true });

      // Pending reports
      const { count: pendingReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Suspended users
      const { count: suspendedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('suspended_at', 'is', null);

      // Daily active users (users who posted today)
      const { data: todayPosts } = await supabase
        .from('logs')
        .select('user_id')
        .gte('created_at', today.toISOString());

      const dailyActiveUsers = new Set(todayPosts?.map(p => p.user_id) || []).size;

      // Daily posts
      const dailyPosts = todayPosts?.length || 0;

      // Weekly active users (last 7 days)
      const { data: weekPosts } = await supabase
        .from('logs')
        .select('user_id')
        .gte('created_at', sevenDaysAgo.toISOString());

      const weekActiveUsers = new Set(weekPosts?.map(p => p.user_id) || []);

      // Previous week active users (for retention)
      const { data: prevWeekPosts } = await supabase
        .from('logs')
        .select('user_id')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString());

      const prevWeekUsers = new Set(prevWeekPosts?.map(p => p.user_id) || []);

      // Calculate retention (users active both weeks)
      let retention = 0;
      if (prevWeekUsers.size > 0) {
        const retainedUsers = [...prevWeekUsers].filter(u => weekActiveUsers.has(u)).length;
        retention = Math.round((retainedUsers / prevWeekUsers.size) * 100);
      }

      // Avg posts per user per week
      const avgPostsPerUserPerWeek = weekActiveUsers.size > 0
        ? Math.round(((weekPosts?.length || 0) / weekActiveUsers.size) * 10) / 10
        : 0;

      setMetrics({
        dailyActiveUsers,
        dailyPosts,
        weeklyRetention: retention,
        avgPostsPerUserPerWeek,
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        pendingReports: pendingReports || 0,
        suspendedUsers: suspendedUsers || 0,
      });
      setLoading(false);
    }

    fetchMetrics();
  }, []);

  return { metrics, loading };
}

export function useAdminActions() {
  const { user } = useAuth();

  const logAction = async (
    actionType: string,
    targetEntity: string,
    targetId: string,
    reason?: string
  ) => {
    if (!user) return;

    await supabase.from('audit_logs').insert([{
      admin_id: user.id,
      action_type: actionType as "suspend_user" | "unsuspend_user" | "hide_post" | "unhide_post" | "soft_delete_post" | "restore_post" | "lock_comments" | "unlock_comments" | "resolve_report" | "dismiss_report" | "grant_role" | "revoke_role",
      target_entity: targetEntity,
      target_id: targetId,
      reason,
    }]);
  };

  const suspendUser = async (userId: string, profileId: string, reason: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        suspended_at: new Date().toISOString(),
        suspension_reason: reason
      })
      .eq('id', profileId);

    if (!error) {
      await logAction('suspend_user', 'profiles', profileId, reason);
    }
    return { error };
  };

  const unsuspendUser = async (profileId: string, reason: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        suspended_at: null,
        suspension_reason: null
      })
      .eq('id', profileId);

    if (!error) {
      await logAction('unsuspend_user', 'profiles', profileId, reason);
    }
    return { error };
  };

  const hidePost = async (logId: string, reason: string) => {
    const { error } = await supabase
      .from('logs')
      .update({ hidden_at: new Date().toISOString() })
      .eq('id', logId);

    if (!error) {
      await logAction('hide_post', 'logs', logId, reason);
    }
    return { error };
  };

  const unhidePost = async (logId: string, reason: string) => {
    const { error } = await supabase
      .from('logs')
      .update({ hidden_at: null })
      .eq('id', logId);

    if (!error) {
      await logAction('unhide_post', 'logs', logId, reason);
    }
    return { error };
  };

  const softDeletePost = async (logId: string, reason: string) => {
    const { error } = await supabase
      .from('logs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', logId);

    if (!error) {
      await logAction('soft_delete_post', 'logs', logId, reason);
    }
    return { error };
  };

  const restorePost = async (logId: string, reason: string) => {
    const { error } = await supabase
      .from('logs')
      .update({ deleted_at: null })
      .eq('id', logId);

    if (!error) {
      await logAction('restore_post', 'logs', logId, reason);
    }
    return { error };
  };

  const lockComments = async (logId: string, reason: string) => {
    const { error } = await supabase
      .from('logs')
      .update({ comments_locked: true })
      .eq('id', logId);

    if (!error) {
      await logAction('lock_comments', 'logs', logId, reason);
    }
    return { error };
  };

  const unlockComments = async (logId: string, reason: string) => {
    const { error } = await supabase
      .from('logs')
      .update({ comments_locked: false })
      .eq('id', logId);

    if (!error) {
      await logAction('unlock_comments', 'logs', logId, reason);
    }
    return { error };
  };

  const resolveReport = async (reportId: string, notes: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ 
        status: 'resolved',
        resolved_by: user?.id,
        resolution_notes: notes,
        resolved_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (!error) {
      await logAction('resolve_report', 'reports', reportId, notes);
    }
    return { error };
  };

  const dismissReport = async (reportId: string, notes: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ 
        status: 'dismissed',
        resolved_by: user?.id,
        resolution_notes: notes,
        resolved_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (!error) {
      await logAction('dismiss_report', 'reports', reportId, notes);
    }
    return { error };
  };

  return {
    suspendUser,
    unsuspendUser,
    hidePost,
    unhidePost,
    softDeletePost,
    restorePost,
    lockComments,
    unlockComments,
    resolveReport,
    dismissReport,
  };
}
