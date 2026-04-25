'use client';

import { useEffect, useState } from 'react';

interface FolderEntry {
  name: string;
  path: string;
  isDrive?: boolean;
}

interface FolderPickerProps {
  isOpen: boolean;
  initialPath?: string;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export default function FolderPicker({ isOpen, initialPath, onClose, onSelect }: FolderPickerProps) {
  const [path, setPath] = useState(initialPath || '');
  const [parent, setParent] = useState<string | null>(null);
  const [entries, setEntries] = useState<FolderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPath(initialPath || '');
  }, [initialPath, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError(null);

    const query = path ? `?path=${encodeURIComponent(path)}` : '';
    fetch(`/api/fs/browse${query}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to browse folder');
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setEntries(data.entries || []);
        setParent(data.parent || null);
      })
      .catch((browseError: Error) => {
        if (!active) return;
        setError(browseError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, path]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="folder-picker" onClick={(event) => event.stopPropagation()}>
        <div className="picker-header">
          <div>
            <h3>Select folder</h3>
            <p>{path || 'Computer root'}</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="picker-toolbar">
          <button type="button" className="ghost-button" disabled={!parent} onClick={() => setPath(parent || '')}>
            Up
          </button>
          <button type="button" className="primary-button" onClick={() => onSelect(path)}>
            Use this folder
          </button>
        </div>

        <div className="picker-list">
          {loading ? <div className="picker-empty">Loading folders...</div> : null}
          {error ? <div className="picker-empty error-text">{error}</div> : null}
          {!loading && !entries.length ? <div className="picker-empty">No folders here.</div> : null}
          {entries.map((entry) => (
            <button key={entry.path} type="button" className="picker-entry" onClick={() => setPath(entry.path)}>
              <span>{entry.name}</span>
              <small>{entry.isDrive ? 'Drive' : 'Folder'}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
