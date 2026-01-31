import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function Discover() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<(Profile & { logs_count: number; is_following: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProfiles();
    if (user) {
      fetchFollowing();
    }
  }, [user]);

  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    
    if (data) {
      setFollowingIds(new Set(data.map(f => f.following_id)));
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get logs count for each profile
      const profilesWithCounts = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { count } = await supabase
            .from("logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.user_id);

          return {
            ...profile,
            logs_count: count || 0,
            is_following: false,
          };
        })
      );

      // Sort by logs count (most active first)
      profilesWithCounts.sort((a, b) => b.logs_count - a.logs_count);
      setProfiles(profilesWithCounts);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (profileUserId: string) => {
    if (!user) {
      toast.error("Sign in to follow users");
      return;
    }

    const isFollowing = followingIds.has(profileUserId);

    if (isFollowing) {
      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(profileUserId);
        return next;
      });
      await supabase.from("follows").delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileUserId);
      toast.success("Unfollowed");
    } else {
      setFollowingIds(prev => new Set(prev).add(profileUserId));
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: profileUserId,
      });
      toast.success("Following!");
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.username.toLowerCase().includes(query) ||
      profile.display_name?.toLowerCase().includes(query) ||
      profile.bio?.toLowerCase().includes(query)
    );
  }).filter(profile => profile.user_id !== user?.id); // Exclude current user

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container max-w-2xl py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Discover Builders</h1>
          <p className="text-muted-foreground">Find and follow builders in the community</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by username, name, or bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Profiles list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No builders found matching your search" : "No builders to discover yet"}
              </p>
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const isFollowing = followingIds.has(profile.user_id);
              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-4 p-4 border-b border-border last:border-b-0 hover:bg-card-hover transition-colors"
                >
                  <Link to={`/profile/${profile.username}`}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {profile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${profile.username}`}
                      className="font-medium text-foreground hover:underline block truncate"
                    >
                      {profile.display_name || profile.username}
                    </Link>
                    <Link
                      to={`/profile/${profile.username}`}
                      className="text-muted-foreground text-sm truncate block"
                    >
                      @{profile.username}
                    </Link>
                    {profile.bio && (
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-1">{profile.bio}</p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1">
                      {profile.logs_count} logs
                    </p>
                  </div>

                  <Button
                    variant={isFollowing ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleFollow(profile.user_id)}
                    className={isFollowing ? "bg-secondary hover:bg-secondary-hover" : "bg-primary hover:bg-primary-hover text-primary-foreground"}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
