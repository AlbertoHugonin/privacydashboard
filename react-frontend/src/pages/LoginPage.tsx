import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const demoAccounts = [
  {
    title: "Data Subject (SUBJECT)",
    username: "UserSubject",
    password: "UserSubject",
    capabilities: [
      "Vede le proprie app installate e i consensi associati; può accettare/revocare consensi.",
      "Vede i contatti (Controller/DPO) legati alle app e può inviare/ricevere messaggi.",
      "Visualizza e scarica i Privacy Notice delle app.",
      "Invia richieste GDPR e ne vede stato/risposte.",
      "Riceve notifiche (messaggi, aggiornamenti privacy notice, aggiornamenti richieste).",
    ],
  },
  {
    title: "Data Controller (CONTROLLER)",
    username: "UserController",
    password: "UserController",
    capabilities: [
      "Vede le app associate e i contatti collegati (Subjects/DPO/Controllers).",
      "Invia/riceve messaggi con i contatti associati alle app.",
      "Gestisce le richieste GDPR ricevute (risposta + stato pending/handled).",
      "Compila/aggiorna il questionario GDPR per le proprie app e visualizza la valutazione.",
      "Crea/aggiorna i Privacy Notice delle proprie app (da zero / template / upload).",
    ],
  },
  {
    title: "Data Protection Officer (DPO)",
    username: "UserDPO",
    password: "UserDPO",
    capabilities: [
      "Vede le app associate e i contatti collegati (Subjects/Controllers/DPO).",
      "Invia/riceve messaggi con i contatti associati alle app.",
      "Gestisce le richieste GDPR ricevute (risposta + stato pending/handled).",
      "Compila/aggiorna il questionario GDPR per le proprie app e visualizza la valutazione.",
      "Crea/aggiorna i Privacy Notice delle proprie app (da zero / template / upload).",
    ],
  },
] as const;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await auth.login(username, password);
      const from = (location.state as { from?: Location } | null)?.from;
      navigate(from?.pathname ?? "/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Login</h1>
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn btn-primary" disabled={submitting} type="submit">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Account demo</h2>
        <p className="muted">
          Questi utenti vengono creati all'avvio (vedi anche <code>README.md</code>).
        </p>
        <div className="list">
          {demoAccounts.map((account) => (
            <div className="card" key={account.username}>
              <strong>{account.title}</strong>
              <div style={{ height: 8 }} />
              <div className="muted">
                user=<code>{account.username}</code> password=<code>{account.password}</code>
              </div>
              <div style={{ height: 10 }} />
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {account.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Nota: altri utenti demo possono essere generati; in quel caso la password è uguale allo username.
        </p>
      </div>
    </div>
  );
}
