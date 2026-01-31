import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Log } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CommentsSection } from "./CommentsSection";
import { EditLogDialog } from "./EditLogDialog";

interface LogCardProps {
  log: Log;
  onUpdate: () => void;
}

export function LogCard({ log, onUpdate }: LogCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [likesCount, setLikesCount] = useState(log.likes_count || 0);
  const [relogsCount, setRelogsCount] = useState(log.relogs_count || 0);
  const [hasLiked, setHasLiked] = useState(log.user_has_liked || false);
  const [hasRelogged, setHasRelogged] = useState(log.user_has_relogged || false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const isOwnLog = user?.id === log.user_id;
  const canEdit = isOwnLog && log.created_at && 
    new Date().getTime() - new Date(log.created_at).getTime() < 20 * 60 * 1000; // 20 minutes

  const handleLike = async () => {
    if (!user) {
      toast.error("Sign in to like logs");
      return;
    }

    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);

    if (hasLiked) {
      setHasLiked(false);
      setLikesCount(prev => prev - 1);
      await supabase.from("likes").delete().eq("log_id", log.id).eq("user_id", user.id);
    } else {
      setHasLiked(true);
      setLikesCount(prev => prev + 1);
      await supabase.from("likes").insert({ log_id: log.id, user_id: user.id });
    }
  };

  const handleRelog = async () => {
    if (!user) {
      toast.error("Sign in to relog");
      return;
    }

    if (isOwnLog) {
      toast.error("You can't relog your own log");
      return;
    }

    if (hasRelogged) {
      setHasRelogged(false);
      setRelogsCount(prev => prev - 1);
      await supabase.from("relogs").delete().eq("log_id", log.id).eq("user_id", user.id);
      toast.success("Relog removed");
    } else {
      setHasRelogged(true);
      setRelogsCount(prev => prev + 1);
      await supabase.from("relogs").insert({ log_id: log.id, user_id: user.id });
      toast.success("Relogged!");
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwnLog) return;

    const { error } = await supabase.from("logs").delete().eq("id", log.id);
    if (error) {
      toast.error("Failed to delete log");
    } else {
      toast.success("Log deleted");
      onUpdate();
    }
  };

  return (
    <article className="log-card border-b border-border p-4 animate-fade-in">
      <div className="flex gap-3">
        <Link to={`/profile/${log.profiles?.username}`}>
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={log.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {log.profiles?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${log.profiles?.username}`}
              className="font-medium text-foreground hover:underline truncate"
            >
              {log.profiles?.display_name || log.profiles?.username}
            </Link>
            <Link
              to={`/profile/${log.profiles?.username}`}
              className="text-muted-foreground text-sm truncate"
            >
              @{log.profiles?.username}
            </Link>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
            {log.edited_at && (
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                edited
              </span>
            )}
          </div>

          <p className="mt-2 text-foreground whitespace-pre-wrap break-words">
            {log.content}
          </p>

          {log.image_url && (
            <div className="mt-3">
              <img
                src={log.image_url}
                alt="Log attachment"
                className="rounded-xl max-h-96 object-cover border border-border"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-3 -ml-2">
            <button
              onClick={() => setShowComments(!showComments)}
              className="action-button action-button--comment text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{log.comments_count || 0}</span>
            </button>

            <button
              onClick={handleRelog}
              className={cn("action-button action-button--relog text-sm", isOwnLog && "opacity-50 cursor-not-allowed")}
              data-active={hasRelogged}
              disabled={isOwnLog}
            >
              <Repeat2 className="w-4 h-4" />
              <span>{relogsCount}</span>
            </button>

            <button
              onClick={handleLike}
              className="action-button action-button--like text-sm"
              data-active={hasLiked}
            >
              <Heart
                className={cn(
                  "w-4 h-4 transition-all",
                  hasLiked && "fill-current",
                  likeAnimating && "animate-like"
                )}
              />
              <span>{likesCount}</span>
            </button>

            {isOwnLog && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border">
                  {canEdit && (
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => setShowEditDialog(true)}
                    >
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {showComments && (
            <CommentsSection logId={log.id} />
          )}
        </div>
      </div>

      <EditLogDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        logId={log.id}
        initialContent={log.content}
        onSaved={onUpdate}
      />
    </article>
  );
}
