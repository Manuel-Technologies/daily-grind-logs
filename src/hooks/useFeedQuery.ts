import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Log, Profile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export type FeedMode = "following" | "suggested";

const PAGE_SIZE = 10;

interface FeedPage {
  logs: Log[];
  nextCursor: string | null;
}

async function fetchLogsPage(
  mode: FeedMode,
  userId: string | null,
  cursor: string | null
): Promise<FeedPage> {
  let query = supabase
    .from("logs")
    .select("*")
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  // Apply cursor for pagination
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (mode === "following" && userId) {
    // Get following IDs
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    const followingIds = followingData?.map(f => f.following_id) || [];
    const allIds = [...followingIds, userId];
    
    if (allIds.length > 0) {
      query = query.in("user_id", allIds);
    }
  }

  const { data: logsData, error } = await query;

  if (error) throw error;

  if (!logsData || logsData.length === 0) {
    return { logs: [], nextCursor: null };
  }

  // Batch fetch all profiles for this page
  const userIds = [...new Set(logsData.map(log => log.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", userIds);

  const profilesMap = new Map<string, Profile>(
    (profilesData || []).map(p => [p.user_id, p as Profile])
  );

  // Batch fetch counts for all logs in this page
  const logIds = logsData.map(log => log.id);
  
  const [likesRes, commentsRes, relogsRes] = await Promise.all([
    supabase.from("likes").select("log_id").in("log_id", logIds),
    supabase.from("comments").select("log_id").in("log_id", logIds),
    supabase.from("relogs").select("log_id").in("log_id", logIds),
  ]);

  // Count occurrences for each log
  const likesCount = new Map<string, number>();
  const commentsCount = new Map<string, number>();
  const relogsCount = new Map<string, number>();

  (likesRes.data || []).forEach(like => {
    likesCount.set(like.log_id, (likesCount.get(like.log_id) || 0) + 1);
  });
  (commentsRes.data || []).forEach(comment => {
    commentsCount.set(comment.log_id, (commentsCount.get(comment.log_id) || 0) + 1);
  });
  (relogsRes.data || []).forEach(relog => {
    relogsCount.set(relog.log_id, (relogsCount.get(relog.log_id) || 0) + 1);
  });

  // Check user interactions if logged in
  let userLikes = new Set<string>();
  let userRelogs = new Set<string>();

  if (userId) {
    const [userLikesRes, userRelogsRes] = await Promise.all([
      supabase.from("likes").select("log_id").in("log_id", logIds).eq("user_id", userId),
      supabase.from("relogs").select("log_id").in("log_id", logIds).eq("user_id", userId),
    ]);
    userLikes = new Set((userLikesRes.data || []).map(l => l.log_id));
    userRelogs = new Set((userRelogsRes.data || []).map(r => r.log_id));
  }

  const logs: Log[] = logsData.map(log => ({
    ...log,
    profiles: profilesMap.get(log.user_id) as Profile,
    likes_count: likesCount.get(log.id) || 0,
    comments_count: commentsCount.get(log.id) || 0,
    relogs_count: relogsCount.get(log.id) || 0,
    user_has_liked: userLikes.has(log.id),
    user_has_relogged: userRelogs.has(log.id),
  }));

  // Next cursor is the created_at of the last log
  const nextCursor = logsData.length === PAGE_SIZE 
    ? logsData[logsData.length - 1].created_at 
    : null;

  return { logs, nextCursor };
}

export function useFeedQuery(mode: FeedMode) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["feed", mode, user?.id],
    queryFn: ({ pageParam }) => fetchLogsPage(mode, user?.id || null, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
  });

  // Flatten all pages into a single logs array
  const logs = query.data?.pages.flatMap(page => page.logs) || [];

  // Optimistically add a new log to the feed
  const addOptimisticLog = useCallback((newLog: Log) => {
    queryClient.setQueryData(
      ["feed", mode, user?.id],
      (oldData: typeof query.data) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: [
            {
              ...oldData.pages[0],
              logs: [newLog, ...oldData.pages[0].logs],
            },
            ...oldData.pages.slice(1),
          ],
        };
      }
    );
  }, [queryClient, mode, user?.id]);

  // Invalidate to refetch fresh data (after successful server-side creation)
  const invalidateFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  }, [queryClient]);

  return {
    logs,
    loading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    addOptimisticLog,
    invalidateFeed,
  };
}
