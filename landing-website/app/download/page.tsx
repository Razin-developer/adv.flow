"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Apple, ArrowLeft, Check, Coffee, Download, GitBranch, Monitor, TerminalSquare } from "lucide-react";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import DownloadModal from "@/components/DownloadModal";

const githubUrl = "https://github.com/Razin-developer/adv.flow/";
const buyMeACoffeeUrl = "https://www.buymeacoffee.com/";

const releases = [
  {
    name: "advflow-windows.exe",
    os: "Windows",
    arch: "x64",
    type: "Installer",
    url: `${githubUrl}releases/download/v1.0.0/advflow-windows.exe`,
  },
  {
    name: "advflow-macos.dmg",
    os: "macOS",
    arch: "Universal",
    type: "DMG",
    url: `${githubUrl}releases/download/v1.0.0/advflow-macos.dmg`,
  },
  {
    name: "advflow-macos.tar.gz",
    os: "macOS",
    arch: "Universal",
    type: "Tarball",
    url: `${githubUrl}releases/download/v1.0.0/advflow-macos.app.tar.gz`,
  },
  {
    name: "advflow-linux.deb",
    os: "Linux",
    arch: "x64",
    type: "Debian",
    url: `${githubUrl}releases/download/v1.0.0/advflow-linux.deb`,
  },
  {
    name: "advflow-linux.AppImage",
    os: "Linux",
    arch: "x64",
    type: "AppImage",
    url: `${githubUrl}releases/download/v1.0.0/advflow-linux.AppImage`,
  },
];

function TerminalCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="terminal-command-container">
      <code className="terminal-command-text">{command}</code>
      <button onClick={copy} className="terminal-copy-button">
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function DownloadPage() {
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detectedRelease, setDetectedRelease] = useState<any>(null);
  const [stars, setStars] = useState("Star");

  useEffect(() => {
    const ua = window.navigator.userAgent;
    let match = null;

    if (ua.indexOf("Win") !== -1) {
      match = releases.find(r => r.os === "Windows");
    } else if (ua.indexOf("Mac") !== -1) {
      // Prefer DMG for macOS
      match = releases.find(r => r.os === "macOS" && r.type === "DMG");
    } else if (ua.indexOf("Linux") !== -1) {
      // Prefer .deb for Linux
      match = releases.find(r => r.os === "Linux" && r.type === "Debian");
    }

    console.log(match);


    if (match) setDetectedRelease(match);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStars() {
      try {
        const response = await fetch("https://api.github.com/repos/Razin-developer/adv.flow", {
          headers: { Accept: "application/vnd.github+json" },
        });

        if (!response.ok) return;

        const data = (await response.json()) as { stargazers_count?: number };
        const count = data.stargazers_count ?? 0;
        const nextStars = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);

        if (active) {
          setStars(nextStars);
        }
      } catch {
        // Leave the fallback label in place.
      }
    }

    loadStars();

    return () => {
      active = false;
    };
  }, []);

  const handleDownloadClick = (e: React.MouseEvent | React.TouchEvent, release: any) => {
    e.preventDefault();
    setSelectedRelease(release);
    setIsModalOpen(true);
  };

  return (
    <main className="site-shell">
      <DownloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        release={selectedRelease}
        githubUrl={githubUrl}
        buyMeACoffeeUrl={buyMeACoffeeUrl}
        stars={stars}
      />
      <AnalyticsTracker pathname="/download" />
      <section className="">
        <header className="marketing-topbar">
          <div className="window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="brand-lockup">
            <img src="/advflow-logo.svg" alt="Adv.Flow" className="brand-marketing-logo" />
            <span>Adv.Flow</span>
          </div>
          <nav className="marketing-nav">
            <Link href="/">Home</Link>
            <Link href="/download">Download</Link>
            {/* <Link href="/admin">Admin</Link> */}
            <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <div className="marketing-actions">
            <a className="pill subtle" href={buyMeACoffeeUrl} target="_blank" rel="noreferrer">
              <Coffee size={14} />
              Support
            </a>
          </div>
        </header>

        <div className="download-hero-copy">
          <Link href="/" className="back-link">
            <ArrowLeft size={14} />
            Back to home
          </Link>
          <div className="eyebrow">
            <GitBranch size={14} />
            Open-source releases for desktop and CLI
          </div>
          <h1>Download Adv.Flow for all major desktop platforms</h1>
          <p>
            Get the latest version of Adv.Flow for your machine. We provide native installers for Windows, macOS (Apple Silicon), and Linux (Debian and AppImage).
          </p>

          {detectedRelease ? (
            <div className="detected-os-action">
              <button
                onClick={(e) => handleDownloadClick(e, detectedRelease)}
                className="button primary hero-quick-download"
              >
                <Download size={16} />
                Download for {detectedRelease.os}
              </button>
              <p className="detected-note">
                Detected your system as <strong>{detectedRelease.os} ({detectedRelease.arch})</strong>
              </p>
            </div>
          ) : (
            <div className="detected-os-action">
              <p className="detected-note">
                Detected your system as <strong>Unknown</strong>
              </p>
              <p className="detected-note">
                Means not supported yet 😔
              </p>
            </div>
          )}
        </div>
      </section>



      <section className="releases-section">
        <div className="section-head">
          <h2>All available releases</h2>
          <p>Find the specific build for your architecture and platform.</p>
        </div>
        <div className="release-table-container desktop-only">
          <table className="release-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Architecture</th>
                <th>File type</th>
                <th>Filename</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr key={release.name}>
                  <td>{release.os}</td>
                  <td>{release.arch}</td>
                  <td>{release.type}</td>
                  <td className="filename-cell">{release.name}</td>
                  <td>
                    <button
                      onClick={(e) => handleDownloadClick(e, release)}
                      className="download-link button-reset"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="release-cards mobile-only">
          {releases.map((release) => (
            <article key={release.name} className="release-card">
              <div className="release-card-top">
                <div>
                  <p className="release-card-os">{release.os}</p>
                  <h3>{release.type}</h3>
                </div>
                <span className="release-chip">{release.arch}</span>
              </div>
              <p className="release-file">{release.name}</p>
              <button
                onClick={(e) => handleDownloadClick(e, release)}
                className="download-link release-card-link button-reset"
              >
                <Download size={14} />
                Download build
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="info-panel feature-split">
        <div className="panel-copy">
          <h2>Install notes to show users</h2>
          <p>
            Keep the message simple and consistent across the site so users know exactly what to do after they
            download the app.
          </p>
          <div className="list-stack">
            <div className="list-row"><span className="check-badge"><Check size={14} /></span>Windows: just run the installer or setup file.</div>
            <div className="list-row linux-note">
              <span className="check-badge">
                <Check size={14} />
              </span>
              <div>
                Ubuntu: install the app, then add the CLI to PATH if needed.
                <TerminalCommand command="sudo apt install ./advflow-linux-x64.deb" />
              </div>
            </div>
            <div className="list-row macos-note">
              <span className="check-badge"><Check size={14} /></span>
              <div>
                macOS: install from DMG. If it fails to open or for CLI access, run:
                <TerminalCommand command="sudo ln -s /Applications/Adv.Flow.app/Contents/MacOS/advflow-cli /usr/local/bin/advflow" />
              </div>
            </div>
          </div>
        </div>
        <div className="panel-visual">
          <div className="support-card terminal-card">
            <div className="support-status"><span /> CLI reminder</div>
            <strong><TerminalSquare size={16} /> advflow</strong>
            <p>Ubuntu and macOS users should place the CLI binary in a PATH location or add its folder in their shell profile.</p>
          </div>
        </div>
      </section>

      <section className="cta-panel">
        <div>
          <h2>Download it, share it, support it</h2>
          <p>
            Adv.Flow is open source, available through GitHub, and backed by community support.
          </p>
          <div className="hero-buttons">
            <a className="button primary" href={githubUrl} target="_blank" rel="noreferrer">Open GitHub</a>
            <a className="button" href={buyMeACoffeeUrl} target="_blank" rel="noreferrer">Buy me a coffee</a>
          </div>
        </div>
        <div className="support-card">
          <strong>Reminder for users</strong>
          <p>Windows: run it. Ubuntu and macOS: install it, then set the CLI in PATH if they want terminal access.</p>
        </div>
      </section>
    </main>
  );
}
