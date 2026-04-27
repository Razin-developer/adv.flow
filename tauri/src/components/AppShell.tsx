import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/data";
import logoUrl from "@/assets/advflow-logo.svg";

interface AppShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function AppShell({
  title,
  subtitle,
  children,
  actions,
}: AppShellProps) {
  return (
    <div className="desktop-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <img className="brand-mark" src={logoUrl} alt="" />
          <div>
            <div className="brand-name">Advflow</div>
            <div className="brand-caption">Desktop automation studio</div>
          </div>
        </div>

        <nav className="app-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `app-nav-item ${isActive ? "is-active" : ""}`
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-card">
            <div className="sidebar-card-title">Report a bug</div>
            <p>9946859838</p>
            <p>razinmohammedpt@gmail.com</p>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="page-header">
          <div>
            <div className="page-eyebrow">Desktop workspace</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="page-actions">{actions}</div>
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
