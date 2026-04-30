import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import PublicProfile from "@/pages/public-profile";
import NfcCardEntry from "@/pages/nfc-card";
import SetupCardPage from "@/pages/setup-card";
import ClientAccessPage from "@/pages/client-access";
import CardSettingsPage from "@/pages/card-settings";
import AdminLayout from "@/components/admin-layout";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCards from "@/pages/admin/cards";
import AdminNfcCardsPage from "@/pages/admin/nfc-cards";
import CardForm from "@/pages/admin/card-form";
import CardAnalytics from "@/pages/admin/card-analytics";
import AdminCrmPage from "@/pages/admin/crm";

const queryClient = new QueryClient();

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin/cards/new" component={CardForm} />
        <Route path="/admin/cards/:id/analytics" component={CardAnalytics} />
        <Route path="/admin/cards/:id" component={CardForm} />
        <Route path="/admin/cards" component={AdminCards} />
        <Route path="/admin/nfc-cards" component={AdminNfcCardsPage} />
        <Route path="/admin/crm" component={AdminCrmPage} />
        <Route path="/admin" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/setup/:cardCode" component={SetupCardPage} />
      <Route path="/settings/:cardCode" component={ClientAccessPage} />
      <Route path="/c/:cardCode" component={NfcCardEntry} />
      <Route path="/u/:slug" component={PublicProfile} />
      <Route path="/client-access/:accessToken" component={ClientAccessPage} />
      <Route path="/admin/*" component={AdminRoutes} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/landing" component={Landing} />
      <Route path="/" component={Landing} />
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
