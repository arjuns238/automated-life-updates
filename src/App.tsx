import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LifeUpdates from "./pages/LifeUpdates";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Summary from "./pages/Summary";
import Chats from "./pages/Chats";
import Settings from "./pages/Settings";
import Timeline from "./pages/Timeline";
import Home from "./pages/Home";
import ThisMonthWrap from "./pages/ThisMonthWrap";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const AppShell = () => {
  return (
    <>
      <div className="pt-0 pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-0">
        <Routes>
          <Route
            path="/life-updates"
            element={
              <ProtectedRoute>
                <LifeUpdates />
              </ProtectedRoute>
            }
          />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/summary"
            element={
              <ProtectedRoute>
                <Summary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Navigate to="/this-month" replace />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/sign-up" replace />} />
          <Route
            path="/timeline"
            element={
              <ProtectedRoute>
                <Timeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wrap"
            element={
              <ProtectedRoute>
                <ThisMonthWrap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/this-month"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <BottomNav />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
