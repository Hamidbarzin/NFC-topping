import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import Home from "./pages/home";
import CardScan from "./pages/card-scan";
import Activate from "./pages/activate";
import Register from "./pages/register";
import PublicProfile from "./pages/public-profile";
import Dashboard from "./pages/dashboard";
import EditProfile from "./pages/edit-profile";
import Login from "./pages/login";
import Admin from "./pages/admin";
import Layout from "./components/layout";
import { isLoginEnabled } from "./config";

setAuthTokenGetter(() => localStorage.getItem("nfc_token"));

const queryClient = new QueryClient();

// Protected route component wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem("nfc_token");

  if (!token) {
    setLocation(isLoginEnabled() ? "/login" : "/");
    return null;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/card/:code" component={CardScan} />
      <Route path="/activate/:code" component={Activate} />
      <Route path="/u/:username" component={PublicProfile} />
      <Route path="/login">{() => (isLoginEnabled() ? <Login /> : <Redirect to="/" />)}</Route>
      <Route path="/register" component={Register} />
      
      {/* Protected Routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/edit-profile"><ProtectedRoute component={EditProfile} /></Route>
      <Route path="/admin"><ProtectedRoute component={Admin} /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
