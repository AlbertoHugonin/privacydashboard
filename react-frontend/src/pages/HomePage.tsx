import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const auth = useAuth();
  const showQuestionnaire =
    auth.user?.role === "CONTROLLER" || auth.user?.role === "DPO";

  return (
    <div className="container">
      <h1>Home</h1>
      <div className="grid">
        <Link className="card" to="/notifications">
          <h3>Notifications</h3>
          <p className="muted">Messages and updates.</p>
        </Link>
        <Link className="card" to="/contacts">
          <h3>Contacts</h3>
          <p className="muted">Your contact list.</p>
        </Link>
        <Link className="card" to="/messages">
          <h3>Messages</h3>
          <p className="muted">Conversations and chat.</p>
        </Link>
        <Link className="card" to="/apps">
          <h3>Apps</h3>
          <p className="muted">Your applications.</p>
        </Link>
        <Link className="card" to="/privacy-notice">
          <h3>Privacy Notice</h3>
          <p className="muted">Read app privacy notices.</p>
        </Link>
        <Link className="card" to="/rights">
          <h3>Rights</h3>
          <p className="muted">Right requests.</p>
        </Link>
        {showQuestionnaire ? (
          <Link className="card" to="/questionnaire">
            <h3>Questionnaire</h3>
            <p className="muted">GDPR compliance checks.</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
