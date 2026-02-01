import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuditLogs } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  suspend_user: { label: "Suspend User", variant: "destructive" },
  unsuspend_user: { label: "Unsuspend User", variant: "default" },
  hide_post: { label: "Hide Post", variant: "secondary" },
  unhide_post: { label: "Unhide Post", variant: "default" },
  soft_delete_post: { label: "Delete Post", variant: "destructive" },
  restore_post: { label: "Restore Post", variant: "default" },
  lock_comments: { label: "Lock Comments", variant: "secondary" },
  unlock_comments: { label: "Unlock Comments", variant: "default" },
  resolve_report: { label: "Resolve Report", variant: "default" },
  dismiss_report: { label: "Dismiss Report", variant: "secondary" },
  grant_role: { label: "Grant Role", variant: "default" },
  revoke_role: { label: "Revoke Role", variant: "destructive" },
};

export default function AdminAudit() {
  const { auditLogs, loading } = useAuditLogs();

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
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground">Read-only record of all admin actions</p>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => {
                const actionInfo = actionLabels[log.action_type] || { 
                  label: log.action_type, 
                  variant: "outline" as const 
                };
                
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-sm">
                      @{log.admin?.username || "unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionInfo.variant} className="text-xs">
                        {actionInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {log.target_entity}/{log.target_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {log.reason || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {auditLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
