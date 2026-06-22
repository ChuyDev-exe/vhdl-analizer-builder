// SPDX-License-Identifier: MIT
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing";
import SimulatorPage from "./pages/Simulator";
import Dashboard from "./pages/Dashboard";
import PricingPage from "./pages/Pricing";
import SettingsPage from "./pages/Settings";
import AuthCallback from "./pages/Auth/Callback";
import BlogPage from "./pages/Blog";
import BlogPostPage from "./pages/Blog/Post";
import DocsPage from "./pages/Docs";
import GetStartedPage from "./pages/GetStarted";
import TermsPage from "./pages/Terms";
import PrivacyPage from "./pages/Privacy";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/simulator" element={<SimulatorPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/auth/:provider/callback" element={<AuthCallback />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
    </Routes>
  );
}
