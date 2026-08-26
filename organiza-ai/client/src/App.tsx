import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Settings from "@/pages/Settings";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import Calendar from "@/pages/Calendar";
import WeeklyReview from "@/pages/WeeklyReview";
import Group from "@/pages/Group";
import Submodule from "@/pages/Submodule";
import Feedback from "@/pages/Feedback";
import AuthPage from "@/pages/AuthPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/feedback"} component={Feedback} />
      <Route path={"/calendar"} component={Calendar} />
      <Route path={"/weekly-review"} component={WeeklyReview} />
      <Route path={"/groups/:id/module/:moduleSlug"} component={Submodule} />
      <Route path={"/groups/:id"} component={Group} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/reset-password"} component={AuthPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
