import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiText } from "../api/client";
import { useAuth } from "../auth/AuthContext";

function getInitials(name: string | undefined): string {
  const safeName = (name ?? "").trim();
  if (!safeName) {
    return "U";
  }
  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function UserMenu() {
  const auth = useAuth();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const initials = useMemo(() => getInitials(auth.user?.name), [auth.user?.name]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!open) {
        return;
      }
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const logout = async () => {
    setError(null);
    setOpen(false);
    await auth.logout();
    navigate("/login", { replace: true });
  };

  const deleteAccount = async () => {
    if (!auth.user) {
      return;
    }

    setError(null);

    const confirmed = window.confirm(
      "Sei sicuro di voler eliminare definitivamente questo account? L’operazione è irreversibile.",
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await apiText(`/api/user/delete?userId=${encodeURIComponent(auth.user.id)}`, {
        method: "DELETE",
      });
      await auth.logout();
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  };

  if (!auth.user) {
    return null;
  }

  return (
    <div className="user-menu" ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="user-menu-button"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span aria-hidden="true" className="user-avatar">
          {initials}
        </span>
        <span aria-hidden="true" className="user-menu-caret">
          ▾
        </span>
      </button>

      {open ? (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-title">Account</div>
          <div className="user-menu-grid">
            <div className="user-menu-row">
              <span className="muted">Name</span>
              <span>{auth.user.name}</span>
            </div>
            <div className="user-menu-row">
              <span className="muted">Role</span>
              <span>{auth.user.role}</span>
            </div>
            {auth.user.mail ? (
              <div className="user-menu-row">
                <span className="muted">Email</span>
                <span>{auth.user.mail}</span>
              </div>
            ) : null}
          </div>

          {error ? <div className="error">{error}</div> : null}

          <div className="user-menu-actions">
            <button className="btn" onClick={() => void logout()} type="button">
              Logout
            </button>
            <button
              className="btn btn-danger"
              disabled={deleting}
              onClick={() => void deleteAccount()}
              type="button"
            >
              {deleting ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

