 import { useState, useEffect } from "react";
 import { Link } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Profile } from "@/types";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { Button } from "@/components/ui/button";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Loader2 } from "lucide-react";
 import { toast } from "sonner";
 
 interface FollowListDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   userId: string;
   type: "followers" | "following";
   username: string;
 }
 
 interface UserWithFollow extends Profile {
   isFollowing: boolean;
 }
 
 export function FollowListDialog({
   open,
   onOpenChange,
   userId,
   type,
   username,
 }: FollowListDialogProps) {
   const { user } = useAuth();
   const [users, setUsers] = useState<UserWithFollow[]>([]);
   const [loading, setLoading] = useState(true);
   const [followLoading, setFollowLoading] = useState<string | null>(null);
 
   useEffect(() => {
     if (!open) return;
 
     const fetchUsers = async () => {
       setLoading(true);
 
       // Get follower/following relationships
       const { data: followData } = await supabase
         .from("follows")
         .select("*")
         .eq(type === "followers" ? "following_id" : "follower_id", userId);
 
       if (!followData || followData.length === 0) {
         setUsers([]);
         setLoading(false);
         return;
       }
 
       // Get user IDs we need to fetch
       const userIds = followData.map((f) =>
         type === "followers" ? f.follower_id : f.following_id
       );
 
       // Fetch profiles
       const { data: profilesData } = await supabase
         .from("profiles")
         .select("*")
         .in("user_id", userIds);
 
       // Check which users the current user follows
       let followingSet = new Set<string>();
       if (user) {
         const { data: myFollows } = await supabase
           .from("follows")
           .select("following_id")
           .eq("follower_id", user.id)
           .in("following_id", userIds);
         followingSet = new Set(myFollows?.map((f) => f.following_id) || []);
       }
 
       const usersWithFollow: UserWithFollow[] = (profilesData || []).map((p) => ({
         ...p,
         isFollowing: followingSet.has(p.user_id),
       }));
 
       setUsers(usersWithFollow);
       setLoading(false);
     };
 
     fetchUsers();
   }, [open, userId, type, user]);
 
   const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
     if (!user) {
       toast.error("Sign in to follow users");
       return;
     }
 
     setFollowLoading(targetUserId);
 
     try {
       if (isCurrentlyFollowing) {
         await supabase
           .from("follows")
           .delete()
           .eq("follower_id", user.id)
           .eq("following_id", targetUserId);
       } else {
         await supabase.from("follows").insert({
           follower_id: user.id,
           following_id: targetUserId,
         });
         // Create notification
         await supabase.from("notifications").insert({
           user_id: targetUserId,
           actor_id: user.id,
           type: "follow",
         });
       }
 
       setUsers((prev) =>
         prev.map((u) =>
           u.user_id === targetUserId
             ? { ...u, isFollowing: !isCurrentlyFollowing }
             : u
         )
       );
     } catch (error) {
       toast.error("Failed to update follow status");
     } finally {
       setFollowLoading(null);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>
             {type === "followers" ? "Followers" : "Following"} · @{username}
           </DialogTitle>
         </DialogHeader>
 
         <ScrollArea className="max-h-[400px]">
           {loading ? (
             <div className="flex justify-center py-8">
               <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
             </div>
           ) : users.length === 0 ? (
             <p className="text-center py-8 text-muted-foreground">
               {type === "followers" ? "No followers yet" : "Not following anyone yet"}
             </p>
           ) : (
             <div className="space-y-3 py-2">
               {users.map((profile) => (
                 <div key={profile.id} className="flex items-center gap-3">
                   <Link
                     to={`/profile/${profile.username}`}
                     onClick={() => onOpenChange(false)}
                   >
                     <Avatar className="w-10 h-10">
                       <AvatarImage src={profile.avatar_url || undefined} />
                       <AvatarFallback className="bg-secondary text-secondary-foreground">
                         {profile.username.charAt(0).toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                   </Link>
                   <div className="flex-1 min-w-0">
                     <Link
                       to={`/profile/${profile.username}`}
                       onClick={() => onOpenChange(false)}
                       className="font-medium text-foreground hover:underline block truncate"
                     >
                       {profile.display_name || profile.username}
                     </Link>
                     <p className="text-sm text-muted-foreground truncate">
                       @{profile.username}
                     </p>
                   </div>
                   {user && user.id !== profile.user_id && (
                     <Button
                       size="sm"
                       variant={profile.isFollowing ? "outline" : "default"}
                       onClick={() => handleFollow(profile.user_id, profile.isFollowing)}
                       disabled={followLoading === profile.user_id}
                       className={profile.isFollowing ? "" : "bg-primary hover:bg-primary-hover text-primary-foreground"}
                     >
                       {followLoading === profile.user_id ? (
                         <Loader2 className="w-4 h-4 animate-spin" />
                       ) : profile.isFollowing ? (
                         "Following"
                       ) : (
                         "Follow"
                       )}
                     </Button>
                   )}
                 </div>
               ))}
             </div>
           )}
         </ScrollArea>
       </DialogContent>
     </Dialog>
   );
 }