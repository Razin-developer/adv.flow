"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles, Workflow, Zap } from "lucide-react";
import ProductShell from "@/components/product/ProductShell";
import { docs, features } from "@/data/product-system";

export default function FeaturesExperience() {
  return (
    <ProductShell
      eyebrow="Features"
      title="Every Advflow capability in one connected system."
      description="Explore the building blocks behind desktop workflows, macros, app-aware triggers, CLI commands, AI generation, browser launches, and safe local execution."
      aside={
        <div className="aside-panel sticky">
          <strong>Capability map</strong>
          {features.map((feature) => (
            <Link href={`#${feature.id}`} key={feature.id}>
              {feature.title}
            </Link>
          ))}
        </div>
      }
    >
      <section className="feature-overview">
        {[
          { label: "Core blocks", value: "7", body: "Workflows, macros, commands, browser actions, AI generation, app triggers, and CLI.", icon: Workflow },
          { label: "Editable previews", value: "28", body: "Each capability shows real steps instead of abstract marketing copy.", icon: Sparkles },
          { label: "Docs linked", value: "100%", body: "Every feature points to the guides that explain how to use it safely.", icon: Zap },
        ].map((item) => (
          <article key={item.label}>
            <item.icon size={18} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="feature-grid">
        {features.map((feature) => {
          const Icon = feature.icon;
          const relatedDocs = docs.filter((doc) => doc.relatedFeatures.includes(feature.id));
          return (
            <article className="feature-card-premium" id={feature.id} key={feature.id}>
              <div className="feature-card-top">
                <div className={`feature-icon bg-gradient-to-br ${feature.accent}`}>
                  <Icon size={22} />
                </div>
                <Link href={feature.docsHref} aria-label={`Learn more about ${feature.title}`}>
                  <ArrowRight size={18} />
                </Link>
              </div>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
              <div className="feature-preview">
                <div className="preview-title">
                  <PlayCircle size={16} />
                  Demo preview
                </div>
                {feature.preview.map((step, index) => (
                  <div className="preview-step" key={step}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
              <div className="related-docs">
                {relatedDocs.slice(0, 2).map((doc) => (
                  <Link href={`/docs#${doc.id}`} key={doc.id}>
                    <CheckCircle2 size={15} />
                    {doc.title}
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="integration-band">
        <div>
          <span>Connected system</span>
          <h2>Community, features, and docs now feel like one product surface.</h2>
          <p>
            Feature pages link directly to docs. Docs point back to related capabilities. Community posts can reference
            both, so users can move from idea to guide to implementation without losing context.
          </p>
        </div>
        <div className="system-map">
          {["Community", "Features", "Docs", "Workflow exports"].map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      </section>
    </ProductShell>
  );
}
