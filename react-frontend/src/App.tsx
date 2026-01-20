import React from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ContactsPage } from "./pages/contacts/ContactsPage";
import { MessagesPage } from "./pages/messages/MessagesPage";
import { AppsPage } from "./pages/apps/AppsPage";
import { PrivacyNoticePage } from "./pages/privacy-notice/PrivacyNoticePage";
import { RightsPage } from "./pages/rights/RightsPage";
import { QuestionnairePage } from "./pages/questionnaire/QuestionnairePage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/privacy-notice" element={<PrivacyNoticePage />} />
        <Route path="/rights" element={<RightsPage />} />
        <Route path="/questionnaire" element={<QuestionnairePage />} />
      </Route>
      <Route
        path="*"
        element={
          <div className="container">
            <div className="card">
              <h2>Not found</h2>
              <p className="muted">This page does not exist.</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
