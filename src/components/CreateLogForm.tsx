import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Log } from "@/types";
import { MentionInput } from "./MentionInput";

interface CreateLogFormProps {
  onLogCreated: () => void;
  onOptimisticAdd?: (log: Log) => void;
}

export function CreateLogForm({ onLogCreated, onOptimisticAdd }: CreateLogFormProps) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    const trimmedContent = content.trim();
    
    // Create optimistic log immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticLog: Log = {
      id: optimisticId,
      user_id: user.id,
      content: trimmedContent,
      image_url: imagePreview, // Show local preview
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      edited_at: null,
      profiles: profile || undefined,
      likes_count: 0,
      comments_count: 0,
      relogs_count: 0,
      user_has_liked: false,
      user_has_relogged: false,
    };

    // Add optimistically to feed
    if (onOptimisticAdd) {
      onOptimisticAdd(optimisticLog);
    }

    // Clear form immediately for better UX
    setContent("");
    const hadImage = !!imageFile;
    const imageToUpload = imageFile;
    removeImage();

    setLoading(true);

    try {
      let imageUrl = null;

      if (hadImage && imageToUpload) {
        const fileExt = imageToUpload.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("log-images")
          .upload(fileName, imageToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("log-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { data: logData, error } = await supabase.from("logs").insert({
        user_id: user.id,
        content: trimmedContent,
        image_url: imageUrl,
      }).select().single();

      if (error) throw error;

      // Extract mentions and create notifications
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const mentions = trimmedContent.match(mentionRegex);
      
      if (mentions && logData) {
        const usernames = mentions.map(m => m.slice(1));
        const { data: mentionedUsers } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("username", usernames);

        if (mentionedUsers) {
          for (const mentionedUser of mentionedUsers) {
            if (mentionedUser.user_id !== user.id) {
              // Create mention record
              await supabase.from("mentions").insert({
                log_id: logData.id,
                user_id: mentionedUser.user_id,
              });
              // Create notification
              await supabase.from("notifications").insert({
                user_id: mentionedUser.user_id,
                actor_id: user.id,
                type: "mention",
                log_id: logData.id,
              });
            }
          }
        }
      }

      toast.success("Log posted!");
      // Refetch to get the real data (with proper ID, image URL, etc.)
      onLogCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to post log");
      // Could restore the form content here if needed
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <p className="text-muted-foreground">Sign in to post your daily log</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4">
      <MentionInput
        value={content}
        onChange={setContent}
        placeholder="What did you work on today? Use @ to mention others..."
      />

      {imagePreview && (
        <div className="relative mt-3 inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-48 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <ImagePlus className="w-5 h-5" />
          </label>
          <span className="text-xs text-muted-foreground">
            {content.length.toLocaleString()} chars
          </span>
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || loading}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            "Post Log"
          )}
        </Button>
      </div>
    </form>
  );
}
