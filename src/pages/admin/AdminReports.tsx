import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ActionDialog } from "@/components/admin/ActionDialog";
import { useAdminReports, useAdminActions, Report } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate_content: "Inappropriate Content",
  misinformation: "Misinformation",
  self_harm: "Self Harm",
  other: "Other",
};

export default function AdminReports() {
  const { reports, loading, refetch } = useAdminReports();
  const { resolveReport, dismissReport } = useAdminActions();
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<"resolve" | "dismiss" | null>(null);

  const handleAction = async (notes: string) => {
    if (!selectedReport || !actionType) return;

    let result;
    if (actionType === "resolve") {
      result = await resolveReport(selectedReport.id, notes);
    } else {
      result = await dismissReport(selectedReport.id, notes);
    }

    if (result?.error) {
      toast.error("Action failed");
    } else {
      toast.success(actionType === "resolve" ? "Report resolved" : "Report dismissed");
      refetch();
    }
  };

  const pendingReports = reports.filter(r => r.status === "pending");
  const resolvedReports = reports.filter(r => r.status === "resolved" || r.status === "dismissed");

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const renderReportsTable = (reportsList: Report[], showActions: boolean) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reporter</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="w-[30%]">Post Preview</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Reported</TableHead>
            {!showActions && <TableHead>Resolution</TableHead>}
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportsList.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="text-sm">
                @{report.reporter?.username || "unknown"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {reasonLabels[report.reason] || report.reason}
                </Badge>
              </TableCell>
              <TableCell>
                <p className="text-sm truncate max-w-xs text-muted-foreground">
                  {report.log?.content || "Post deleted"}
                </p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {report.details || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
              </TableCell>
              {!showActions && (
                <TableCell>
                  <div className="space-y-1">
                    <Badge 
                      variant={report.status === "resolved" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {report.status}
                    </Badge>
                    {report.resolution_notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {report.resolution_notes}
                      </p>
                    )}
                  </div>
                </TableCell>
              )}
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setActionType("resolve");
                      }}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setActionType("dismiss");
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {reportsList.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 6} className="text-center text-muted-foreground py-8">
                No reports found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Review and resolve user reports</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {renderReportsTable(pendingReports, true)}
          </TabsContent>

          <TabsContent value="resolved" className="mt-4">
            {renderReportsTable(resolvedReports, false)}
          </TabsContent>
        </Tabs>
      </div>

      <ActionDialog
        open={actionType === "resolve"}
        onOpenChange={(open) => !open && setActionType(null)}
        title="Resolve Report"
        description="Mark this report as resolved and add resolution notes."
        actionLabel="Resolve"
        onConfirm={handleAction}
      />

      <ActionDialog
        open={actionType === "dismiss"}
        onOpenChange={(open) => !open && setActionType(null)}
        title="Dismiss Report"
        description="Dismiss this report as not actionable."
        actionLabel="Dismiss"
        onConfirm={handleAction}
      />
    </AdminLayout>
  );
}
