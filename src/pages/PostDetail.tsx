 import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Log, Profile } from "@/types";
import { Header } from "@/components/Header";
import { LogCard } from "@/components/LogCard";
import { CommentsSection } from "@/components/CommentsSection";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function PostDetail() {
  const { logId } = useParams<{ logId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const hasTrackedView = useRef(false);

  // Track view on mount - with deduplication via unique constraint
  useEffect(() => {
    if (!logId || hasTrackedView.current) return;
    
    const trackView = async () => {
      hasTrackedView.current = true;
      // Use upsert-like behavior - the unique constraint will prevent duplicates
      try {
        await supabase.from("post_views").insert({
          log_id: logId,
          viewer_id: user?.id || null,
        });
      } catch {
        // Ignore duplicate errors - view already tracked
      }
    };
    
    trackView();
  }, [logId, user?.id]);

  useEffect(() => {
    if (!logId) return;

    const fetchLog = async () => {
      const { data: logData, error } = await supabase
        .from("logs")
        .select("*")
        .eq("id", logId)
        .single();

      if (error || !logData) {
        setLoading(false);
        return;
      }

      // Fetch profile and counts
      const [profileRes, likesRes, commentsRes, relogsRes, viewsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", logData.user_id).single(),
        supabase.from("likes").select("id", { count: "exact" }).eq("log_id", logId),
        supabase.from("comments").select("id", { count: "exact" }).eq("log_id", logId),
        supabase.from("relogs").select("id", { count: "exact" }).eq("log_id", logId),
        supabase.from("post_views").select("id", { count: "exact" }).eq("log_id", logId),
      ]);

      let userHasLiked = false;
      let userHasRelogged = false;

      if (user) {
        const [likeCheck, relogCheck] = await Promise.all([
          supabase.from("likes").select("id").eq("log_id", logId).eq("user_id", user.id).single(),
          supabase.from("relogs").select("id").eq("log_id", logId).eq("user_id", user.id).single(),
        ]);
        userHasLiked = !!likeCheck.data;
        userHasRelogged = !!relogCheck.data;
      }

      setLog({
        ...logData,
        profiles: profileRes.data as Profile,
        likes_count: likesRes.count || 0,
        comments_count: commentsRes.count || 0,
        relogs_count: relogsRes.count || 0,
        views_count: viewsRes.count || 0,
        user_has_liked: userHasLiked,
        user_has_relogged: userHasRelogged,
      });
      setLoading(false);
    };

    fetchLog();
  }, [logId, user]);
 
   const handleUpdate = async () => {
     if (!logId) return;
     // Refetch the log
     const { data: logData } = await supabase
       .from("logs")
       .select("*")
       .eq("id", logId)
       .single();
 
     if (!logData) {
       navigate("/");
       return;
     }
 
    const [profileRes, likesRes, commentsRes, relogsRes, viewsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", logData.user_id).single(),
      supabase.from("likes").select("id", { count: "exact" }).eq("log_id", logId),
      supabase.from("comments").select("id", { count: "exact" }).eq("log_id", logId),
      supabase.from("relogs").select("id", { count: "exact" }).eq("log_id", logId),
      supabase.from("post_views").select("id", { count: "exact" }).eq("log_id", logId),
    ]);

    setLog({
      ...logData,
      profiles: profileRes.data as Profile,
      likes_count: likesRes.count || 0,
      comments_count: commentsRes.count || 0,
      relogs_count: relogsRes.count || 0,
      views_count: viewsRes.count || 0,
    });
  };
 
   if (loading) {
     return (
       <div className="min-h-screen">
         <Header />
         <div className="flex justify-center py-12">
           <Loader2 className="w-8 h-8 animate-spin text-primary" />
         </div>
       </div>
     );
   }
 
   if (!log) {
     return (
       <div className="min-h-screen">
         <Header />
         <div className="container max-w-2xl py-12 text-center">
           <h1 className="text-2xl font-bold text-foreground mb-2">Post not found</h1>
           <p className="text-muted-foreground mb-6">This post doesn't exist or has been deleted.</p>
           <Button asChild variant="outline">
             <Link to="/">
               <ArrowLeft className="w-4 h-4 mr-2" />
               Back to feed
             </Link>
           </Button>
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen">
       <Header />
 
       <main className="container max-w-2xl py-6">
         {/* Back button */}
         <Button
           variant="ghost"
           size="sm"
           onClick={() => navigate(-1)}
           className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
         >
           <ArrowLeft className="w-4 h-4 mr-2" />
           Back
         </Button>
 
         {/* Post */}
         <div className="bg-card border border-border rounded-xl overflow-hidden">
           <LogCard log={log} onUpdate={handleUpdate} showFullComments />
           
           {/* Full comments section always visible */}
           <div className="px-4 pb-4">
             <CommentsSection logId={log.id} commentsLocked={log.comments_locked} showAll />
           </div>
         </div>
       </main>
     </div>
   );
 }