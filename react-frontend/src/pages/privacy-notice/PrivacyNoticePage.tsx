import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson, apiText } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { IoTApp, PrivacyNotice } from "../../types/api";

const templateSections: Array<{ title: string; example: string }> = [
  {
    title: "What data do we collect?",
    example: "Example: We collect personal identification information such as name, phone number, mail…",
  },
  {
    title: "How do we collect the data?",
    example:
      "Example: We collect and process the data when you register online, use our services, or through cookies…",
  },
  {
    title: "How will we use the data?",
    example:
      "Example: We collect your data so that we can process your order, manage your account, and provide services…",
  },
  {
    title: "How do we store your data?",
    example:
      "Example: We securely store your data and keep it for a specified period. Once expired, we delete it…",
  },
  {
    title: "Marketing",
    example:
      "Example: We may send you information about products and services. You can opt out at any time…",
  },
  {
    title: "What are the user data protection rights?",
    example:
      "Example: Right to access, rectification, erasure, restrict processing, data portability, object to processing…",
  },
  {
    title: "What are cookies?",
    example:
      "Example: Cookies are text files placed on your computer to collect standard Internet log information…",
  },
  {
    title: "How do we use cookies?",
    example:
      "Example: We use cookies to keep you signed in, understand how you use our website, improve experience…",
  },
  {
    title: "What types of cookies do we use?",
    example:
      "Example: Functionality cookies, advertising cookies, analytics cookies…",
  },
  {
    title: "How to manage cookies",
    example:
      "Example: You can set your browser not to accept cookies and remove cookies from your browser settings…",
  },
  {
    title: "Privacy policies of other websites",
    example:
      "Example: Our website contains links to other websites. Our privacy policy applies only to our website…",
  },
  {
    title: "Changes to our privacy policy",
    example:
      "Example: We keep our privacy policy under regular review and place updates on this page…",
  },
  {
    title: "How to contact us",
    example:
      "Example: If you have questions, contact us via email/phone/address…",
  },
  {
    title: "How to contact the appropriate authority",
    example:
      "Example: If you wish to report a complaint, contact your local data protection authority…",
  },
];

