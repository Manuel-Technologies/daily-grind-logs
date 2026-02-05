import { useState } from "react";
import { Header } from "@/components/Header";
import { CreateLogForm } from "@/components/CreateLogForm";
import { LogCard } from "@/components/LogCard";
import { FeedToggle } from "@/components/FeedToggle";
import { FeedSkeleton } from "@/components/LogCardSkeleton";
import { useFeedQuery, FeedMode } from "@/hooks/useFeedQuery";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
 import { usePullToRefresh } from "@/hooks/usePullToRefresh";
 import { PullToRefresh } from "@/components/PullToRefresh";
 import { useIsMobile } from "@/hooks/use-mobile";

export default function Index() {
  const { loading: authLoading } = useAuth();
   const isMobile = useIsMobile();
  const [feedMode, setFeedMode] = useState<FeedMode>("suggested");
  
  const { 
    logs, 
    loading, 
    isFetchingNextPage,
    hasNextPage, 
    fetchNextPage,
    invalidateFeed,
    addOptimisticLog,
     refetch,
  } = useFeedQuery(feedMode);

   // Pull to refresh (mobile only)
   const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
     onRefresh: async () => {
       await refetch();
     },
   });
 
  // Scroll restoration
  useScrollRestoration("feed");

  // Infinite scroll
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
     <div className="min-h-screen" ref={isMobile ? containerRef : undefined}>
      <Header />
      
       {/* Pull to refresh indicator */}
       {isMobile && <PullToRefresh pullDistance={pullDistance} isRefreshing={isRefreshing} />}
 
      <main className="container max-w-2xl py-6">
        {/* Create log form */}
        <div className="mb-6">
          <CreateLogForm 
            onLogCreated={invalidateFeed} 
            onOptimisticAdd={addOptimisticLog}
          />
        </div>

        {/* Feed toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Feed</h2>
          <FeedToggle mode={feedMode} onModeChange={setFeedMode} />
        </div>

        {/* Feed */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <FeedSkeleton count={5} />
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {feedMode === "following"
                  ? "No logs from people you follow. Try the Suggested feed or follow some builders!"
                  : "No logs yet. Be the first to post!"}
              </p>
            </div>
          ) : (
            <>
              {logs.map((log) => (
                <LogCard key={log.id} log={log} onUpdate={invalidateFeed} />
              ))}
              
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-1" />
              
              {/* Loading more indicator */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {/* End of feed indicator */}
              {!hasNextPage && logs.length > 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  You've reached the end of the feed
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
