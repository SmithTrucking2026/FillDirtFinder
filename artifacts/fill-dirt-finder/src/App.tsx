import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import PitsDirectory from "@/pages/pits/index";
import NewPit from "@/pages/pits/new";
import EditPit from "@/pages/pits/edit";
import BulkPitsEditor from "@/pages/pits/bulk";
import SettingsPage from "@/pages/settings";
import QuotesPage from "@/pages/quotes";
import NotFound from "@/pages/not-found";
import { CurrentUserProvider } from "@/contexts/current-user";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/pits" component={PitsDirectory} />
      <Route path="/pits/new" component={NewPit} />
      <Route path="/pits/bulk" component={BulkPitsEditor} />
      <Route path="/pits/:id/edit" component={EditPit} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CurrentUserProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </CurrentUserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
