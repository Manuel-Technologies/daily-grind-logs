import { useState } from "react";
import { Header } from "@/components/Header";
import { CreateLogForm } from "@/components/CreateLogForm";
import { LogCard } from "@/components/LogCard";
import { FeedToggle } from "@/components/FeedToggle";
import { useFeed, FeedMode } from "@/hooks/useFeed";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { loading: authLoading } = useAuth();
  const [feedMode, setFeedMode] = useState<FeedMode>("suggested");
  const { logs, loading, refetch } = useFeed(feedMode);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container max-w-2xl py-6">
        {/* Create log form */}
        <div className="mb-6">
          <CreateLogForm onLogCreated={refetch} />
        </div>

        {/* Feed toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Feed</h2>
          <FeedToggle mode={feedMode} onModeChange={setFeedMode} />
        </div>

        {/* Feed */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {feedMode === "following"
                  ? "No logs from people you follow. Try the Suggested feed or follow some builders!"
                  : "No logs yet. Be the first to post!"}
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <LogCard key={log.id} log={log} onUpdate={refetch} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
