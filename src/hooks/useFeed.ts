import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Log, Profile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export type FeedMode = "following" | "suggested";

export function useFeed(mode: FeedMode) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("logs")
        .select("*")
        .is("hidden_at", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (mode === "following" && user) {
        // Get following IDs
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];
        
        // Include own logs + following logs
        const allIds = [...followingIds, user.id];
        
        if (allIds.length > 0) {
          query = query.in("user_id", allIds);
        }
      }
      // Suggested mode: Fair algorithm - purely chronological from all users
      // All users get equal visibility, no algorithmic boosting

      const { data: logsData, error } = await query;

      if (error) throw error;

      // Fetch counts, profiles, and user interactions for each log
      const logsWithData = await Promise.all(
        (logsData || []).map(async (log) => {
          const [profileRes, likesRes, commentsRes, relogsRes] = await Promise.all([
            supabase.from("profiles").select("*").eq("user_id", log.user_id).single(),
            supabase.from("likes").select("id", { count: "exact" }).eq("log_id", log.id),
            supabase.from("comments").select("id", { count: "exact" }).eq("log_id", log.id),
            supabase.from("relogs").select("id", { count: "exact" }).eq("log_id", log.id),
          ]);

          let userHasLiked = false;
          let userHasRelogged = false;

          if (user) {
            const [likeCheck, relogCheck] = await Promise.all([
              supabase.from("likes").select("id").eq("log_id", log.id).eq("user_id", user.id).single(),
              supabase.from("relogs").select("id").eq("log_id", log.id).eq("user_id", user.id).single(),
            ]);
            userHasLiked = !!likeCheck.data;
            userHasRelogged = !!relogCheck.data;
          }

          return {
            ...log,
            profiles: profileRes.data as Profile,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            relogs_count: relogsRes.count || 0,
            user_has_liked: userHasLiked,
            user_has_relogged: userHasRelogged,
          } as Log;
        })
      );

      setLogs(logsWithData);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [mode, user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}
