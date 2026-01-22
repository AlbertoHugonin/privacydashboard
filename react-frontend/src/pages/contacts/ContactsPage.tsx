import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { IoTApp, UserSummary } from "../../types/api";

export function ContactsPage() {
  const auth = useAuth();
  const [contacts, setContacts] = useState<UserSummary[]>([]);
  const [query, setQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
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

  const selectedContact = useMemo(() => {
    if (!selectedContactId) {
      return null;
    }
    return contacts.find((contact) => contact.id === selectedContactId) ?? null;
  }, [contacts, selectedContactId]);

  const selectedApps = selectedContactId ? appsByContactId[selectedContactId] : undefined;
  const selectedAppsLoading = selectedContactId
    ? !!appsLoadingByContactId[selectedContactId]
    : false;
  const selectedAppsError = selectedContactId ? appsErrorByContactId[selectedContactId] : undefined;

  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    void loadApps(contactId);
  };

  return (
    <div className="container">
      <h1>Contacts</h1>
      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card error">{error}</div> : null}
      {!loading && !error ? (
        <div className="master-detail">
          <div className="stack">
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
            ) : (
              <div className="cards-grid">
                {filteredContacts.map((contact) => {
                  const selected = contact.id === selectedContactId;
                  return (
                    <button
                      className={`card card-button${selected ? " selected" : ""}`}
                      key={contact.id}
                      onClick={() => {
                        if (selected) {
                          setSelectedContactId(null);
                          return;
                        }
                        selectContact(contact.id);
                      }}
                      type="button"
                    >
                      <div>
                        <strong>{contact.name}</strong>{" "}
                        <span className="muted">({contact.role})</span>
                      </div>
                      {contact.mail ? <div className="muted">{contact.mail}</div> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="side-panel">
            <div className="card side-panel-card">
              {!selectedContact ? (
                <div className="muted">Select a contact to see details.</div>
              ) : (
                <div className="stack">
                  <div className="panel-header">
                    <div>
                      <h2 style={{ margin: 0 }}>{selectedContact.name}</h2>
                      <div className="muted">{selectedContact.role}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn"
                        onClick={() => setSelectedContactId(null)}
                        type="button"
                      >
                        Close
                      </button>
                      <Link
                        className="btn btn-primary"
                        to={`/messages?contactId=${encodeURIComponent(selectedContact.id)}`}
                      >
                        Message
                      </Link>
                    </div>
                  </div>

                  {selectedContact.mail ? (
                    <div className="kv-grid">
                      <div className="kv-row">
                        <span className="muted">Email</span>
                        <span>{selectedContact.mail}</span>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <strong>Apps in common</strong>
                    <div style={{ height: 10 }} />
                    {selectedAppsLoading ? <div className="muted">Loading apps…</div> : null}
                    {selectedAppsError ? <div className="error">{selectedAppsError}</div> : null}
                    {selectedApps && selectedApps.length === 0 ? (
                      <div className="muted">No apps in common.</div>
                    ) : null}
                    {selectedApps && selectedApps.length ? (
                      <div className="chips">
                        {selectedApps.map((app) => (
                          <Link
                            className="chip"
                            key={app.id}
                            to={`/apps?appId=${encodeURIComponent(app.id)}`}
                          >
                            {app.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
