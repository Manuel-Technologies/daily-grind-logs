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

const MAX_IMAGES = 4;

export function CreateLogForm({ onLogCreated, onOptimisticAdd }: CreateLogFormProps) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        const maxSize = 2048;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          0.85
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    const availableSlots = MAX_IMAGES - imageFiles.length;
    const filesToAdd = Math.min(files.length, availableSlots);

    if (files.length > availableSlots) {
      toast.error(`You can only add ${availableSlots} more image${availableSlots !== 1 ? 's' : ''}`);
    }

    for (let i = 0; i < filesToAdd; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per image.`);
        continue;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setImageFiles((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    
    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const newPreviews = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  };

  const clearAllImages = () => {
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    const trimmedContent = content.trim();

    // Validate content length (max 50,000 characters for long articles)
    const MAX_CONTENT_LENGTH = 50000;
    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      toast.error(`Content is too long. Maximum ${MAX_CONTENT_LENGTH.toLocaleString()} characters allowed.`);
      return;
    }

    // Create optimistic log immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticLog: Log = {
      id: optimisticId,
      user_id: user.id,
      content: trimmedContent,
      image_url: imagePreviews[0] || null,
      image_urls: imagePreviews,
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
    const filesToUpload = [...imageFiles];
    clearAllImages();

    setLoading(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload all images
      for (const file of filesToUpload) {
        let fileToUpload = file;
        try {
          if (file.size > 1 * 1024 * 1024) {
            fileToUpload = await compressImage(file);
          }
        } catch (err) {
          console.warn("Image compression failed, using original");
        }

        const fileExt = fileToUpload.name.split(".").pop() || "jpg";
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("log-images")
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("log-images").getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      const { data: logData, error } = await supabase
        .from("logs")
        .insert({
          user_id: user.id,
          content: trimmedContent,
          image_url: uploadedUrls[0] || null,
          image_urls: uploadedUrls,
        })
        .select()
        .single();

      if (error) throw error;

      // Extract mentions and create notifications
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const mentions = trimmedContent.match(mentionRegex);

      if (mentions && logData) {
        const usernames = mentions.map((m) => m.slice(1));
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
      onLogCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to post log");
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

      {imagePreviews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="h-24 w-24 rounded-lg object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <label
            className={`cursor-pointer transition-colors ${
              imageFiles.length >= MAX_IMAGES
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              disabled={imageFiles.length >= MAX_IMAGES}
            />
            <ImagePlus className="w-5 h-5" />
          </label>
          <span className="text-xs text-muted-foreground">
            {content.length.toLocaleString()} chars
            {imageFiles.length > 0 && ` · ${imageFiles.length}/${MAX_IMAGES} images`}
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
