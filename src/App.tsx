import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import Activate from "./pages/auth/Activate";
import AccountHome from "./pages/auth/AccountHome";
import RequireAuth from "@/components/auth/RequireAuth";
import ProfilePage from "./pages/auth/ProfilePage";
import SecurityPage from "./pages/auth/SecurityPage";
import SignUpPage from "./pages/auth/SignUpPage";
import SignInPage from "./pages/auth/SignInPage";
import PasswordResetComplete from "./pages/auth/PasswordResetComplete";
import PasswordResetRequest from "./pages/auth/PasswordResetRequest";

const queryClient = new QueryClient();

/** Older links still point at /login; forward them to /signin with their target and state intact. */
function LoginForward() {
  const [params] = useSearchParams();
  const location = useLocation();
  const target = params.get("redirect");
  const safe = target && target.startsWith("/") && !target.startsWith("//") ? target : null;
  const to = safe ? `/signin?redirect=${encodeURIComponent(safe)}` : "/signin";
  return <Navigate to={to} replace state={location.state} />;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
    {/* BrowserRouter wraps the other providers so anything added below it can use Link,
        useNavigate and useLocation. Nesting it innermost puts every provider outside the
        router, where those hooks throw. Add new providers inside it; keep Routes last. */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Routes>
            {/* The player requires an account, so every visitor is counted: a signed-out
                arrival is sent to /signup, with a clear link over to /signin for regulars. */}
            <Route path="/" element={<RequireAuth redirectTo="/signup"><Index /></RequireAuth>} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/auth/activate" element={<Activate />} />
            <Route path="/account" element={<RequireAuth><AccountHome /></RequireAuth>} />
            <Route path="/account/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/account/security" element={<RequireAuth><SecurityPage /></RequireAuth>} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/login" element={<LoginForward />} />
            <Route path="/auth/reset/complete" element={<PasswordResetComplete />} />
            <Route path="/auth/reset" element={<PasswordResetRequest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
