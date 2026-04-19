import { useState, useEffect } from 'react';

interface Stats {
  totalMemories: number;
  pinnedCount: number;
  byType: Record<string, number>;
  avgConfidence: number;
  recentSessionCount: number;
  topFiles: Array<{ file: string; count: number }>;
  healthScore: number;
}

interface Memory {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  confidence: number;
  pinned: boolean;
}

const typeIcons: Record<string, string> = {
  bug_fix: '🐛',
  decision: '✅',
  pattern: '🔄',
  warning: '⚠️',
  preference: '💡',
  architecture: '🏗️',
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data.stats);
    } catch {
      // Use demo data when API is unavailable
      setStats({
        totalMemories: 47,
        pinnedCount: 5,
        byType: { bug_fix: 8, decision: 15, pattern: 10, warning: 4, preference: 5, architecture: 5 },
        avgConfidence: 0.82,
        recentSessionCount: 3,
        topFiles: [
          { file: 'src/App.tsx', count: 12 },
          { file: 'src/api/routes.ts', count: 8 },
          { file: 'src/db/schema.ts', count: 6 },
        ],
        healthScore: 94,
      });
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/memories?limit=6');
      const data = await res.json();
      setRecentMemories(data.memories?.slice(0, 6) || []);
    } catch {
      setRecentMemories([
        { id: '1', type: 'decision', content: 'Updated routing configuration in App.tsx to use hash-based routing for extension compatibility', timestamp: new Date(Date.now() - 3600000).toISOString(), confidence: 0.92, pinned: false },
        { id: '2', type: 'architecture', content: 'Defined new primary color tokens in the design system — Luminous Indigo (#C0C1FF) as primary accent', timestamp: new Date(Date.now() - 7200000).toISOString(), confidence: 0.88, pinned: true },
        { id: '3', type: 'bug_fix', content: 'Added auth middleware to user routes — fixed unauthorized access to /api/users endpoint', timestamp: new Date(Date.now() - 10800000).toISOString(), confidence: 0.95, pinned: false },
        { id: '4', type: 'warning', content: 'Detected 4 orphaned dependency files in node_modules — consider running npm prune', timestamp: new Date(Date.now() - 14400000).toISOString(), confidence: 0.7, pinned: false },
        { id: '5', type: 'pattern', content: 'Compiled successfully with 0 warnings — all TypeScript strict checks passing', timestamp: new Date(Date.now() - 18000000).toISOString(), confidence: 0.85, pinned: false },
        { id: '6', type: 'architecture', content: 'Refactored layout components to use CSS Grid instead of Flexbox for main dashboard grid', timestamp: new Date(Date.now() - 21600000).toISOString(), confidence: 0.9, pinned: false },
      ]);
    }
  };

  const healthScore = stats?.healthScore ?? 94;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (healthScore / 100) * circumference;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">System overview and memory accrual metrics</p>
      </div>

      {/* ─── Stat Cards ────────────────────────────────────── */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-label">Total Memories</div>
          <div className="stat-card-value">{stats?.totalMemories ?? 47}</div>
          <div className="stat-card-sub">{stats?.pinnedCount ?? 5} pinned</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Active Sessions</div>
          <div className="stat-card-value">{stats?.recentSessionCount ?? 3}</div>
          <div className="stat-card-sub">Last 7 days</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Avg Confidence</div>
          <div className="stat-card-value">{((stats?.avgConfidence ?? 0.82) * 100).toFixed(0)}%</div>
          <div className="stat-card-sub">Signal quality</div>
        </div>

        {/* Health Gauge */}
        <div className="health-gauge">
          <div className="health-gauge-ring">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle className="gauge-bg" cx="50" cy="50" r="42" />
              <circle
                className="gauge-fill"
                cx="50" cy="50" r="42"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="health-gauge-value">{healthScore}%</div>
          </div>
          <div className="health-gauge-label">System Health</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        {/* ─── Memory Accrual Chart Placeholder ────────────── */}
        <div className="section">
          <div className="section-header">
            <h3>Memory Accrual</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>Last 30 days</span>
          </div>
          <div className="section-body">
            <div style={{
              height: '160px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '3px',
              padding: '0 4px',
            }}>
              {Array.from({ length: 30 }, (_, i) => {
                const height = Math.max(8, Math.random() * 100 + (i > 20 ? 40 : 0));
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: `linear-gradient(180deg, rgba(192, 193, 255, 0.3) 0%, rgba(192, 193, 255, 0.05) 100%)`,
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Recent Extractions ──────────────────────────── */}
        <div className="section">
          <div className="section-header">
            <h3>Recent Extractions</h3>
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>View All</button>
          </div>
          <div className="memory-list">
            {recentMemories.map((mem) => (
              <div key={mem.id} className="memory-card">
                <span className="memory-card-icon">{typeIcons[mem.type] || '📝'}</span>
                <div className="memory-card-content">
                  <div className="memory-card-text">{mem.content}</div>
                  <div className="memory-card-meta">
                    <span className={`badge ${mem.type.replace('_', '-')}`}>{mem.type.replace('_', ' ')}</span>
                    <span>{formatTime(mem.timestamp)}</span>
                    <span>{(mem.confidence * 100).toFixed(0)}%</span>
                    {mem.pinned && <span className="badge pinned">📌 pinned</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Top Referenced Files ──────────────────────────── */}
      <div className="section" style={{ marginTop: 'var(--space-4)' }}>
        <div className="section-header">
          <h3>Top Referenced Files</h3>
        </div>
        <div className="section-body">
          {(stats?.topFiles || [
            { file: 'src/App.tsx', count: 12 },
            { file: 'src/api/routes.ts', count: 8 },
            { file: 'src/db/schema.ts', count: 6 },
            { file: 'src/components/Layout.tsx', count: 5 },
            { file: 'src/utils/helpers.ts', count: 4 },
          ]).map((f, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-2) 0',
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>{f.file}</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--primary)',
                minWidth: '40px',
                textAlign: 'right',
              }}>{f.count} refs</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
