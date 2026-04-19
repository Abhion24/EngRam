import { useState, useEffect } from 'react';

interface ContextPreviewData {
  context: string;
  tokensUsed: number;
  memoriesIncluded: number;
  pinnedCount: number;
  dynamicCount: number;
}

const demoContext: ContextPreviewData = {
  context: `## 🧠 Engram Project Context

**Project:** Project Alpha
**Stack:** React, TypeScript, Express, Supabase, WatermelonDB
**Languages:** TypeScript, JavaScript

### 📌 Pinned Context (Always Active)
- 🏗️ **[architecture]** Project uses React 18 + TypeScript with Vite. Strict mode. Functional components with hooks only.
- 🐛 **[bug_fix]** Fixed auth middleware on /api/users — Bearer tokens now validated against refresh token store. [src/api/auth.ts, src/middleware/auth.ts]
- 🔄 **[pattern]** All API handlers follow Controller → Service → Repository pattern. Never access DB directly from controllers. [src/api/]
- 🏗️ **[architecture]** Database migrations in /migrations/ with timestamp prefixes. Never modify existing migrations. [migrations/]
- ✅ **[decision]** Use CSS Grid for page layouts, Flexbox for component internals. No mixing at same hierarchy.

### ⏱️ Recent Decisions
- ✅ **[decision]** Switched from BrowserRouter to HashRouter for VS Code extension webview compatibility. [src/App.tsx]
- ⚠️ **[warning]** WatermelonDB sync requires exact column name matching. Mismatches cause silent data loss. [src/db/schema.ts]
- 🏗️ **[architecture]** Inter-service communication: gRPC for synchronous, async event streams for non-critical paths.

### 🔗 Relevant Context
- 🐛 **[bug_fix]** Overlapping time slots not detected when appointment spans midnight. Added UTC normalization. [src/services/appointments.ts]
- ✅ **[decision]** Added nullable columns to users table to avoid breaking existing data. [migrations/002_add_columns.sql]

_[Engram: 10 memories, 847 tokens]_`,
  tokensUsed: 847,
  memoriesIncluded: 10,
  pinnedCount: 5,
  dynamicCount: 5,
};

const pinnedAxioms = [
  { id: '1', icon: '🏗️', type: 'architecture', content: 'Project uses React 18 + TypeScript with Vite. Strict mode. Functional components with hooks only.', confidence: 0.95 },
  { id: '2', icon: '🐛', type: 'bug_fix', content: 'Fixed auth middleware on /api/users — Bearer tokens validated against refresh token store.', confidence: 0.95 },
  { id: '3', icon: '🔄', type: 'pattern', content: 'All API handlers follow Controller → Service → Repository. No direct DB access from controllers.', confidence: 0.88 },
  { id: '4', icon: '🏗️', type: 'architecture', content: 'Database migrations in /migrations/ with timestamp prefixes. Never modify existing migrations.', confidence: 0.9 },
  { id: '5', icon: '✅', type: 'decision', content: 'Use CSS Grid for page layouts, Flexbox for component internals.', confidence: 0.85 },
];

const dynamicRetrieval = [
  { id: '6', icon: '✅', type: 'decision', content: 'Switched from BrowserRouter to HashRouter for VS Code webview compatibility.', score: 0.92 },
  { id: '7', icon: '⚠️', type: 'warning', content: 'WatermelonDB sync requires exact column name matching — mismatches cause silent data loss.', score: 0.78 },
  { id: '8', icon: '🏗️', type: 'architecture', content: 'Inter-service communication: gRPC for synchronous, async event streams for non-critical.', score: 0.88 },
  { id: '9', icon: '🐛', type: 'bug_fix', content: 'Overlapping appointment time slots not detected at midnight boundary. UTC normalization added.', score: 0.91 },
  { id: '10', icon: '✅', type: 'decision', content: 'Added nullable columns to users table to avoid breaking existing data.', score: 0.9 },
];

export default function ContextPreview() {
  const [preview, setPreview] = useState<ContextPreviewData>(demoContext);
  const maxTokens = 2000;

  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      const res = await fetch('/api/context/preview');
      const data = await res.json();
      if (data.context) setPreview(data);
    } catch { /* use demo */ }
  };

  const usagePercent = (preview.tokensUsed / maxTokens) * 100;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Context Injection</h1>
        <p className="subtitle">
          Live view of memory nodes currently loaded into the LLM context window. Pinned axioms guarantee persistent behavioral traits, while dynamic nodes are retrieved based on recent session semantic proximity.
        </p>
      </div>

      {/* Token Budget Meter */}
      <div className="token-meter" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="token-meter-header">
          <span className="token-meter-label">Active Payload</span>
          <span className="token-meter-value">{preview.tokensUsed} / {maxTokens} tokens</span>
        </div>
        <div className="token-meter-bar">
          <div className="token-meter-fill" style={{ width: `${Math.min(100, usagePercent)}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>
          <span>{preview.memoriesIncluded} memories included</span>
          <span>{preview.pinnedCount} pinned • {preview.dynamicCount} dynamic</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        {/* Pinned Axioms */}
        <div className="section">
          <div className="section-header">
            <h3>📌 Pinned Axioms</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--tertiary)' }}>Always injected</span>
          </div>
          <div className="memory-list">
            {pinnedAxioms.map(ax => (
              <div key={ax.id} className="memory-card">
                <span className="memory-card-icon">{ax.icon}</span>
                <div className="memory-card-content">
                  <div className="memory-card-text">{ax.content}</div>
                  <div className="memory-card-meta">
                    <span className={`badge ${ax.type.replace('_', '-')}`}>{ax.type.replace('_', ' ')}</span>
                    <span>{(ax.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Retrieval */}
        <div className="section">
          <div className="section-header">
            <h3>🔗 Dynamic Semantic Retrieval</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>By relevance</span>
          </div>
          <div className="memory-list">
            {dynamicRetrieval.map(dr => (
              <div key={dr.id} className="memory-card">
                <span className="memory-card-icon">{dr.icon}</span>
                <div className="memory-card-content">
                  <div className="memory-card-text">{dr.content}</div>
                  <div className="memory-card-meta">
                    <span className={`badge ${dr.type.replace('_', '-')}`}>{dr.type.replace('_', ' ')}</span>
                    <span style={{ color: 'var(--primary)' }}>Score: {dr.score.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Context Block */}
      <div className="section" style={{ marginTop: 'var(--space-4)' }}>
        <div className="section-header">
          <h3>Raw Injection Payload</h3>
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
            Copy
          </button>
        </div>
        <div className="section-body">
          <div className="context-block">{preview.context}</div>
        </div>
      </div>
    </div>
  );
}
