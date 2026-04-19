import { useState } from 'react';

interface Session {
  id: string;
  startTime: string;
  endTime: string | null;
  filesChanged: string[];
  memoriesExtracted: number;
  summary: string;
}

interface Memory {
  id: string;
  type: string;
  content: string;
  confidence: number;
}

const typeIcons: Record<string, string> = {
  bug_fix: '🐛', decision: '✅', pattern: '🔄',
  warning: '⚠️', preference: '💡', architecture: '🏗️',
};

const demoSessions: Session[] = [
  { id: 'sess_94b2x8a', startTime: new Date(Date.now() - 3600000).toISOString(), endTime: new Date(Date.now() - 1800000).toISOString(), filesChanged: ['src/App.tsx', 'src/components/Header.tsx'], memoriesExtracted: 3, summary: 'Analyzing architecture diagrams for Project Alpha...' },
  { id: 'sess_7d3k1p', startTime: new Date(Date.now() - 7200000).toISOString(), endTime: new Date(Date.now() - 5400000).toISOString(), filesChanged: ['migrations/002_add_columns.sql', 'src/db/schema.ts'], memoriesExtracted: 2, summary: 'Reviewing PR #402 database migration script.' },
  { id: 'sess_2m9f4x', startTime: new Date(Date.now() - 86400000).toISOString(), endTime: new Date(Date.now() - 82800000).toISOString(), filesChanged: ['src/indexer/main.ts', 'src/config.ts'], memoriesExtracted: 4, summary: 'Brainstorming session for new indexing strategy.' },
  { id: 'sess_5p8n2a', startTime: new Date(Date.now() - 172800000).toISOString(), endTime: new Date(Date.now() - 169200000).toISOString(), filesChanged: ['docker-compose.yml'], memoriesExtracted: 1, summary: 'Quick lookup: Docker compose syntax.' },
  { id: 'sess_1k7h3d', startTime: new Date(Date.now() - 259200000).toISOString(), endTime: new Date(Date.now() - 255600000).toISOString(), filesChanged: ['src/api/routes.ts', 'src/middleware/auth.ts', 'src/services/users.ts'], memoriesExtracted: 5, summary: 'Implementing user authentication flow with JWT tokens.' },
];

const demoSessionMemories: Record<string, Memory[]> = {
  'sess_94b2x8a': [
    { id: 'm1', type: 'architecture', content: 'Splitting into Auth, Data Processor, and Web Client is recommended for Project Alpha.', confidence: 0.92 },
    { id: 'm2', type: 'warning', content: 'API Gateway could become a single point of failure if not properly load-balanced.', confidence: 0.85 },
    { id: 'm3', type: 'decision', content: 'Inter-service communication: gRPC for synchronous calls, async event streams for non-critical paths.', confidence: 0.88 },
  ],
  'sess_7d3k1p': [
    { id: 'm4', type: 'decision', content: 'Added nullable columns to users table — avoids breaking existing data.', confidence: 0.9 },
    { id: 'm5', type: 'pattern', content: 'All migrations follow timestamp naming: YYYYMMDD_description.sql', confidence: 0.87 },
  ],
};

export default function Sessions() {
  const [sessions] = useState<Session[]>(demoSessions);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Active';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Sessions</h1>
        <p className="subtitle">Claude Code session history with extracted memories and file changes.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1fr' : '1fr', gap: 'var(--space-4)' }}>
        {/* Sessions List */}
        <div className="section">
          <div className="section-header">
            <h3>Recent Sessions</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{sessions.length} sessions</span>
          </div>
          {sessions.map(sess => (
            <div
              key={sess.id}
              className="session-item"
              onClick={() => setSelectedSession(sess.id === selectedSession ? null : sess.id)}
              style={selectedSession === sess.id ? { backgroundColor: 'var(--surface-high)' } : {}}
            >
              <div className="session-item-icon">
                <span className="material-symbols-outlined">terminal</span>
              </div>
              <div className="session-item-content">
                <div className="session-item-title">{sess.summary}</div>
                <div className="session-item-meta">
                  ID: {sess.id} • {formatDate(sess.startTime)} {formatTime(sess.startTime)} UTC
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="session-item-badge">{sess.memoriesExtracted} memories</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--outline)', marginTop: '2px' }}>
                  {getDuration(sess.startTime, sess.endTime)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Session Detail */}
        {selectedSession && (
          <div className="fade-in">
            {/* Session Info */}
            <div className="section">
              <div className="section-header">
                <h3>Session Detail</h3>
                <button className="btn-icon" onClick={() => setSelectedSession(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="section-body">
                {(() => {
                  const sess = sessions.find(s => s.id === selectedSession);
                  if (!sess) return null;
                  return (
                    <>
                      <p style={{ fontSize: '0.9rem', color: 'var(--on-surface)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                        {sess.summary}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--on-surface)' }}>{getDuration(sess.startTime, sess.endTime)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Files Changed</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--on-surface)' }}>{sess.filesChanged.length}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 'var(--space-4)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
                          Changed Files
                        </div>
                        {sess.filesChanged.map((f, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontFamily: "'JetBrains Mono', monospace", padding: '2px 0' }}>
                            {f}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Extracted Memories */}
            <div className="section" style={{ marginTop: 'var(--space-4)' }}>
              <div className="section-header">
                <h3>Extracted Memories</h3>
              </div>
              <div className="memory-list">
                {(demoSessionMemories[selectedSession] || []).map(mem => (
                  <div key={mem.id} className="memory-card">
                    <span className="memory-card-icon">{typeIcons[mem.type] || '📝'}</span>
                    <div className="memory-card-content">
                      <div className="memory-card-text">{mem.content}</div>
                      <div className="memory-card-meta">
                        <span className={`badge ${mem.type.replace('_', '-')}`}>{mem.type.replace('_', ' ')}</span>
                        <span>{(mem.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!(demoSessionMemories[selectedSession]?.length) && (
                  <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <span className="material-symbols-outlined">memory</span>
                    <p>No memories extracted from this session</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
