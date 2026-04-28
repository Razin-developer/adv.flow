"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Download, Github, Home, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { navigationItems } from "@/data/product-system";
import { getGlobalResults, useProductStore } from "@/lib/product-store";

type ProductShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
};

export default function ProductShell({ title, eyebrow, description, children, aside }: ProductShellProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const [open, setOpen] = useState(false);
  const query = useProductStore((state) => state.query);
  const posts = useProductStore((state) => state.posts);
  const setQuery = useProductStore((state) => state.setQuery);
  const theme = useProductStore((state) => state.theme);
  const setTheme = useProductStore((state) => state.setTheme);
  const results = useMemo(() => getGlobalResults(posts, query), [posts, query]);

  useEffect(() => {
    document.documentElement.dataset.productTheme = theme;
  }, [theme]);

  const primaryNav = navigationItems.slice(0, 3);
  const guideNav = navigationItems.slice(3);

  const sidebar = (
    <aside className="product-sidebar">
      <div className="product-brand">
        <Link href="/" className="product-logo" aria-label="Advflow home">
          <span>Af</span>
        </Link>
        <div>
          <strong>Advflow</strong>
          <small>Automation OS</small>
        </div>
      </div>

      <nav className="product-nav" aria-label="Product sections">
        <div className="product-nav-group">
          <span>Product</span>
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.href;
            return (
              <Link className={active ? "active" : ""} href={item.href} key={item.label} onClick={() => setOpen(false)}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="product-nav-group">
          <span>Guides</span>
          {guideNav.map((item) => {
            const Icon = item.icon;
            const hrefBase = item.href.split("#")[0];
            const active = currentPath === item.href || (currentPath === hrefBase && !item.href.includes("#"));
            return (
              <Link className={active ? "active" : ""} href={item.href} key={item.label} onClick={() => setOpen(false)}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="product-sidebar-actions">
        <Link href="/" onClick={() => setOpen(false)}>
          <Home size={16} />
          Home
        </Link>
        <Link href="/download" onClick={() => setOpen(false)}>
          <Download size={16} />
          Download
        </Link>
        <a href="https://github.com/Razin-developer/adv.flow/" target="_blank" rel="noreferrer">
          <Github size={16} />
          GitHub
        </a>
      </div>

      <div className="product-sidebar-card">
        <span>Start here</span>
        <strong>4 min</strong>
        <small>Read the getting started guide, then build your first workflow.</small>
        <Link href="/docs#getting-started" onClick={() => setOpen(false)}>
          <BookOpen size={15} />
          Open guide
        </Link>
      </div>
    </aside>
  );

  return (
    <main className="product-root">
      <div className="product-bg-grid" />
      <button className="mobile-menu-button" type="button" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu size={19} />
      </button>

      <div className={`mobile-sidebar ${open ? "open" : ""}`}>
        <button className="mobile-close-button" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
          <X size={18} />
        </button>
        {sidebar}
      </div>

      <div className="product-layout">
        <div className="desktop-sidebar">{sidebar}</div>

        <section className="product-main">
          <header className="product-topbar">
            <div className="global-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search community, features, docs..."
                aria-label="Global search"
              />
              {results.length > 0 && (
                <div className="global-search-results">
                  {results.map((result) => (
                    <Link href={result.href} key={`${result.type}-${result.id}`}>
                      <span>{result.type}</span>
                      <strong>{result.title}</strong>
                      <small>{result.description}</small>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle color mode"
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </header>

          <div className="product-hero">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className={aside ? "product-content with-aside" : "product-content"}>
            <div>{children}</div>
            {aside ? <div className="product-aside">{aside}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
