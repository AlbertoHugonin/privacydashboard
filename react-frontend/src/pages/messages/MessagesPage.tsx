import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson, apiPostJson } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Conversation, Message, UserSummary } from "../../types/api";

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function MessagesPage() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const contactIdFromUrl = searchParams.get("contactId");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<UserSummary[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    contactIdFromUrl,
  );
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("contactId", contactId);
      return next;
    });
  };

  const selectedContactName = useMemo(() => {
    if (!selectedContactId) {
      return null;
    }
    const directContact = contacts.find((contact) => contact.id === selectedContactId);
    if (directContact) {
      return directContact.name;
    }
    return (
      conversations.find((conversation) => conversation.contactId === selectedContactId)
        ?.contactName ?? null
    );
  }, [contacts, conversations, selectedContactId]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) {
      return conversations;
    }
    const normalizedSearch = search.trim().toLowerCase();
    return conversations.filter((conversation) =>
      conversation.contactName.toLowerCase().includes(normalizedSearch),
    );
  }, [conversations, search]);

  const loadSidebar = async () => {
    if (!auth.user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [conversationsResult, contactsResult] = await Promise.all([
        apiJson<Conversation[]>(
          `/api/message/getAllMessagesFromUser?userId=${encodeURIComponent(auth.user.id)}`,
        ),
        apiJson<UserSummary[]>(
          `/api/user/getAllContacts?userId=${encodeURIComponent(auth.user.id)}`,
        ),
      ]);
      setConversations(conversationsResult);
      setContacts(contactsResult);

      if (!selectedContactId) {
        if (contactIdFromUrl) {
          setSelectedContactId(contactIdFromUrl);
        } else if (conversationsResult.length > 0) {
          setSelectedContactId(conversationsResult[0].contactId);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  useEffect(() => {
    if (contactIdFromUrl) {
      setSelectedContactId(contactIdFromUrl);
    }
  }, [contactIdFromUrl]);

  const loadConversation = async (contactId: string) => {
    if (!auth.user) {
      return;
    }
    setConversationLoading(true);
    setError(null);
    try {
      const result = await apiJson<Message[]>(
        `/api/message/getConversation?user1Id=${encodeURIComponent(auth.user.id)}&user2Id=${encodeURIComponent(contactId)}`,
      );
      setConversationMessages(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
      setConversationMessages([]);
    } finally {
      setConversationLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedContactId) {
      setConversationMessages([]);
      return;
    }
    void loadConversation(selectedContactId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, selectedContactId]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth.user || !selectedContactId) {
      return;
    }
    if (!text.trim()) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiPostJson("/api/message/add", {
        senderId: auth.user.id,
        receiverId: selectedContactId,
        text,
      });
      setText("");
      await Promise.all([loadConversation(selectedContactId), loadSidebar()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container">
      <h1>Messages</h1>
      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card error">{error}</div> : null}
      {!loading ? (
        <div className="split">
          <div className="card list">
            <strong>Conversations</strong>
            <div style={{ height: 10 }} />
            <label className="field">
              <span>Search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Contact name…"
              />
            </label>

            <div style={{ height: 10 }} />
            <label className="field">
              <span>New message</span>
              <select
                value={selectedContactId ?? ""}
                onChange={(e) => {
                  if (!e.target.value) {
                    return;
                  }
                  selectContact(e.target.value);
                }}
              >
                <option value="">Select a contact…</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ height: 12 }} />
            {filteredConversations.length === 0 ? (
              <div className="muted">No conversations yet.</div>
            ) : null}
            {filteredConversations.map((conversation) => (
              <button
                className="btn"
                key={conversation.contactId}
                type="button"
                onClick={() => selectContact(conversation.contactId)}
              >
                {conversation.contactName}
              </button>
            ))}
          </div>
          <div className="card">
            <strong>{selectedContactName ?? "—"}</strong>
            <div style={{ height: 12 }} />
            <div className="messages">
              {!selectedContactId ? (
                <div className="muted">Select a contact to start.</div>
              ) : null}
              {selectedContactId && conversationLoading ? (
                <div className="muted">Loading conversation…</div>
              ) : null}
              {selectedContactId && !conversationLoading && conversationMessages.length === 0 ? (
                <div className="muted">No messages in this conversation.</div>
              ) : null}
              {conversationMessages.map((message) => (
                <div className="message" key={message.id}>
                  <div className="message-meta">
                    <span>{message.senderName}</span>
                    <span>{formatTime(message.time)}</span>
                  </div>
                  <div>{message.text}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 12 }} />
            <form className="form" onSubmit={handleSend}>
              <label className="field">
                <span>New message</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={!selectedContactId || sending}
                />
              </label>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!selectedContactId || sending}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
