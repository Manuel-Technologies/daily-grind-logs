 import { useState, useEffect, useCallback } from "react";
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
 import { RichContent } from "./RichContent";
 import { MentionInput } from "./MentionInput";

interface CommentsSectionProps {
  logId: string;
  commentsLocked?: boolean;
   showAll?: boolean;
}

 interface CommentWithReplies extends Comment {
   replies?: CommentWithReplies[];
 }
 
 export function CommentsSection({ logId, commentsLocked = false, showAll = false }: CommentsSectionProps) {
  const { user } = useAuth();
   const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
   const [replyingTo, setReplyingTo] = useState<string | null>(null);
   const [replyContent, setReplyContent] = useState("");

   const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("log_id", logId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
       setLoading(false);
       return;
     }
 
     if (!data) {
       setComments([]);
       setLoading(false);
       return;
     }
 
     // Fetch profiles for each comment
     const commentsWithProfiles = await Promise.all(
       data.map(async (c) => {
         const { data: profileData } = await supabase
           .from("profiles")
           .select("*")
           .eq("user_id", c.user_id)
           .single();
         return { ...c, profiles: profileData as Profile } as CommentWithReplies;
       })
     );
 
     // Organize into tree structure
     const commentMap = new Map<string, CommentWithReplies>();
     const rootComments: CommentWithReplies[] = [];
 
     commentsWithProfiles.forEach((c) => {
       c.replies = [];
       commentMap.set(c.id, c);
     });
 
     commentsWithProfiles.forEach((c) => {
       const parentId = (c as any).parent_id;
       if (parentId && commentMap.has(parentId)) {
         commentMap.get(parentId)!.replies!.push(c);
       } else {
         rootComments.push(c);
       }
     });
 
     setComments(rootComments);
     setLoading(false);
   }, [logId]);
 
   useEffect(() => {
     fetchComments();
   }, [fetchComments]);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !newComment.trim()) return;
 
     setSubmitting(true);
 
     // First get log author to send notification
     const { data: logData } = await supabase
       .from("logs")
       .select("user_id")
       .eq("id", logId)
       .maybeSingle();
 
     const { error } = await supabase.from("comments").insert({
       log_id: logId,
       user_id: user.id,
       content: newComment.trim(),
     });
 
     if (error) {
       toast.error("Failed to post comment");
    } else {
       // Send notification to log author (not self)
       if (logData && logData.user_id !== user.id) {
         supabase.from("notifications").insert({
           user_id: logData.user_id,
           actor_id: user.id,
           type: "comment",
           log_id: logId,
         }).then(() => {});
       }
       setNewComment("");
       fetchComments();
    }
 
     setSubmitting(false);
  };

   const handleReply = async (e: React.FormEvent, parentId: string, parentUserId: string) => {
    e.preventDefault();
     if (!user || !replyContent.trim()) return;

    setSubmitting(true);

     const { error } = await supabase.from("comments").insert({
      log_id: logId,
      user_id: user.id,
       content: replyContent.trim(),
       parent_id: parentId,
    });

    if (error) {
       toast.error("Failed to post reply");
    } else {
       // Send notification to parent comment author (not self)
       if (parentUserId !== user.id) {
        supabase.from("notifications").insert({
           user_id: parentUserId,
          actor_id: user.id,
          type: "comment",
          log_id: logId,
        }).then(() => {});
      }
       setReplyContent("");
       setReplyingTo(null);
      fetchComments();
    }

    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
       toast.error("Failed to delete comment");
     } else {
       fetchComments();
     }
  };

   const renderComment = (comment: CommentWithReplies, depth = 0) => (
     <div key={comment.id} className={depth > 0 ? "ml-6 border-l border-border pl-3" : ""}>
       <div className="flex gap-2 py-2">
         <Link to={`/profile/${comment.profiles?.username}`}>
           <Avatar className="w-8 h-8 flex-shrink-0">
             <AvatarImage src={comment.profiles?.avatar_url || undefined} />
             <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
               {comment.profiles?.username?.charAt(0).toUpperCase() || "U"}
             </AvatarFallback>
           </Avatar>
         </Link>
         <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 flex-wrap">
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
           <div className="text-sm text-foreground mt-0.5">
             <RichContent content={comment.content} />
           </div>
           {!commentsLocked && user && depth < 2 && (
             <button
               onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
               className="text-xs text-muted-foreground hover:text-primary mt-1"
             >
               Reply
             </button>
           )}
           {replyingTo === comment.id && (
             <form onSubmit={(e) => handleReply(e, comment.id, comment.user_id)} className="mt-2">
               <MentionInput
                 value={replyContent}
                 onChange={setReplyContent}
                 placeholder={`Reply to @${comment.profiles?.username}...`}
                 className="min-h-[40px] text-sm"
               />
               <div className="flex justify-end gap-2 mt-2">
                 <Button
                   type="button"
                   size="sm"
                   variant="ghost"
                   onClick={() => setReplyingTo(null)}
                 >
                   Cancel
                 </Button>
                 <Button
                   type="submit"
                   size="sm"
                   disabled={!replyContent.trim() || submitting}
                   className="bg-primary hover:bg-primary-hover text-primary-foreground"
                 >
                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reply"}
                 </Button>
               </div>
             </form>
           )}
         </div>
       </div>
       {comment.replies && comment.replies.length > 0 && (
         <div className="space-y-1">
           {comment.replies.map((reply) => renderComment(reply, depth + 1))}
         </div>
       )}
     </div>
   );
 
   const displayComments = showAll ? comments : comments.slice(0, 3);
 
  return (
    <div className="mt-4 pt-4 border-t border-border">
      {commentsLocked ? (
        <div className="mb-4 p-3 rounded-md bg-muted text-muted-foreground text-sm text-center">
          Comments are locked on this post.
        </div>
      ) : user && (
        <form onSubmit={handleSubmit} className="mb-4">
           <MentionInput
            value={newComment}
             onChange={setNewComment}
            placeholder="Write a comment..."
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
         <div className="space-y-1">
           {displayComments.map((comment) => renderComment(comment))}
           {!showAll && comments.length > 3 && (
             <p className="text-sm text-muted-foreground text-center py-2">
               View post to see all {comments.length} comments
             </p>
           )}
        </div>
      )}
    </div>
  );
}
