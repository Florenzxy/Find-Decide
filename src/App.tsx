import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { ApplicationListPage } from "./pages/ApplicationListPage";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ResumeLibraryPage } from "./pages/ResumeLibraryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OfferDecisionPage } from "./pages/OfferDecisionPage";
import { TodoDashboardPage } from "./pages/TodoDashboardPage";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/applications" replace />} />
        <Route path="/todos" element={<TodoDashboardPage />} />
        <Route path="/applications" element={<ApplicationListPage />} />
        <Route path="/applications/:applicationId" element={<ApplicationDetailPage />} />
        <Route path="/resumes" element={<ResumeLibraryPage />} />
        <Route path="/offers" element={<OfferDecisionPage />} />
        <Route path="/settings" element={<Navigate to="/settings/data" replace />} />
        <Route path="/settings/data" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
