"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, Copy, Search } from "lucide-react";
import ProductShell from "@/components/product/ProductShell";
import { docs, features } from "@/data/product-system";
import { useProductStore } from "@/lib/product-store";

const sections = ["Getting Started", "Workflows", "Macros", "Commands", "Integrations", "Settings"] as const;

export default function DocsExperience() {
  const docsQuery = useProductStore((state) => state.docsQuery);
  const setDocsQuery = useProductStore((state) => state.setDocsQuery);
  const copySnippet = async (snippet: string) => {
    await navigator.clipboard?.writeText(snippet);
  };
  const filteredDocs = docs.filter((doc) => {
    if (!docsQuery.trim()) return true;
    const haystack = `${doc.title} ${doc.description} ${doc.section} ${doc.steps.join(" ")} ${doc.snippet ?? ""}`.toLowerCase();
    return haystack.includes(docsQuery.toLowerCase());
  });

  return (
    <ProductShell
      eyebrow="Docs"
      title="Clear, readable guides for building reliable flows."
      description="Searchable documentation with focused articles, examples, step-by-step guidance, copyable snippets, and related feature links."
      aside={
        <div className="docs-nav sticky">
          <strong>Docs navigation</strong>
          {sections.map((section) => (
            <div key={section}>
              <span>{section}</span>
              {docs
                .filter((doc) => doc.section === section)
                .map((doc) => (
                  <Link href={`#${doc.id}`} key={doc.id}>
                    {doc.title}
                  </Link>
                ))}
            </div>
          ))}
        </div>
      }
    >
      <div className="docs-tools">
        <div className="docs-search">
          <Search size={17} />
          <input value={docsQuery} onChange={(event) => setDocsQuery(event.target.value)} placeholder="Search docs..." />
        </div>
        <div className="docs-result-count">{filteredDocs.length} articles</div>
      </div>

      <section className="docs-stack">
        {filteredDocs.map((doc) => (
          <article className="doc-article" id={doc.id} key={doc.id}>
            <div className="doc-article-head">
              <div>
                <span>{doc.section}</span>
                <h2>{doc.title}</h2>
                <p>{doc.description}</p>
              </div>
              <BookOpen size={24} />
            </div>
            <div className="step-list">
              {doc.steps.map((step, index) => (
                <div className="step-row" key={step}>
                  <span>
                    <CheckCircle2 size={16} />
                    {index + 1}
                  </span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
            {doc.snippet && (
              <div className="code-panel">
                <div>
                  <span>Example</span>
                  <button type="button" aria-label="Copy snippet" onClick={() => void copySnippet(doc.snippet ?? "")}>
                    <Copy size={15} />
                  </button>
                </div>
                <pre>
                  <code>{doc.snippet}</code>
                </pre>
              </div>
            )}
            <div className="related-features">
              {doc.relatedFeatures.map((featureId) => {
                const feature = features.find((item) => item.id === featureId);
                if (!feature) return null;
                const Icon = feature.icon;
                return (
                  <Link href={`/features#${feature.id}`} key={feature.id}>
                    <Icon size={16} />
                    Related: {feature.title}
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </ProductShell>
  );
}
