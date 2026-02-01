import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ActionDialog } from "@/components/admin/ActionDialog";
import { useAdminUsers, useAdminActions, AdminUser } from "@/hooks/useAdmin";
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
import { Loader2, Ban, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function AdminUsers() {
  const { users, loading, refetch } = useAdminUsers();
  const { suspendUser, unsuspendUser } = useAdminActions();
  
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "unsuspend" | null>(null);

  const handleSuspend = async (reason: string) => {
    if (!selectedUser) return;
    const { error } = await suspendUser(selectedUser.user_id, selectedUser.id, reason);
    if (error) {
      toast.error("Failed to suspend user");
    } else {
      toast.success("User suspended");
      refetch();
    }
  };

  const handleUnsuspend = async (reason: string) => {
    if (!selectedUser) return;
    const { error } = await unsuspendUser(selectedUser.id, reason);
    if (error) {
      toast.error("Failed to unsuspend user");
    } else {
      toast.success("User unsuspended");
      refetch();
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
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">Manage user accounts</p>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.display_name || user.username}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    @{user.username}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.last_login_at 
                      ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                      : "Never"
                    }
                  </TableCell>
                  <TableCell>
                    {user.suspended_at ? (
                      <Badge variant="destructive" className="text-xs">
                        Suspended
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.suspended_at ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionType("unsuspend");
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Unsuspend
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionType("suspend");
                        }}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ActionDialog
        open={actionType === "suspend"}
        onOpenChange={(open) => !open && setActionType(null)}
        title="Suspend User"
        description={`Are you sure you want to suspend @${selectedUser?.username}? This will prevent them from accessing the platform.`}
        actionLabel="Suspend User"
        variant="destructive"
        onConfirm={handleSuspend}
      />

      <ActionDialog
        open={actionType === "unsuspend"}
        onOpenChange={(open) => !open && setActionType(null)}
        title="Unsuspend User"
        description={`This will restore @${selectedUser?.username}'s access to the platform.`}
        actionLabel="Unsuspend User"
        onConfirm={handleUnsuspend}
      />
    </AdminLayout>
  );
}
