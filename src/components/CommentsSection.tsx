import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Comment, Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface CommentsSectionProps {
  logId: string;
}

export function CommentsSection({ logId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("log_id", logId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      // Fetch profiles for each comment
      const commentsWithProfiles = await Promise.all(
        data.map(async (c) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", c.user_id)
            .single();
          return { ...c, profiles: profileData as Profile };
        })
      );
      setComments(commentsWithProfiles as Comment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [logId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);

    const { error } = await supabase.from("comments").insert({
      log_id: logId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
      fetchComments();
    }

    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast.error("Failed to delete comment");
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {user && (
        <form onSubmit={handleSubmit} className="mb-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="min-h-[60px] bg-input border-border resize-none text-foreground placeholder:text-muted-foreground"
            maxLength={500}
          />
          <div className="flex justify-end mt-2">
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || submitting}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Comment"
              )}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No comments yet</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Link to={`/profile/${comment.profiles?.username}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {comment.profiles?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${comment.profiles?.username}`}
                    className="font-medium text-sm text-foreground hover:underline"
                  >
                    {comment.profiles?.display_name || comment.profiles?.username}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {user?.id === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