export function PrivacyNoticePage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const appId = searchParams.get("appId");
  const privacyNoticeId = searchParams.get("privacyNoticeId");
  const isControllerOrDpo = auth.user?.role === "CONTROLLER" || auth.user?.role === "DPO";

  const [notices, setNotices] = useState<PrivacyNotice[]>([]);
  const [apps, setApps] = useState<IoTApp[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorAppId, setEditorAppId] = useState<string>("");
  const [mode, setMode] = useState<"empty" | "template" | "upload">("empty");
  const [text, setText] = useState<string>("");
  const [templateValues, setTemplateValues] = useState<string[]>(
    templateSections.map(() => ""),
  );
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (privacyNoticeId) {
      return "Privacy Notice";
    }
    if (appId) {
      return "Privacy Notice (app)";
    }
    return "Privacy Notices";
  }, [appId, privacyNoticeId]);

  const loadNotices = async () => {
    if (!auth.user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isControllerOrDpo) {
        const appsResult = await apiJson<IoTApp[]>(
          `/api/user/getApps?userId=${encodeURIComponent(auth.user.id)}`,
        );
        setApps(appsResult);
        if (!editorAppId && (appId || appsResult.length > 0)) {
          const preferredId = appId && appsResult.some((app) => app.id === appId) ? appId : "";
          setEditorAppId(preferredId || appsResult[0]?.id || "");
        }
      } else {
        setApps([]);
      }

      if (privacyNoticeId) {
        const notice = await apiJson<PrivacyNotice>(
          `/api/privacynotice/get?privacyNoticeId=${encodeURIComponent(privacyNoticeId)}`,
        );
        setNotices([notice]);
      } else if (appId) {
        const notice = await apiJson<PrivacyNotice>(
          `/api/privacynotice/getFromApp?appId=${encodeURIComponent(appId)}`,
        );
        setNotices([notice]);
      } else {
        const result = await apiJson<PrivacyNotice[]>(
          `/api/privacynotice/getFromUser?userId=${encodeURIComponent(auth.user.id)}`,
        );
        setNotices(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load privacy notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, appId, privacyNoticeId, isControllerOrDpo]);

  useEffect(() => {
    const loadExisting = async () => {
      if (!isControllerOrDpo || !editorAppId) {
        return;
      }
      setEditorError(null);
      try {
        const existing = await apiJson<PrivacyNotice>(
          `/api/privacynotice/getFromApp?appId=${encodeURIComponent(editorAppId)}`,
        );
        setText(existing.text ?? "");
      } catch {
        setText("");
      } finally {
        setTemplateValues(templateSections.map(() => ""));
        setMode("empty");
      }
    };
    void loadExisting();
  }, [editorAppId, isControllerOrDpo]);

  const downloadNotice = (notice: PrivacyNotice) => {
    const blob = new Blob([notice.text ?? ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${notice.appname || "privacy-notice"}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const buildTemplateText = () => {
    return templateSections
      .map((section, index) => `${section.title}\n${templateValues[index] ?? ""}\n`)
      .join("");
  };

  const save = async () => {
    if (!auth.user || !isControllerOrDpo) {
      return;
    }
    if (!editorAppId) {
      setEditorError("Select an app.");
      return;
    }

    const finalText = mode === "template" ? buildTemplateText() : text;
    if (!finalText.trim()) {
      setEditorError("Text is empty.");
      return;
    }

    setSaving(true);
    setEditorError(null);
    try {
      await apiText(`/api/privacynotice/updateFromApp?appId=${encodeURIComponent(editorAppId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalText }),
      });
      setEditorOpen(false);
      setMode("empty");
      setText(finalText);
      await loadNotices();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : "Failed to save privacy notice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <h1>{title}</h1>
      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card error">{error}</div> : null}
      {!loading && !error ? (
        <div className="list">
          {isControllerOrDpo ? (
            <div className="card">
              <div className="list-item">
                <div>
                  <strong>Editor</strong>
                  <div className="muted">Create or update a privacy notice for one of your apps.</div>
                </div>
                <button className="btn" type="button" onClick={() => setEditorOpen((v) => !v)}>
                  {editorOpen ? "Close" : "Open"}
                </button>
              </div>

              {editorOpen ? (
                <div className="details-body">
                  {editorError ? <div className="error">{editorError}</div> : null}

                  <label className="field">
                    <span>App</span>
                    <select
                      value={editorAppId}
                      onChange={(e) => setEditorAppId(e.target.value)}
                      disabled={saving || apps.length === 0}
                    >
                      {apps.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Mode</span>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as "empty" | "template" | "upload")}
                      disabled={saving}
                    >
                      <option value="empty">Create from empty</option>
                      <option value="template">Use template</option>
                      <option value="upload">Upload file</option>
                    </select>
                  </label>

                  {mode === "upload" ? (
                    <label className="field">
                      <span>Upload</span>
                      <input
                        type="file"
                        accept=".txt,.md,.html,.htm"
                        disabled={saving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) {
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => setText(String(reader.result ?? ""));
                          reader.readAsText(file);
                          setMode("empty");
                        }}
                      />
                      <div className="muted">After upload, edit in the text area.</div>
                    </label>
                  ) : null}

                  {mode === "template" ? (
                    <div className="list">
                      {templateSections.map((section, index) => (
                        <div className="card" key={section.title}>
                          <strong>{section.title}</strong>
                          <div className="muted" style={{ marginTop: 6 }}>
                            {section.example}
                          </div>
                          <div style={{ height: 8 }} />
                          <textarea
                            value={templateValues[index]}
                            onChange={(e) =>
                              setTemplateValues((prev) => {
                                const next = [...prev];
                                next[index] = e.target.value;
                                return next;
                              })
                            }
                            disabled={saving}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <label className="field">
                      <span>Text</span>
                      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={saving} />
                    </label>
                  )}

                  <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void save()}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {notices.length === 0 ? (
            <div className="card muted">No privacy notices.</div>
          ) : null}
          {notices.map((notice) => (
            <div className="card" key={notice.id}>
              <div className="list-item">
                <strong>{notice.appname}</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" type="button" onClick={() => downloadNotice(notice)}>
                    Download
                  </button>
                  {isControllerOrDpo ? (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setEditorAppId(notice.appId);
                        setEditorOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ height: 10 }} />
              <div style={{ whiteSpace: "pre-wrap" }}>{notice.text}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
