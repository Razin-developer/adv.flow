"use client";

import { useState } from "react";
import { Lock, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would use an API route to verify this securely.
    // For this specific "one-time session" request, we use a simple client gate.
    if (password === "razinrichu123") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid administrator password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#eef4fb] flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card p-8 rounded-[32px] text-center border border-white/80 shadow-[0_30px_90px_rgba(148,163,184,0.16)]">
          <div className="icon-badge mx-auto mb-6 w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight">Admin Access</h1>
          <p className="text-slate-500 mb-8 text-sm">Please authenticate to view analytics. This session will expire if you reload the page.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left">
              <label className="download-form-label block mb-2">Security Key</label>
              <input
                type="password"
                className="download-form-input w-full"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-[13px] font-semibold justify-center bg-red-50/50 border border-red-100 py-3 rounded-xl">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <button type="submit" className="button-primary w-full min-h-[52px]">
              Authenticate Session
            </button>
          </form>

          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
            <ArrowLeft size={14} />
            Back to site
          </Link>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">
              Adv.Flow • Secure Dashboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
