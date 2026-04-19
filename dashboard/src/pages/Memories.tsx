import { useState, useEffect } from 'react';

interface Memory {
  id: string;
  type: string;
  content: string;
  fileRefs: string[];
  timestamp: string;
  confidence: number;
  pinned: boolean;
  tags: string[];
  sessionId: string;
}

const typeIcons: Record<string, string> = {
  bug_fix: '🐛', decision: '✅', pattern: '🔄',
  warning: '⚠️', preference: '💡', architecture: '🏗️',
};

const typeFilters = ['all', 'bug_fix', 'decision', 'pattern', 'warning', 'preference', 'architecture'];

const demoMemories: Memory[] = [
  { id: '1', type: 'architecture', content: 'Project uses React 18 + TypeScript with Vite as build tool. Strict mode enabled. All components use functional patterns with hooks.', fileRefs: ['package.json', 'tsconfig.json'], timestamp: new Date(Date.now() - 3600000).toISOString(), confidence: 0.95, pinned: true, tags: ['auto-indexed', 'fingerprint'], sessionId: 'indexer' },
  { id: '2', type: 'decision', content: 'Updated routing configuration in App.tsx — switched from BrowserRouter to HashRouter for VS Code extension webview compatibility.', fileRefs: ['src/App.tsx'], timestamp: new Date(Date.now() - 7200000).toISOString(), confidence: 0.92, pinned: false, tags: [], sessionId: 'sess_1' },
  { id: '3', type: 'bug_fix', content: 'Fixed auth middleware on /api/users endpoint. The Bearer token was not being validated against the refresh token store, allowing expired sessions.', fileRefs: ['src/api/auth.ts', 'src/middleware/auth.ts'], timestamp: new Date(Date.now() - 10800000).toISOString(), confidence: 0.95, pinned: true, tags: ['security'], sessionId: 'sess_2' },
  { id: '4', type: 'pattern', content: 'All API handlers follow the Controller → Service → Repository pattern. Never access DB directly from controllers.', fileRefs: ['src/api/'], timestamp: new Date(Date.now() - 14400000).toISOString(), confidence: 0.88, pinned: true, tags: ['convention'], sessionId: 'sess_2' },
  { id: '5', type: 'warning', content: 'WatermelonDB sync requires exact column name matching between local schema and Supabase tables. Mismatches cause silent data loss.', fileRefs: ['src/db/schema.ts', 'src/sync/pullChanges.ts'], timestamp: new Date(Date.now() - 18000000).toISOString(), confidence: 0.78, pinned: false, tags: [], sessionId: 'sess_3' },
  { id: '6', type: 'preference', content: 'Use CSS Grid for page-level layouts and Flexbox for component internals. Avoid mixing them at the same hierarchy level.', fileRefs: ['src/styles/'], timestamp: new Date(Date.now() - 21600000).toISOString(), confidence: 0.85, pinned: false, tags: ['style'], sessionId: 'sess_3' },
  { id: '7', type: 'architecture', content: 'Database migration files are in /migrations/ with timestamp prefixes. Always create a new migration — never modify existing ones.', fileRefs: ['migrations/'], timestamp: new Date(Date.now() - 86400000).toISOString(), confidence: 0.9, pinned: true, tags: ['convention'], sessionId: 'sess_4' },
  { id: '8', type: 'bug_fix', content: 'Edge case in appointment scheduling: overlapping time slots were not being detected when an appointment spans midnight. Added UTC normalization.', fileRefs: ['src/services/appointments.ts'], timestamp: new Date(Date.now() - 172800000).toISOString(), confidence: 0.91, pinned: false, tags: [], sessionId: 'sess_5' },
];

