import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  log_id: string | null;
  read_at: string | null;
  created_at: string;
  actor?: Profile;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      setLoading(false);
      return;
    }

    // Fetch actor profiles
    if (data && data.length > 0) {
      const actorIds = [...new Set(data.map((n) => n.actor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", actorIds);

      const profileMap = new Map<string, Profile>(
        (profiles || []).map((p) => [p.user_id, p as Profile])
      );

      const enriched = data.map((n) => ({
        ...n,
        actor: profileMap.get(n.actor_id),
      }));

      setNotifications(enriched);
    } else {
      setNotifications([]);
    }

    setLoading(false);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          
          // Fetch actor profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", newNotification.actor_id)
            .maybeSingle();

          setNotifications((prev) => [
            { ...newNotification, actor: profile as Profile },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const unreadIds = notifications
      .filter((n) => !n.read_at)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications((prev) =>
      prev.map((n) =>
        unreadIds.includes(n.id)
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );
  }, [user, notifications]);

  return {
    notifications,
    loading,
    unreadCount,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
