 import { useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { useProfile } from "@/hooks/useProfile";
 import { Button } from "@/components/ui/button";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { toast } from "sonner";
 import { Loader2, Camera, ArrowRight } from "lucide-react";
 import { Terminal } from "lucide-react";
 
 export default function CompleteProfile() {
   const { user } = useAuth();
   const { profile, loading: profileLoading } = useProfile(user?.id);
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [uploading, setUploading] = useState(false);
   const [saving, setSaving] = useState(false);
   const navigate = useNavigate();
 
   const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !user) return;
 
     if (file.size > 2 * 1024 * 1024) {
       toast.error("Image must be less than 2MB");
       return;
     }
 
     setUploading(true);
 
     try {
       const fileExt = file.name.split(".").pop();
       const fileName = `${user.id}/avatar.${fileExt}`;
 
       const { error: uploadError } = await supabase.storage
         .from("log-images")
         .upload(fileName, file, { upsert: true });
 
       if (uploadError) throw uploadError;
 
       const { data: { publicUrl } } = supabase.storage
         .from("log-images")
         .getPublicUrl(fileName);
 
       setAvatarUrl(publicUrl);
     } catch (error: any) {
       toast.error("Failed to upload image");
     } finally {
       setUploading(false);
     }
   };
 
   const handleComplete = async () => {
     if (!user) return;
 
     setSaving(true);
 
     try {
       const updates: { profile_completed: boolean; avatar_url?: string } = {
         profile_completed: true,
       };
 
       if (avatarUrl) {
         updates.avatar_url = avatarUrl;
       }
 
       const { error } = await supabase
         .from("profiles")
         .update(updates)
         .eq("user_id", user.id);
 
       if (error) throw error;
 
       toast.success("Profile completed!");
       navigate("/");
     } catch (error: any) {
       toast.error("Failed to save profile");
     } finally {
       setSaving(false);
     }
   };
 
   const handleSkip = async () => {
     if (!user) return;
 
     setSaving(true);
     try {
       await supabase
         .from("profiles")
         .update({ profile_completed: true })
         .eq("user_id", user.id);
       navigate("/");
     } finally {
       setSaving(false);
     }
   };
 
   if (profileLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex items-center justify-center p-4">
       <div className="w-full max-w-md">
         {/* Logo */}
         <div className="text-center mb-8">
           <div className="inline-flex items-center gap-2">
             <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center glow-primary">
               <Terminal className="w-5 h-5 text-primary-foreground" />
             </div>
             <span className="text-2xl font-bold text-foreground">CommitLog</span>
           </div>
         </div>
 
         {/* Card */}
         <div className="bg-card border border-border rounded-xl p-6 shadow-lg text-center">
           <h1 className="text-xl font-semibold text-foreground mb-2">
             Add a profile picture
           </h1>
           <p className="text-muted-foreground text-sm mb-6">
             Help others recognize you in the community
           </p>
 
           {/* Avatar Upload */}
           <div className="flex justify-center mb-6">
             <label className="cursor-pointer group relative">
               <Avatar className="w-24 h-24 avatar-ring">
                 <AvatarImage src={avatarUrl || profile?.avatar_url || undefined} />
                 <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                   {profile?.username?.charAt(0).toUpperCase() || "U"}
                 </AvatarFallback>
               </Avatar>
               <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                 {uploading ? (
                   <Loader2 className="w-6 h-6 text-white animate-spin" />
                 ) : (
                   <Camera className="w-6 h-6 text-white" />
                 )}
               </div>
               <input
                 type="file"
                 accept="image/*"
                 onChange={handleAvatarChange}
                 className="hidden"
                 disabled={uploading}
               />
             </label>
           </div>
 
           <div className="space-y-3">
             <Button
               onClick={handleComplete}
               disabled={saving}
               className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
             >
               {saving ? (
                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
               ) : (
                 <ArrowRight className="w-4 h-4 mr-2" />
               )}
               Continue
             </Button>
             <Button
               variant="ghost"
               onClick={handleSkip}
               disabled={saving}
               className="w-full text-muted-foreground"
             >
               Skip for now
             </Button>
           </div>
         </div>
       </div>
     </div>
   );
 }