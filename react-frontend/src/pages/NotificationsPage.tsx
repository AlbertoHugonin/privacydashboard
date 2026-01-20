import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson, apiText } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Notification } from "../types/api";

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

export function NotificationsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("unread");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    if (!auth.user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiJson<Notification[]>(
        `/api/notification/getAllFromUser?userId=${encodeURIComponent(auth.user.id)}`,
      );
      setNotifications(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "all") {
      return sortedNotifications;
    }
    const shouldBeRead = filter === "read";
    return sortedNotifications.filter((n) => (n.isRead ?? false) === shouldBeRead);
  }, [filter, sortedNotifications]);

  const changeIsRead = async (notificationId: string, isRead: boolean) => {
    setUpdatingId(notificationId);
    setError(null);
    try {
      await apiText(
        `/api/notification/changeIsRead?notificationId=${encodeURIComponent(notificationId)}&isReadString=${encodeURIComponent(String(isRead))}`,
        { method: "POST" },
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update notification");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    setUpdatingId(notificationId);
    setError(null);
    try {
      await apiText(
        `/api/notification/delete?notificationId=${encodeURIComponent(notificationId)}`,
        { method: "DELETE" },
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete notification");
    } finally {
      setUpdatingId(null);
    }
  };

  const openNotification = async (notification: Notification) => {
    if (!(notification.isRead ?? false)) {
      await changeIsRead(notification.id, true);
    }

    if (notification.type === "Message") {
      navigate(`/messages?contactId=${encodeURIComponent(notification.senderId)}`);
      return;
    }
    if (notification.type === "Request") {
      navigate(`/rights?requestId=${encodeURIComponent(notification.objectId)}`);
      return;
    }
    if (notification.type === "PrivacyNotice") {
      navigate(`/privacy-notice?privacyNoticeId=${encodeURIComponent(notification.objectId)}`);
    }
  };

  return (
    <div className="container">
      <h1>Notifications</h1>
      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card error">{error}</div> : null}
      {!loading && !error ? (
        <div className="list">
          <div className="card">
            <strong>Filter</strong>
            <div style={{ height: 10 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" type="button" onClick={() => setFilter("unread")}>
                Unread
              </button>
              <button className="btn" type="button" onClick={() => setFilter("read")}>
                Read
              </button>
              <button className="btn" type="button" onClick={() => setFilter("all")}>
                All
              </button>
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="card muted">No notifications.</div>
          ) : null}

          {filteredNotifications.map((notification) => {
            const busy = updatingId === notification.id;
            return (
              <div className="card" key={notification.id}>
                <div className="list-item">
                  <div>
                    <strong>{notification.type}</strong>{" "}
                    <span className="muted">{formatTime(notification.time)}</span>
                    <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                      {notification.description}
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      From: {notification.senderName}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={busy}
                      onClick={() => void openNotification(notification)}
                    >
                      Open
                    </button>
                    <button
                      className="btn"
                      type="button"
                      disabled={busy}
                      onClick={() => void changeIsRead(notification.id, !(notification.isRead ?? false))}
                    >
                      {(notification.isRead ?? false) ? "Mark unread" : "Mark read"}
                    </button>
                    <button
                      className="btn"
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteNotification(notification.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