export default function Memories() {
  const [memories, setMemories] = useState<Memory[]>(demoMemories);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      if (data.memories?.length > 0) setMemories(data.memories);
    } catch { /* use demo data */ }
  };

  const filteredMemories = memories.filter(m => {
    if (activeFilter !== 'all' && m.type !== activeFilter) return false;
    if (search && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePin = async (id: string) => {
    try {
      await fetch(`/api/memories/${id}/pin`, { method: 'POST' });
    } catch { /* offline */ }
    setMemories(prev => prev.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m));
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    } catch { /* offline */ }
    setMemories(prev => prev.filter(m => m.id !== id));
    if (selectedMemory?.id === id) setSelectedMemory(null);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Memories</h1>
        <p className="subtitle">All extracted memories from Claude Code sessions. Search, filter, pin, or edit.</p>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder="Search memories by content, file, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="memory-search"
        />
      </div>

      {/* Filter */}
      <div className="filter-bar">
        {typeFilters.map(f => (
          <button
            key={f}
            className={`filter-chip ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f === 'all' ? 'All' : `${typeIcons[f] || ''} ${f.replace('_', ' ')}`}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
          {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedMemory ? '1fr 1fr' : '1fr', gap: 'var(--space-4)' }}>
        {/* Memory List */}
        <div className="section">
          <div className="memory-list">
            {filteredMemories.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">memory</span>
                <p>No memories match your filters</p>
              </div>
            ) : (
              filteredMemories.map(mem => (
                <div
                  key={mem.id}
                  className="memory-card"
                  onClick={() => setSelectedMemory(mem)}
                  style={selectedMemory?.id === mem.id ? { backgroundColor: 'var(--surface-high)' } : {}}
                >
                  <span className="memory-card-icon">{typeIcons[mem.type] || '📝'}</span>
                  <div className="memory-card-content">
                    <div className="memory-card-text">{mem.content}</div>
                    <div className="memory-card-meta">
                      <span className={`badge ${mem.type.replace('_', '-')}`}>{mem.type.replace('_', ' ')}</span>
                      <span>{formatTime(mem.timestamp)}</span>
                      <span>{(mem.confidence * 100).toFixed(0)}%</span>
                      {mem.pinned && <span className="badge pinned">📌</span>}
                    </div>
                  </div>
                  <div className="memory-card-actions">
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handlePin(mem.id); }}
                      title={mem.pinned ? 'Unpin' : 'Pin'}>
                      <span className="material-symbols-outlined">{mem.pinned ? 'push_pin' : 'push_pin'}</span>
                    </button>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(mem.id); }}
                      title="Delete">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Memory Detail Panel */}
        {selectedMemory && (
          <div className="section fade-in">
            <div className="section-header">
              <h3>Memory Detail</h3>
              <button className="btn-icon" onClick={() => setSelectedMemory(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="section-body">
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <span className={`badge ${selectedMemory.type.replace('_', '-')}`} style={{ marginBottom: 'var(--space-2)', display: 'inline-flex' }}>
                  {typeIcons[selectedMemory.type]} {selectedMemory.type.replace('_', ' ')}
                </span>
                <p style={{ fontSize: '0.9rem', color: 'var(--on-surface)', lineHeight: 1.6, marginTop: 'var(--space-2)' }}>
                  {selectedMemory.content}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
                    Linked Files
                  </div>
                  {selectedMemory.fileRefs.map((f, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontFamily: "'JetBrains Mono', monospace", padding: '2px 0' }}>
                      {f}
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
                    Confidence
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--surface-highest)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${selectedMemory.confidence * 100}%`, background: 'var(--gradient-cta)', borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {(selectedMemory.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
                    Session
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{selectedMemory.sessionId}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
                    Timestamp
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                    {new Date(selectedMemory.timestamp).toLocaleString()}
                  </div>
                </div>

                {selectedMemory.tags.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
                      Tags
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {selectedMemory.tags.map((t, i) => (
                        <span key={i} className="badge">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
                <button className="btn btn-primary" onClick={() => handlePin(selectedMemory.id)}>
                  {selectedMemory.pinned ? '📌 Unpin' : '📌 Pin Memory'}
                </button>
                <button className="btn btn-secondary" onClick={() => handleDelete(selectedMemory.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
