import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiJson, apiText } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { IoTApp, QuestionnaireVote } from "../../types/api";
import { QUESTIONNAIRE_QUESTIONS } from "./questionnaireModel";

type Answer = string | null;

function computeVote(
  answers: Answer[],
): { vote: QuestionnaireVote; red: number; orange: number; green: number } {
  let red = 0;
  let orange = 0;
  let green = 0;

  for (const question of QUESTIONNAIRE_QUESTIONS) {
    if (
      question.visibleIf &&
      answers[question.visibleIf.dependsOnQuestionId] !== question.visibleIf.equals
    ) {
      continue;
    }

    const answer = answers[question.id];
    if (answer && question.green.includes(answer)) {
      green += 1;
      continue;
    }
    if (answer && question.orange.includes(answer)) {
      orange += 1;
      continue;
    }
    if (answer && question.red.includes(answer)) {
      red += 1;
      continue;
    }
    red += 1;
  }

  const vote: QuestionnaireVote = red > 0 ? "RED" : orange > 0 ? "ORANGE" : "GREEN";
  return { vote, red, orange, green };
}

export function QuestionnairePage() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const appId = searchParams.get("appId");
  const [apps, setApps] = useState<IoTApp[]>([]);
  const [query, setQuery] = useState("");
  const [app, setApp] = useState<IoTApp | null>(null);
  const [answers, setAnswers] = useState<Answer[]>(
    Array.from({ length: QUESTIONNAIRE_QUESTIONS.length }, () => null),
  );
  const [optionalAnswers, setOptionalAnswers] = useState<string[]>(
    Array.from({ length: QUESTIONNAIRE_QUESTIONS.length }, () => ""),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canView =
    auth.user?.role === "CONTROLLER" || auth.user?.role === "DPO";

  useEffect(() => {
    const load = async () => {
      if (!auth.user) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (appId) {
          const result = await apiJson<IoTApp[]>(
            `/api/user/getApps?userId=${encodeURIComponent(auth.user.id)}`,
          );
          setApps(result);
          const appDetails =
            result.find((candidate) => candidate.id === appId) ??
            (await apiJson<IoTApp>(`/api/app/get?appId=${encodeURIComponent(appId)}`));
          setApp(appDetails);

          const detailVote: Answer[] = Array.from({ length: QUESTIONNAIRE_QUESTIONS.length }, (_, idx) => {
            const value = appDetails.detailVote?.[idx];
            return value ?? null;
          });
          setAnswers(detailVote);

          const optional: string[] = Array.from({ length: QUESTIONNAIRE_QUESTIONS.length }, (_, idx) => {
            const value = appDetails.optionalAnswers?.[idx];
            return value ?? "";
          });
          setOptionalAnswers(optional);
        } else {
          const result = await apiJson<IoTApp[]>(
            `/api/user/getApps?userId=${encodeURIComponent(auth.user.id)}`,
          );
          setApps(result);
          setApp(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load apps");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auth.user, appId]);

  if (!canView) {
    return (
      <div className="container">
        <div className="card">This page is only available to Controllers and DPOs.</div>
      </div>
    );
  }

  const filteredApps = useMemo(() => {
    if (!query.trim()) {
      return apps;
    }
    const normalizedQuery = query.trim().toLowerCase();
    return apps.filter((app) => app.name.toLowerCase().includes(normalizedQuery));
  }, [apps, query]);

  const evaluation = useMemo(() => computeVote(answers), [answers]);

  const save = async () => {
    if (!appId) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const detailVotePayload = answers.map((value) => value ?? null);
      const optionalAnswersPayload = QUESTIONNAIRE_QUESTIONS.map((question) => {
        if (!question.optionalTextLabel) {
          return null;
        }
        return optionalAnswers[question.id] ?? "";
      });

      await apiText(`/api/app/update?appId=${encodeURIComponent(appId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionnaireVote: evaluation.vote,
          detailVote: detailVotePayload,
          optionalAnswers: optionalAnswersPayload,
        }),
      });
      setSearchParams({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save questionnaire");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <h1>Questionnaire</h1>
      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card error">{error}</div> : null}
      {!loading && !error ? (
        <>
          {!appId ? (
            <div className="list">
              <div className="card">
                <label className="field">
                  <span>Search</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="App name…" />
                </label>
              </div>

              <div className="card list">
                {filteredApps.length === 0 ? <div className="muted">No apps.</div> : null}
                {filteredApps.map((app) => (
                  <div key={app.id} className="list-item">
                    <div>
                      <strong>{app.name}</strong>{" "}
                      <span className="muted">
                        {app.questionnaireVote ? app.questionnaireVote : "no vote"}
                      </span>
                    </div>
                    <Link className="btn" to={`/questionnaire?appId=${encodeURIComponent(app.id)}`}>
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="list">
              <div className="card">
                <div className="list-item">
                  <div>
                    <strong>{app?.name ?? "App"}</strong>
                    <div className="muted">
                      Vote: {evaluation.vote} • Red: {evaluation.red} • Orange: {evaluation.orange} • Green: {evaluation.green}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" type="button" disabled={saving} onClick={() => setSearchParams({})}>
                      Back
                    </button>
                    <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void save()}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>

              {(["Personal Data", "Security", "Tests and Certifications"] as const).map((section) => (
                <div className="card" key={section}>
                  <h3>{section}</h3>
                  <div className="list">
                    {QUESTIONNAIRE_QUESTIONS.filter((question) => question.section === section).map((question) => {
                      const visible =
                        !question.visibleIf ||
                        answers[question.visibleIf.dependsOnQuestionId] === question.visibleIf.equals;
                      if (!visible) {
                        return null;
                      }
                      return (
                        <div className="card" key={question.id}>
                          <strong>
                            {question.id + 1}. {question.title}
                          </strong>
                          <div style={{ height: 10 }} />
                          <label className="field">
                            <span>Answer</span>
                            <select
                              value={answers[question.id] ?? ""}
                              onChange={(e) =>
                                setAnswers((prev) => {
                                  const next = [...prev];
                                  next[question.id] = e.target.value ? e.target.value : null;
                                  return next;
                                })
                              }
                            >
                              <option value="">No answer</option>
                              {question.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>

                          {question.optionalTextLabel ? (
                            <label className="field">
                              <span>{question.optionalTextLabel}</span>
                              <textarea
                                value={optionalAnswers[question.id] ?? ""}
                                onChange={(e) =>
                                  setOptionalAnswers((prev) => {
                                    const next = [...prev];
                                    next[question.id] = e.target.value;
                                    return next;
                                  })
                                }
                              />
                            </label>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
