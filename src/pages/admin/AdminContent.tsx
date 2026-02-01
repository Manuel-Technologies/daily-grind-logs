import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ActionDialog } from "@/components/admin/ActionDialog";
import { useAdminLogs, useAdminActions, AdminLog } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Eye, EyeOff, Trash2, RotateCcw, Lock, Unlock, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type ActionType = "hide" | "unhide" | "delete" | "restore" | "lock" | "unlock";

export default function AdminContent() {
  const { logs, loading, refetch } = useAdminLogs();
  const { hidePost, unhidePost, softDeletePost, restorePost, lockComments, unlockComments } = useAdminActions();
  
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const handleAction = async (reason: string) => {
    if (!selectedLog || !actionType) return;

    let result;
    switch (actionType) {
      case "hide":
        result = await hidePost(selectedLog.id, reason);
        break;
      case "unhide":
        result = await unhidePost(selectedLog.id, reason);
        break;
      case "delete":
        result = await softDeletePost(selectedLog.id, reason);
        break;
      case "restore":
        result = await restorePost(selectedLog.id, reason);
        break;
      case "lock":
        result = await lockComments(selectedLog.id, reason);
        break;
      case "unlock":
        result = await unlockComments(selectedLog.id, reason);
        break;
    }

    if (result?.error) {
      toast.error("Action failed");
    } else {
      toast.success("Action completed");
      refetch();
    }
  };

  const getActionTitle = () => {
    switch (actionType) {
      case "hide": return "Hide Post";
      case "unhide": return "Unhide Post";
      case "delete": return "Delete Post";
      case "restore": return "Restore Post";
      case "lock": return "Lock Comments";
      case "unlock": return "Unlock Comments";
      default: return "";
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case "hide": return "This will hide the post from public view.";
      case "unhide": return "This will make the post visible again.";
      case "delete": return "This will soft-delete the post. It can be restored later.";
      case "restore": return "This will restore the deleted post.";
      case "lock": return "This will prevent new comments on this post.";
      case "unlock": return "This will allow comments on this post again.";
      default: return "";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content</h1>
          <p className="text-muted-foreground">Moderate posts and content</p>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead className="w-[40%]">Content</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={log.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {log.profiles?.username?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">@{log.profiles?.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm truncate max-w-md">{log.content}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {log.deleted_at && (
                        <Badge variant="destructive" className="text-xs">Deleted</Badge>
                      )}
                      {log.hidden_at && !log.deleted_at && (
                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      )}
                      {log.comments_locked && (
                        <Badge variant="outline" className="text-xs">Locked</Badge>
                      )}
                      {!log.deleted_at && !log.hidden_at && !log.comments_locked && (
                        <Badge variant="secondary" className="text-xs">Normal</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(log.reports_count || 0) > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        <Flag className="w-3 h-3 mr-1" />
                        {log.reports_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {log.hidden_at ? (
                          <DropdownMenuItem onClick={() => {
                            setSelectedLog(log);
                            setActionType("unhide");
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Unhide
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => {
                            setSelectedLog(log);
                            setActionType("hide");
                          }}>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide
                          </DropdownMenuItem>
                        )}
                        
                        {log.deleted_at ? (
                          <DropdownMenuItem onClick={() => {
                            setSelectedLog(log);
                            setActionType("restore");
                          }}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedLog(log);
                              setActionType("delete");
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                        
                        {log.comments_locked ? (
                          <DropdownMenuItem onClick={() => {
                            setSelectedLog(log);
                            setActionType("unlock");
                          }}>
                            <Unlock className="w-4 h-4 mr-2" />
                            Unlock Comments
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => {
                            setSelectedLog(log);
                            setActionType("lock");
                          }}>
                            <Lock className="w-4 h-4 mr-2" />
                            Lock Comments
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No posts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ActionDialog
        open={actionType !== null}
        onOpenChange={(open) => !open && setActionType(null)}
        title={getActionTitle()}
        description={getActionDescription()}
        actionLabel={getActionTitle()}
        variant={actionType === "delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </AdminLayout>
  );
}
