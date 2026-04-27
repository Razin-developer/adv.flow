"use client";

import { X, Download, ShieldCheck } from "lucide-react";
import DownloadLeadForm from "./DownloadLeadForm";

type DownloadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  release: {
    os: string;
    arch: string;
    type: string;
    name: string;
    url: string;
  } | null;
};

export default function DownloadModal({ isOpen, onClose, release }: DownloadModalProps) {
  if (!isOpen || !release) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-body">
          <div className="modal-header">
            <div className="icon-badge">
              <Download size={20} />
            </div>
            <div>
              <h2>Download Adv.Flow</h2>
              <p>Almost ready to download for {release.os}</p>
            </div>
          </div>

          <div className="release-preview">
            <div className="preview-row">
              <span className="label">Build</span>
              <span className="value">{release.type} ({release.arch})</span>
            </div>
            <div className="preview-row">
              <span className="label">File</span>
              <span className="value filename">{release.name}</span>
            </div>
          </div>

          <div className="form-container">
            <DownloadLeadForm
              platform={`${release.os} (${release.arch})`}
              releaseUrl={"https://github.com/Razin-developer/adv.flow/releases"}
              buttonLabel="Start Download"
            />
          </div>

          <div className="modal-footer">
            <div className="trust-note">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>We'll only notify you about major updates. No spam.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
