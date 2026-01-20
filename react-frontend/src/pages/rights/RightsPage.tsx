import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson, apiPostJson, apiText } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { IoTApp, RightRequest, RightType } from "../../types/api";

const rightTypes: Array<{ value: RightType; label: string }> = [
  { value: "WITHDRAWCONSENT", label: "Withdraw consent" },
  { value: "COMPLAIN", label: "Complain" },
  { value: "ERASURE", label: "Erasure" },
  { value: "DELTEEVERYTHING", label: "Delete everything" },
  { value: "INFO", label: "Information" },
  { value: "PORTABILITY", label: "Data portability" },
];

function formatTime(value?: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function RightsPage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const appIdFromUrl = searchParams.get("appId") ?? "";
  const requestIdFromUrl = searchParams.get("requestId") ?? "";
  const rightTypeFromUrl = searchParams.get("rightType") ?? "";
  const [requests, setRequests] = useState<RightRequest[]>([]);
  const [apps, setApps] = useState<IoTApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  const [appId, setAppId] = useState<string>(appIdFromUrl);
  const [rightType, setRightType] = useState<RightType>(() => {
    if (
      rightTypeFromUrl === "WITHDRAWCONSENT" ||
      rightTypeFromUrl === "COMPLAIN" ||
      rightTypeFromUrl === "ERASURE" ||
      rightTypeFromUrl === "DELTEEVERYTHING" ||
      rightTypeFromUrl === "INFO" ||
      rightTypeFromUrl === "PORTABILITY"
    ) {
      return rightTypeFromUrl;
    }
    return "INFO";
  });
  const [other, setOther] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [filter, setFilter] = useState<"pending" | "handled" | "all">("pending");
  const [openRequestId, setOpenRequestId] = useState<string | null>(
    requestIdFromUrl ? requestIdFromUrl : null,
  );

  const [draftByRequestId, setDraftByRequestId] = useState<
    Record<string, { response: string; handled: boolean } | undefined>
  >({});

  const isSubject = auth.user?.role === "SUBJECT";
  const isControllerOrDpo = auth.user?.role === "CONTROLLER" || auth.user?.role === "DPO";

  const load = async () => {
    const user = auth.user;
    if (!user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const requestsResult = await apiJson<RightRequest[]>(
        `/api/rightrequest/getAllFromUser?userId=${encodeURIComponent(user.id)}`,
      );

      const isSubjectUser = user.role === "SUBJECT";
      if (isSubjectUser) {
        const appsResult = await apiJson<IoTApp[]>(
          `/api/user/getApps?userId=${encodeURIComponent(user.id)}`,
        );
        setApps(appsResult);
        setRequests(requestsResult.filter((request) => request.senderId === user.id));

        if (appsResult.length > 0) {
          const selectedExists = appId
            ? appsResult.some((app) => app.id === appId)
            : false;
          if (!selectedExists) {
            setAppId(appIdFromUrl && appsResult.some((app) => app.id === appIdFromUrl) ? appIdFromUrl : appsResult[0].id);
          }
        }
      } else {
        setApps([]);
        setRequests(requestsResult.filter((request) => request.receiverId === user.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load right requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  useEffect(() => {
    setOpenRequestId(requestIdFromUrl ? requestIdFromUrl : null);
  }, [requestIdFromUrl]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (!sortedRequests.length) {
      return sortedRequests;
    }
    if (isSubject) {
      if (filter === "all") {
        return sortedRequests;
      }
      const shouldBeHandled = filter === "handled";
      return sortedRequests.filter((request) => (request.handled ?? false) === shouldBeHandled);
    }
    if (isControllerOrDpo) {
      const shouldBeHandled = filter === "handled";
      return sortedRequests.filter((request) => (request.handled ?? false) === shouldBeHandled);
    }
    return sortedRequests;
  }, [filter, isControllerOrDpo, isSubject, sortedRequests]);

  useEffect(() => {
    if (!isControllerOrDpo) {
      return;
    }
    setDraftByRequestId((prev) => {
      const next: Record<string, { response: string; handled: boolean } | undefined> = {
        ...prev,
      };
      for (const request of requests) {
        if (!next[request.id]) {
          next[request.id] = {
            response: request.response ?? "",
            handled: request.handled ?? false,
          };
        }
      }
      return next;
    });
  }, [isControllerOrDpo, requests]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth.user || !appId) {
      return;
    }
    if (!isSubject) {
      return;
    }

    const trimmedDetails = details.trim() ? details.trim() : undefined;

    const rightNeedsOther =
      rightType === "WITHDRAWCONSENT" ||
      rightType === "ERASURE" ||
      rightType === "INFO" ||
      rightType === "COMPLAIN";
    const trimmedOther = other.trim() ? other.trim() : undefined;
    if (rightNeedsOther && !trimmedOther) {
      setError("This right requires the 'Other' field.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiPostJson("/api/rightrequest/add", {
        senderId: auth.user.id,
        appId,
        rightType,
        other: trimmedOther,
        details: trimmedDetails,
      });
      setOther("");
      setDetails("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedApp = useMemo(() => apps.find((app) => app.id === appId) ?? null, [appId, apps]);
  const selectedAppConsenses = selectedApp?.consenses ?? [];

  const handleSaveControllerRequest = async (request: RightRequest) => {
    if (!auth.user) {
      return;
    }
    if (!isControllerOrDpo) {
      return;
    }
    const draft = draftByRequestId[request.id];
    if (!draft) {
      return;
    }

    const originalResponse = request.response ?? "";
    const originalHandled = request.handled ?? false;

    const responseChanged = draft.response !== originalResponse;
    const handledChanged = draft.handled !== originalHandled;
    if (!responseChanged && !handledChanged) {
      return;
    }

    setSavingRequestId(request.id);
    setError(null);
    try {
      if (responseChanged) {
        await apiText(`/api/rightrequest/addResponse?requestId=${encodeURIComponent(request.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: draft.response }),
        });
      }
      if (handledChanged) {
        await apiText(
          `/api/rightrequest/changeHandled?requestId=${encodeURIComponent(request.id)}&isHandled=${encodeURIComponent(String(draft.handled))}`,
          { method: "POST" },
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update request");
    } finally {
      setSavingRequestId(null);
    }
  };

  return (
    <div className="container">
      <h1>Rights</h1>
      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card error">{error}</div> : null}

      {!loading ? (
        <div className="list">
          {isSubject ? (
            <div className="grid">
              <div className="card">
                <h3>Create a request</h3>
                <form className="form" onSubmit={handleCreate}>
                  <label className="field">
                    <span>App</span>
                    <select
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      disabled={apps.length === 0 || submitting}
                    >
                      {apps.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Right type</span>
                    <select
                      value={rightType}
                      onChange={(e) => setRightType(e.target.value as RightType)}
                      disabled={submitting}
                    >
                      {rightTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {rightType === "WITHDRAWCONSENT" ? (
                    <label className="field">
                      <span>Consent</span>
                      <select
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        disabled={submitting || selectedAppConsenses.length === 0}
                      >
                        <option value="">Select a consent…</option>
                        {selectedAppConsenses.map((consent) => (
                          <option key={consent} value={consent}>
                            {consent}
                          </option>
                        ))}
                      </select>
                      {selectedAppConsenses.length === 0 ? (
                        <div className="muted">No consenses defined for this app.</div>
                      ) : null}
                    </label>
                  ) : null}

                  {rightType === "ERASURE" ? (
                    <label className="field">
                      <span>What data should be erased?</span>
                      <input
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        disabled={submitting}
                        placeholder="e.g. email address, sensor readings…"
                      />
                    </label>
                  ) : null}

                  {rightType === "INFO" ? (
                    <label className="field">
                      <span>What information do you need?</span>
                      <input
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        disabled={submitting}
                        placeholder="e.g. retention period, purpose…"
                      />
                    </label>
                  ) : null}

                  {rightType === "COMPLAIN" ? (
                    <label className="field">
                      <span>Complaint details</span>
                      <input
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        disabled={submitting}
                        placeholder="Describe your complaint…"
                      />
                    </label>
                  ) : null}

                  <label className="field">
                    <span>Details (optional)</span>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      disabled={submitting}
                    />
                  </label>

                  <button className="btn btn-primary" disabled={submitting} type="submit">
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </form>
              </div>

              <div className="card">
                <h3>My requests</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" type="button" onClick={() => setFilter("pending")}>
                    Pending
                  </button>
                  <button className="btn" type="button" onClick={() => setFilter("handled")}>
                    Handled
                  </button>
                  <button className="btn" type="button" onClick={() => setFilter("all")}>
                    All
                  </button>
                </div>
                <div style={{ height: 12 }} />
                {filteredRequests.length === 0 ? (
                  <div className="muted">No requests.</div>
                ) : null}
                <div className="list">
                  {filteredRequests.map((request) => (
                    <details
                      className="card details"
                      key={request.id}
                      open={openRequestId === request.id}
                      onToggle={(event) => {
                        const isOpen = (event.currentTarget as HTMLDetailsElement).open;
                        setOpenRequestId(isOpen ? request.id : null);
                      }}
                    >
                      <summary className="list-item">
                        <div>
                          <strong>{request.rightType}</strong>{" "}
                          <span className="muted">{formatTime(request.time)}</span>
                          {request.appName ? <div className="muted">{request.appName}</div> : null}
                        </div>
                        <div className="muted">{request.handled ? "Handled" : "Pending"}</div>
                      </summary>
                      <div className="details-body">
                        <div className="muted">
                          To: {request.receiverName} • Other: {request.other ?? "—"}
                        </div>
                        {request.details ? (
                          <div style={{ whiteSpace: "pre-wrap" }}>{request.details}</div>
                        ) : null}
                        {request.response ? (
                          <div>
                            <strong>Response</strong>
                            <div style={{ whiteSpace: "pre-wrap" }}>{request.response}</div>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {isControllerOrDpo ? (
            <div className="card">
              <h3>Incoming requests</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={() => setFilter("pending")}>
                  Pending
                </button>
                <button className="btn" type="button" onClick={() => setFilter("handled")}>
                  Handled
                </button>
              </div>

              <div style={{ height: 12 }} />
              {filteredRequests.length === 0 ? <div className="muted">No requests.</div> : null}

              <div className="list">
                {filteredRequests.map((request) => {
                  const draft = draftByRequestId[request.id] ?? {
                    response: request.response ?? "",
                    handled: request.handled ?? false,
                  };
                  const isSaving = savingRequestId === request.id;
                  return (
                    <details
                      className="card details"
                      key={request.id}
                      open={openRequestId === request.id}
                      onToggle={(event) => {
                        const isOpen = (event.currentTarget as HTMLDetailsElement).open;
                        setOpenRequestId(isOpen ? request.id : null);
                      }}
                    >
                      <summary className="list-item">
                        <div>
                          <strong>{request.rightType}</strong>{" "}
                          <span className="muted">{formatTime(request.time)}</span>
                          <div className="muted">
                            From: {request.senderName}
                            {request.appName ? ` • ${request.appName}` : ""}
                          </div>
                        </div>
                        <div className="muted">{request.handled ? "Handled" : "Pending"}</div>
                      </summary>

                      <div className="details-body">
                        <div className="muted">Other: {request.other ?? "—"}</div>
                        {request.details ? (
                          <div style={{ whiteSpace: "pre-wrap" }}>{request.details}</div>
                        ) : null}

                        <label className="field">
                          <span>Response</span>
                          <textarea
                            value={draft.response}
                            onChange={(e) =>
                              setDraftByRequestId((prev) => ({
                                ...prev,
                                [request.id]: { ...draft, response: e.target.value },
                              }))
                            }
                            disabled={isSaving}
                          />
                        </label>

                        <label className="field">
                          <span>Status</span>
                          <select
                            value={draft.handled ? "handled" : "pending"}
                            onChange={(e) =>
                              setDraftByRequestId((prev) => ({
                                ...prev,
                                [request.id]: { ...draft, handled: e.target.value === "handled" },
                              }))
                            }
                            disabled={isSaving}
                          >
                            <option value="pending">Pending</option>
                            <option value="handled">Handled</option>
                          </select>
                        </label>

                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={isSaving}
                          onClick={() => void handleSaveControllerRequest(request)}
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
