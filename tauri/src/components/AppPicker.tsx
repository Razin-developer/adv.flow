import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { InstalledApp } from "@/types/workflow";

interface AppPickerProps {
  apps: InstalledApp[];
  value: string;
  onChange: (app: InstalledApp) => void;
}

export default function AppPicker({ apps, value, onChange }: AppPickerProps) {
  const [query, setQuery] = useState("");
  const selected = apps.find((app) => app.id === value);
  const filteredApps = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return apps.slice(0, 30);
    return apps
      .filter((app) =>
        `${app.name} ${app.command} ${app.source}`.toLowerCase().includes(search),
      )
      .slice(0, 40);
  }, [apps, query]);

  return (
    <div className="app-picker">
      <div className="app-picker-search">
        <Search size={14} />
        <input
          value={query}
          placeholder={selected ? selected.name : "Search apps"}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="app-picker-list">
        {filteredApps.map((app) => (
          <button
            key={app.id}
            type="button"
            className={`app-picker-item ${app.id === value ? "is-selected" : ""}`}
            onClick={() => {
              onChange(app);
              setQuery("");
            }}
          >
            <span className="app-picker-icon">{app.name.slice(0, 2).toUpperCase()}</span>
            <span className="app-picker-copy">
              <strong>{app.name}</strong>
              <small>{app.source}</small>
            </span>
          </button>
        ))}
        {!filteredApps.length ? <div className="empty-inline">No apps found.</div> : null}
      </div>
    </div>
  );
}
