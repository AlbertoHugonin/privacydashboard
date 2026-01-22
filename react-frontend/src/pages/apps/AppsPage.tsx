import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiJson, apiPostJson, apiText } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { IoTApp, UserAppRelation, UserSummary } from "../../types/api";

type AppPeople = {
  controllers?: UserSummary[];
  dpos?: UserSummary[];
  subjects?: UserSummary[];
  relation?: UserAppRelation;
  loading?: boolean;
  error?: string;
  updatingConsent?: string;
  updatingAllConsents?: boolean;
  removingEverything?: boolean;
};

export function AppsPage() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const openAppIdFromUrl = searchParams.get("appId");
  const [apps, setApps] = useState<IoTApp[]>([]);
  const [query, setQuery] = useState("");
  const [openAppId, setOpenAppId] = useState<string | null>(openAppIdFromUrl);
  const [appPeopleByAppId, setAppPeopleByAppId] = useState<Record<string, AppPeople>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canSeeSubjects = auth.user?.role === "CONTROLLER" || auth.user?.role === "DPO";
  const isSubject = auth.user?.role === "SUBJECT";

  useEffect(() => {
    const load = async () => {
      if (!auth.user) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await apiJson<IoTApp[]>(
          `/api/user/getApps?userId=${encodeURIComponent(auth.user.id)}`,
        );
        setApps(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load apps");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auth.user]);

  useEffect(() => {
    setOpenAppId(openAppIdFromUrl);
  }, [openAppIdFromUrl]);

  const filteredApps = useMemo(() => {
    if (!query.trim()) {
      return apps;
    }
    const normalizedQuery = query.trim().toLowerCase();
    return apps.filter((app) => {
      return (
        app.name.toLowerCase().includes(normalizedQuery) ||
        (app.description ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [apps, query]);

  const selectedApp = useMemo(() => {
    if (!openAppId) {
      return null;
    }
    return apps.find((app) => app.id === openAppId) ?? null;
  }, [apps, openAppId]);

  const loadPeople = async (app: IoTApp) => {
    if (!auth.user) {
      return;
    }
    const existing = appPeopleByAppId[app.id];
    if (existing?.loading) {
      return;
    }
    if (existing?.controllers && existing?.dpos && (!isSubject ? existing?.subjects : true) && existing?.relation) {
      return;
    }

    setAppPeopleByAppId((prev) => ({
      ...prev,
      [app.id]: { ...prev[app.id], loading: true, error: undefined },
    }));

    try {
      const [controllers, dpos, relation] = await Promise.all([
        apiJson<UserSummary[]>(
          `/api/app/getControllers?appId=${encodeURIComponent(app.id)}`,
        ),
        apiJson<UserSummary[]>(`/api/app/getDPOs?appId=${encodeURIComponent(app.id)}`),
        apiJson<UserAppRelation>(
          `/api/userapprelation/get?userId=${encodeURIComponent(auth.user.id)}&appId=${encodeURIComponent(app.id)}`,
        ),
      ]);

      const subjects = canSeeSubjects
        ? await apiJson<UserSummary[]>(
            `/api/app/getSubjects?appId=${encodeURIComponent(app.id)}`,
          )
        : undefined;

      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: {
          ...prev[app.id],
          controllers,
          dpos,
          subjects,
          relation,
          loading: false,
          error: undefined,
        },
      }));
    } catch (e) {
      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: {
          ...prev[app.id],
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load app details",
        },
      }));
    }
  };

  const selectApp = (app: IoTApp) => {
    setOpenAppId(app.id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("appId", app.id);
      return next;
    });
    void loadPeople(app);
  };

  const closePanel = () => {
    setOpenAppId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("appId");
      return next;
    });
  };

  useEffect(() => {
    if (openAppIdFromUrl) {
      const app = apps.find((candidate) => candidate.id === openAppIdFromUrl);
      if (app) {
        void loadPeople(app);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAppIdFromUrl, apps, auth.user]);

  const reloadRelation = async (appId: string) => {
    if (!auth.user) {
      return;
    }
    const relation = await apiJson<UserAppRelation>(
      `/api/userapprelation/get?userId=${encodeURIComponent(auth.user.id)}&appId=${encodeURIComponent(appId)}`,
    );
    setAppPeopleByAppId((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], relation },
    }));
  };

  const updateConsent = async (app: IoTApp, consent: string, action: "accept" | "withdraw") => {
    if (!auth.user) {
      return;
    }
    setAppPeopleByAppId((prev) => ({
      ...prev,
      [app.id]: { ...prev[app.id], updatingConsent: consent, error: undefined },
    }));

    try {
      if (action === "accept") {
        await apiText(
          `/api/userapprelation/addConsenses?userId=${encodeURIComponent(auth.user.id)}&appId=${encodeURIComponent(app.id)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consenses: [consent] }),
          },
        );
      } else {
        await apiText(
          `/api/userapprelation/removeConsenses?userId=${encodeURIComponent(auth.user.id)}&appId=${encodeURIComponent(app.id)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consenses: [consent] }),
          },
        );

        await apiPostJson("/api/rightrequest/add", {
          senderId: auth.user.id,
          appId: app.id,
          rightType: "WITHDRAWCONSENT",
          other: consent,
        });
      }

      await reloadRelation(app.id);
    } catch (e) {
      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: {
          ...prev[app.id],
          error: e instanceof Error ? e.message : "Failed to update consent",
        },
      }));
    } finally {
      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: { ...prev[app.id], updatingConsent: undefined },
      }));
    }
  };

  const withdrawAllConsents = async (app: IoTApp) => {
    if (!auth.user) {
      return;
    }
    setAppPeopleByAppId((prev) => ({
      ...prev,
      [app.id]: { ...prev[app.id], updatingAllConsents: true, error: undefined },
    }));

    try {
      await apiText(
        `/api/userapprelation/removeAllConsenses?userId=${encodeURIComponent(auth.user.id)}&appId=${encodeURIComponent(app.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      await reloadRelation(app.id);
    } catch (e) {
      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: {
          ...prev[app.id],
          error: e instanceof Error ? e.message : "Failed to withdraw all consents",
        },
      }));
    } finally {
      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: { ...prev[app.id], updatingAllConsents: false },
      }));
    }
  };

  const removeEverything = async (app: IoTApp) => {
    if (!auth.user) {
      return;
    }
    setAppPeopleByAppId((prev) => ({
      ...prev,
      [app.id]: { ...prev[app.id], removingEverything: true, error: undefined },
    }));

    try {
      await apiPostJson("/api/rightrequest/add", {
        senderId: auth.user.id,
        appId: app.id,
        rightType: "DELTEEVERYTHING",
      });
    } catch (e) {
      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: {
          ...prev[app.id],
          error: e instanceof Error ? e.message : "Failed to send request",
        },
      }));
    } finally {
      setAppPeopleByAppId((prev) => ({
        ...prev,
        [app.id]: { ...prev[app.id], removingEverything: false },
      }));
    }
  };

  return (
    <div className="container">
      <h1>Apps</h1>
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
                  placeholder="Name, description…"
                />
              </label>
            </div>

            {filteredApps.length === 0 ? <div className="card muted">No apps.</div> : null}

            {filteredApps.length ? (
              <div className="cards-grid">
                {filteredApps.map((app) => {
                  const selected = app.id === openAppId;
                  return (
                    <button
                      className={`card card-button${selected ? " selected" : ""}`}
                      key={app.id}
                      onClick={() => {
                        if (selected) {
                          closePanel();
                          return;
                        }
                        selectApp(app);
                      }}
                      type="button"
                    >
                      <div>
                        <strong>{app.name}</strong>{" "}
                        {app.questionnaireVote ? (
                          <span className="muted">({app.questionnaireVote})</span>
                        ) : (
                          <span className="muted">(no vote)</span>
                        )}
                      </div>
                      {app.description ? <div className="muted">{app.description}</div> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <aside className="side-panel">
            <div className="card side-panel-card">
              {!selectedApp ? (
                <div className="muted">Select an app to see details.</div>
              ) : (
                (() => {
                  const people = appPeopleByAppId[selectedApp.id] ?? {};
                  const acceptedConsenses = new Set(people.relation?.consenses ?? []);
                  const appConsenses = selectedApp.consenses ?? [];

                  return (
                    <div className="stack">
                      <div className="panel-header">
                        <div>
                          <h2 style={{ margin: 0 }}>{selectedApp.name}</h2>
                          <div className="muted">
                            {selectedApp.questionnaireVote
                              ? `Vote: ${selectedApp.questionnaireVote}`
                              : "Vote: —"}
                          </div>
                        </div>
                        <button className="btn" onClick={closePanel} type="button">
                          Close
                        </button>
                      </div>

                      {selectedApp.description ? (
                        <div className="muted">{selectedApp.description}</div>
                      ) : null}

                      <div className="panel-actions">
                        <Link
                          className="btn"
                          to={`/privacy-notice?appId=${encodeURIComponent(selectedApp.id)}`}
                        >
                          Privacy Notice
                        </Link>
                        <Link
                          className="btn"
                          to={`/rights?appId=${encodeURIComponent(selectedApp.id)}`}
                        >
                          GDPR Rights
                        </Link>
                        {canSeeSubjects ? (
                          <Link
                            className="btn"
                            to={`/questionnaire?appId=${encodeURIComponent(selectedApp.id)}`}
                          >
                            Questionnaire
                          </Link>
                        ) : null}
                      </div>

                      {people.loading ? <div className="muted">Loading…</div> : null}
                      {people.error ? <div className="error">{people.error}</div> : null}

                      <div className="grid">
                        <div className="card">
                          <strong>Controllers</strong>
                          <div style={{ height: 8 }} />
                          {people.controllers?.length ? (
                            <div className="chips">
                              {people.controllers
                                .filter((u) => u.id !== auth.user?.id)
                                .map((contact) => (
                                  <Link
                                    className="chip"
                                    key={contact.id}
                                    to={`/messages?contactId=${encodeURIComponent(contact.id)}`}
                                  >
                                    {contact.name}
                                  </Link>
                                ))}
                            </div>
                          ) : (
                            <div className="muted">—</div>
                          )}
                        </div>

                        <div className="card">
                          <strong>DPOs</strong>
                          <div style={{ height: 8 }} />
                          {people.dpos?.length ? (
                            <div className="chips">
                              {people.dpos
                                .filter((u) => u.id !== auth.user?.id)
                                .map((contact) => (
                                  <Link
                                    className="chip"
                                    key={contact.id}
                                    to={`/messages?contactId=${encodeURIComponent(contact.id)}`}
                                  >
                                    {contact.name}
                                  </Link>
                                ))}
                            </div>
                          ) : (
                            <div className="muted">—</div>
                          )}
                        </div>

                        {canSeeSubjects ? (
                          <div className="card">
                            <strong>Subjects</strong>
                            <div style={{ height: 8 }} />
                            {people.subjects?.length ? (
                              <div className="chips">
                                {people.subjects
                                  .filter((u) => u.id !== auth.user?.id)
                                  .map((contact) => (
                                    <Link
                                      className="chip"
                                      key={contact.id}
                                      to={`/messages?contactId=${encodeURIComponent(contact.id)}`}
                                    >
                                      {contact.name}
                                    </Link>
                                  ))}
                              </div>
                            ) : (
                              <div className="muted">—</div>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {isSubject ? (
                        <div className="card">
                          <strong>Consenses</strong>
                          <div style={{ height: 10 }} />
                          {appConsenses.length === 0 ? (
                            <div className="muted">No consenses defined for this app.</div>
                          ) : null}

                          {appConsenses.length > 0 ? (
                            <div className="list">
                              {appConsenses.map((consent) => {
                                const accepted = acceptedConsenses.has(consent);
                                const busy = people.updatingConsent === consent;
                                return (
                                  <div className="list-item" key={consent}>
                                    <div>{consent}</div>
                                    <button
                                      className="btn"
                                      type="button"
                                      disabled={
                                        busy ||
                                        people.updatingAllConsents ||
                                        people.removingEverything
                                      }
                                      onClick={() =>
                                        void updateConsent(
                                          selectedApp,
                                          consent,
                                          accepted ? "withdraw" : "accept",
                                        )
                                      }
                                    >
                                      {busy ? "Updating…" : accepted ? "Withdraw" : "Accept"}
                                    </button>
                                  </div>
                                );
                              })}

                              <button
                                className="btn"
                                type="button"
                                disabled={people.updatingAllConsents || !!people.updatingConsent}
                                onClick={() => void withdrawAllConsents(selectedApp)}
                              >
                                {people.updatingAllConsents ? "Withdrawing…" : "Withdraw all"}
                              </button>
                            </div>
                          ) : null}

                          <div style={{ height: 10 }} />
                          <button
                            className="btn"
                            type="button"
                            disabled={people.removingEverything}
                            onClick={() => void removeEverything(selectedApp)}
                          >
                            {people.removingEverything ? "Sending…" : "Remove everything"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
