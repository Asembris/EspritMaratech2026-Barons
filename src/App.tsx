import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AccessibilityProvider } from "@/hooks/use-accessibility";
import { GestureProvider } from "@/context/GestureContext";
import Index from "./pages/Index";
import BankingPage from "./pages/Banking";
import ShoppingPage from "./pages/Shopping";
import AccessibilityPage from "./pages/Accessibility";
import TranslatePage from "./pages/Translate";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";
import { VoiceCommandButton } from "@/components/VoiceCommandButton";
import AssistantChat from "@/components/omar/AssistantChat";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AccessibilityProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GestureProvider>
            {/* 🔊 Global voice command layer (all pages) */}
            <VoiceCommandButton />
            {/* 🤖 Omar's AI Assistant Chat */}
            <AssistantChat />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/banking" element={<BankingPage />} />
              <Route path="/shopping" element={<ShoppingPage />} />
              <Route path="/accessibility" element={<AccessibilityPage />} />
              <Route path="/translate" element={<TranslatePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </GestureProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AccessibilityProvider>
  </QueryClientProvider>
);

export default App;

