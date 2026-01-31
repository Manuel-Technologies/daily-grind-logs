import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string;
  initialContent: string;
  onSaved: () => void;
}

export function EditLogDialog({ open, onOpenChange, logId, initialContent, onSaved }: EditLogDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("logs")
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq("id", logId);

      if (error) throw error;

      toast.success("Log updated!");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update log");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Log</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] bg-input border-border resize-none"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{content.length}/2000</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !content.trim()}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
