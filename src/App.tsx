import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LifeUpdates from "./pages/LifeUpdates";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Summary from "./pages/Summary";
import Home from "./pages/Home";
import Chats from "./pages/Chats";
import Settings from "./pages/Settings";
import Profile from "./pages/settings/Profile";
import Integrations from "./pages/settings/Integrations";
import Notifications from "./pages/settings/Notifications";
import Privacy from "./pages/settings/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
          <Navbar />
          <div className="pt-20">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/life-updates" element={<LifeUpdates />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/chats" element={<Chats />} />
              <Route path="/home" element={<Home />} /> 
              <Route path="/settings" element={<Settings />}>
                <Route path="profile" element={<Profile />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="privacy" element={<Privacy />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;