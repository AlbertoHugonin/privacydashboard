import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { apiJson } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { UserMenu } from "./UserMenu";
import type { Notification } from "../types/api";

export function AppShell() {
  const auth = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;

  const showQuestionnaire =
    auth.user?.role === "CONTROLLER" || auth.user?.role === "DPO";

  useEffect(() => {
    const loadUnread = async () => {
      if (!auth.user) {
        setUnreadCount(0);
        return;
      }
      try {
        const unread = await apiJson<Notification[]>(
          `/api/notification/getNotReadFromUser?userId=${encodeURIComponent(auth.user.id)}`,
        );
        setUnreadCount(unread.length);
      } catch {
        setUnreadCount(0);
      }
    };
    void loadUnread();
  }, [auth.user]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <NavLink to="/">Privacy Dashboard</NavLink>
          </div>
          <nav className="nav">
            <NavLink className={navLinkClassName} to="/notifications">
              Notifications{unreadCount ? ` (${unreadCount})` : ""}
            </NavLink>
            <NavLink className={navLinkClassName} to="/contacts">
              Contacts
            </NavLink>
            <NavLink className={navLinkClassName} to="/messages">
              Messages
            </NavLink>
            <NavLink className={navLinkClassName} to="/apps">
              Apps
            </NavLink>
            <NavLink className={navLinkClassName} to="/privacy-notice">
              Privacy Notice
            </NavLink>
            <NavLink className={navLinkClassName} to="/rights">
              Rights
            </NavLink>
            {showQuestionnaire ? (
              <NavLink className={navLinkClassName} to="/questionnaire">
                Questionnaire
              </NavLink>
            ) : null}
          </nav>
          <div className="userbox">
            <UserMenu />
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
}
