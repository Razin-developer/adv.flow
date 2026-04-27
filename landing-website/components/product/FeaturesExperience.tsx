"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import ProductShell from "@/components/product/ProductShell";
import { docs, features } from "@/data/product-system";

export default function FeaturesExperience() {
  return (
    <ProductShell
      eyebrow="Features"
      title="Every Advflow capability, presented as a connected automation system."
      description="Showcase workflows, macros, in-app triggers, CLI integrations, AI generation, browser launches, and command execution with polished previews and direct docs paths."
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
          <h2>Community discussions, feature cards, and docs all reference the same capability graph.</h2>
          <p>
            Feature pages link directly to docs. Docs point back to related capabilities. Community posts can reference both,
            making support and product education feel like one surface.
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

