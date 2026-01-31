import { FeedMode } from "@/hooks/useFeed";
import { cn } from "@/lib/utils";

interface FeedToggleProps {
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export function FeedToggle({ mode, onModeChange }: FeedToggleProps) {
  return (
    <div className="feed-toggle">
      <button
        onClick={() => onModeChange("following")}
        className={cn(
          "feed-toggle-item",
          mode === "following" && "bg-card text-primary shadow-sm"
        )}
        data-state={mode === "following" ? "active" : "inactive"}
      >
        Following
      </button>
      <button
        onClick={() => onModeChange("suggested")}
        className={cn(
          "feed-toggle-item",
          mode === "suggested" && "bg-card text-primary shadow-sm"
        )}
        data-state={mode === "suggested" ? "active" : "inactive"}
      >
        Suggested
      </button>
    </div>
  );
}
