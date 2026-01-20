import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { IoTApp, UserSummary } from "../../types/api";

export function ContactsPage() {
  const auth = useAuth();
  const [contacts, setContacts] = useState<UserSummary[]>([]);
  const [query, setQuery] = useState("");
  const [appsByContactId, setAppsByContactId] = useState<Record<string, IoTApp[] | undefined>>(
    {},
  );
  const [appsLoadingByContactId, setAppsLoadingByContactId] = useState<
    Record<string, boolean | undefined>
  >({});
  const [appsErrorByContactId, setAppsErrorByContactId] = useState<
    Record<string, string | undefined>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!auth.user) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await apiJson<UserSummary[]>(
          `/api/user/getAllContacts?userId=${encodeURIComponent(auth.user.id)}`,
        );
        setContacts(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load contacts");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auth.user]);

  const filteredContacts = useMemo(() => {
    if (!query.trim()) {
      return contacts;
    }
    const normalizedQuery = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      return (
        contact.name.toLowerCase().includes(normalizedQuery) ||
        contact.role.toLowerCase().includes(normalizedQuery) ||
        (contact.mail ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [contacts, query]);

  const loadApps = async (contactId: string) => {
    if (!auth.user) {
      return;
    }
    if (appsByContactId[contactId]) {
      return;
    }
    if (appsLoadingByContactId[contactId]) {
      return;
    }
    setAppsLoadingByContactId((prev) => ({ ...prev, [contactId]: true }));
    setAppsErrorByContactId((prev) => ({ ...prev, [contactId]: undefined }));
    try {
      const apps = await apiJson<IoTApp[]>(
        `/api/user/getCommonApps?otherUserId=${encodeURIComponent(contactId)}`,
      );
      setAppsByContactId((prev) => ({ ...prev, [contactId]: apps }));
    } catch (e) {
      setAppsErrorByContactId((prev) => ({
        ...prev,
        [contactId]: e instanceof Error ? e.message : "Failed to load apps",
      }));
    } finally {
      setAppsLoadingByContactId((prev) => ({ ...prev, [contactId]: false }));
    }
  };

  return (
    <div className="container">
      <h1>Contacts</h1>
      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card error">{error}</div> : null}
      {!loading && !error ? (
        <div className="list">
          <div className="card">
            <label className="field">
              <span>Search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, role, mail…"
              />
            </label>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="card muted">No contacts.</div>
          ) : null}

          {filteredContacts.map((contact) => (
            <details
              className="card details"
              key={contact.id}
              onToggle={(event) => {
                if ((event.currentTarget as HTMLDetailsElement).open) {
                  void loadApps(contact.id);
                }
              }}
            >
              <summary className="list-item">
                <div>
                  <div>
                    <strong>{contact.name}</strong>{" "}
                    <span className="muted">({contact.role})</span>
                  </div>
                  {contact.mail ? <div className="muted">{contact.mail}</div> : null}
                </div>
                <Link className="btn" to={`/messages?contactId=${encodeURIComponent(contact.id)}`}>
                  Message
                </Link>
              </summary>

              <div className="details-body">
                <strong>Apps in common</strong>
                {appsLoadingByContactId[contact.id] ? (
                  <div className="muted">Loading apps…</div>
                ) : null}
                {appsErrorByContactId[contact.id] ? (
                  <div className="error">{appsErrorByContactId[contact.id]}</div>
                ) : null}
                {appsByContactId[contact.id] && appsByContactId[contact.id]?.length === 0 ? (
                  <div className="muted">No apps in common.</div>
                ) : null}
                {appsByContactId[contact.id] && appsByContactId[contact.id]?.length ? (
                  <div className="list">
                    {appsByContactId[contact.id]?.map((app) => (
                      <Link
                        className="btn"
                        key={app.id}
                        to={`/apps?appId=${encodeURIComponent(app.id)}`}
                      >
                        {app.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}
