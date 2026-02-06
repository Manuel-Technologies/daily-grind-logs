import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminContent from "./pages/admin/AdminContent";
import AdminReports from "./pages/admin/AdminReports";
import AdminAudit from "./pages/admin/AdminAudit";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { Loader2 } from "lucide-react";
 import PostDetail from "./pages/PostDetail";
 import CompleteProfile from "./pages/CompleteProfile";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children, skipProfileCheck = false }: { children: React.ReactNode; skipProfileCheck?: boolean }) {
  const { user, loading, needsProfileCompletion } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  // Redirect to complete profile if needed (but not on the complete-profile page itself)
  if (needsProfileCompletion && !skipProfileCheck) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}

// Public route that redirects authenticated users
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/landing" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
      <Route path="/auth" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
      
      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
       <Route path="/post/:logId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
       <Route path="/complete-profile" element={<ProtectedRoute skipProfileCheck><CompleteProfile /></ProtectedRoute>} />
      
      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><AdminUsers /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/content" element={<ProtectedRoute><AdminRoute><AdminContent /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><AdminRoute><AdminReports /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute><AdminRoute><AdminAudit /></AdminRoute></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
