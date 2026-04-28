"use client";

import { useEffect, useState } from "react";
import { X, Download, ShieldCheck, Coffee, Star } from "lucide-react";
import DownloadLeadForm from "./DownloadLeadForm";

type DownloadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  githubUrl: string;
  buyMeACoffeeUrl: string;
  stars?: string;
  release: {
    os: string;
    arch: string;
    type: string;
    name: string;
    url: string;
  } | null;
};

export default function DownloadModal({
  isOpen,
  onClose,
  release,
  githubUrl,
  buyMeACoffeeUrl,
  stars = "Star",
}: DownloadModalProps) {
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowThanks(false);
    }
  }, [isOpen, release]);

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
            {showThanks ? (
              <div className="download-thanks-card">
                <div className="download-thanks-copy">
                  <span className="download-thanks-eyebrow">Thanks for downloading</span>
                  <h3>Your download has started.</h3>
                  <p>
                    If Adv.Flow helps, a GitHub star or a coffee keeps the project moving.
                  </p>
                </div>
                <div className="download-thanks-actions">
                  <a className="button primary" href={githubUrl} target="_blank" rel="noreferrer">
                    <Star size={16} />
                    {stars === "Star" ? "Star us on GitHub" : `Star us on GitHub (${stars})`}
                  </a>
                  <a className="button" href={buyMeACoffeeUrl} target="_blank" rel="noreferrer">
                    <Coffee size={16} />
                    Buy me a coffee
                  </a>
                </div>
              </div>
            ) : (
              <DownloadLeadForm
                platform={`${release.os} (${release.arch})`}
                releaseUrl={release.url}
                buttonLabel="Start Download"
                onSuccess={() => setShowThanks(true)}
              />
            )}
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
