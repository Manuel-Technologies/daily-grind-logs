import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileByUsername } from "@/hooks/useProfile";
import { Log, Profile } from "@/types";
import { Header } from "@/components/Header";
import { LogCard } from "@/components/LogCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfileByUsername(username);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = user?.id === profile?.user_id;

  useEffect(() => {
    if (!profile?.user_id) return;

    const fetchData = async () => {
      // Fetch logs
      const { data: logsData } = await supabase
        .from("logs")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false });

      if (logsData) {
        // Fetch counts and profile for each log
        const logsWithData = await Promise.all(
          logsData.map(async (log) => {
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
      }

      // Fetch followers count
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.user_id);
      setFollowersCount(followers || 0);

      // Fetch following count
      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.user_id);
      setFollowingCount(following || 0);

      // Check if current user follows this profile
      if (user && !isOwnProfile) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.user_id)
          .single();
        setIsFollowing(!!followData);
      }

      setLogsLoading(false);
    };

    fetchData();
  }, [profile?.user_id, user, isOwnProfile]);

  const handleFollow = async () => {
    if (!user || !profile) {
      toast.error("Sign in to follow users");
      return;
    }

    setFollowLoading(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.user_id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
      toast.success(`Unfollowed @${profile.username}`);
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: profile.user_id,
      });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast.success(`Following @${profile.username}`);
    }

    setFollowLoading(false);
  };

  const refetchLogs = async () => {
    if (!profile?.user_id) return;
    
    const { data: logsData } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false });

    if (logsData) {
      const logsWithData = await Promise.all(
        logsData.map(async (log) => {
          const [profileRes, likesRes, commentsRes, relogsRes] = await Promise.all([
            supabase.from("profiles").select("*").eq("user_id", log.user_id).single(),
            supabase.from("likes").select("id", { count: "exact" }).eq("log_id", log.id),
            supabase.from("comments").select("id", { count: "exact" }).eq("log_id", log.id),
            supabase.from("relogs").select("id", { count: "exact" }).eq("log_id", log.id),
          ]);

          return {
            ...log,
            profiles: profileRes.data as Profile,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            relogs_count: relogsRes.count || 0,
          } as Log;
        })
      );
      setLogs(logsWithData);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container max-w-2xl py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">User not found</h1>
          <p className="text-muted-foreground mb-6">This user doesn't exist or has been deleted.</p>
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
        {/* Profile header */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 avatar-ring">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground truncate">
                    {profile.display_name || profile.username}
                  </h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                {!isOwnProfile && user && (
                  <Button
                    onClick={handleFollow}
                    disabled={followLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className={isFollowing ? "border-border" : "bg-primary hover:bg-primary-hover text-primary-foreground"}
                  >
                    {followLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFollowing ? (
                      "Following"
                    ) : (
                      "Follow"
                    )}
                  </Button>
                )}
              </div>

              {profile.bio && (
                <p className="mt-3 text-foreground">{profile.bio}</p>
              )}

              <div className="flex items-center gap-4 mt-4 text-sm">
                <div>
                  <span className="font-semibold text-foreground">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{followersCount}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Joined {format(new Date(profile.created_at), "MMMM yyyy")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User's logs */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Logs</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {logsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No logs yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <LogCard key={log.id} log={log} onUpdate={refetchLogs} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
