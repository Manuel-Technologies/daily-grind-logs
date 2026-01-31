import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { CreateLogForm } from "@/components/CreateLogForm";
import { LogCard } from "@/components/LogCard";
import { FeedToggle } from "@/components/FeedToggle";
import { useFeed, FeedMode } from "@/hooks/useFeed";
import { Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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
        {/* Hero section for non-authenticated users */}
        {!user && (
          <div className="text-center py-12 mb-8">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center glow-primary">
                <Terminal className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">CommitLog</h1>
            <p className="text-xl text-muted-foreground mb-2">Public logs of real work</p>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              The social network for builders. Post daily work logs, build in public, stay consistent.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-8"
            >
              Start Logging
            </Button>
          </div>
        )}

        {/* Create log form for authenticated users */}
        {user && (
          <div className="mb-6">
            <CreateLogForm onLogCreated={refetch} />
          </div>
        )}

        {/* Feed toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {user ? "Your Feed" : "Explore Logs"}
          </h2>
          {user && (
            <FeedToggle mode={feedMode} onModeChange={setFeedMode} />
          )}
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
                {feedMode === "following" && user
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
