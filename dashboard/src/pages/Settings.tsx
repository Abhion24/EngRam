import { useState } from 'react';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [tokenBudget, setTokenBudget] = useState(2000);
  const [autoIndex, setAutoIndex] = useState(true);
  const [sessionRecording, setSessionRecording] = useState(true);
  const [decayDays, setDecayDays] = useState(30);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
  const [dashboardPort, setDashboardPort] = useState(6173);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export', { method: 'POST' });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project.engram';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export started — check your VS Code extension for the file dialog.');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.engram,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        alert(`Imported ${result.memoriesImported} memories, ${result.sessionsImported} sessions`);
      } catch {
        alert('Failed to import — check file format');
      }
    };
    input.click();
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="subtitle">Configure Engram's memory engine, API connections, and behavior.</p>
      </div>

      <div style={{ maxWidth: '640px' }}>
        {/* API Configuration */}
        <div className="settings-group">
          <div className="settings-group-title">API Configuration</div>
          <div className="section" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <div className="settings-row">
              <div className="settings-label">
                <span>Claude API Key</span>
                <small>Required for memory extraction and embeddings</small>
              </div>
              <input
                type="password"
                className="settings-input"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                id="api-key-input"
              />
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Dashboard Port</span>
                <small>Localhost port for the web dashboard</small>
              </div>
              <input
                type="number"
                className="settings-input"
                value={dashboardPort}
                onChange={(e) => setDashboardPort(parseInt(e.target.value))}
                style={{ width: '100px' }}
                id="port-input"
              />
            </div>
          </div>
        </div>

        {/* Memory Engine */}
        <div className="settings-group">
          <div className="settings-group-title">Memory Engine</div>
          <div className="section" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <div className="settings-row">
              <div className="settings-label">
                <span>Token Budget</span>
                <small>Max tokens injected into Claude's context ({tokenBudget})</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="range"
                  min="500"
                  max="8000"
                  step="100"
                  value={tokenBudget}
                  onChange={(e) => setTokenBudget(parseInt(e.target.value))}
                  id="token-budget-slider"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, minWidth: '45px' }}>
                  {tokenBudget}
                </span>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Confidence Threshold</span>
                <small>Min score for memory injection ({(confidenceThreshold * 100).toFixed(0)}%)</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  id="confidence-slider"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, minWidth: '35px' }}>
                  {(confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Memory Decay Period</span>
                <small>Days before unpinned memories lose weight ({decayDays}d)</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="range"
                  min="7"
                  max="365"
                  step="1"
                  value={decayDays}
                  onChange={(e) => setDecayDays(parseInt(e.target.value))}
                  id="decay-slider"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, minWidth: '35px' }}>
                  {decayDays}d
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="settings-group">
          <div className="settings-group-title">Behavior</div>
          <div className="section" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <div className="settings-row">
              <div className="settings-label">
                <span>Auto-Index Codebase</span>
                <small>Scan and index on first workspace open</small>
              </div>
              <div
                className={`settings-toggle ${autoIndex ? 'active' : ''}`}
                onClick={() => setAutoIndex(!autoIndex)}
                id="auto-index-toggle"
              />
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Session Recording</span>
                <small>Auto-extract memories from Claude Code sessions</small>
              </div>
              <div
                className={`settings-toggle ${sessionRecording ? 'active' : ''}`}
                onClick={() => setSessionRecording(!sessionRecording)}
                id="session-recording-toggle"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="settings-group">
          <div className="settings-group-title">Data Management</div>
          <div className="section" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <div className="settings-row">
              <div className="settings-label">
                <span>Export Memories</span>
                <small>Download all memories as a portable .engram file</small>
              </div>
              <button className="btn btn-primary" onClick={handleExport} id="export-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                Export
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Import Memories</span>
                <small>Load a teammate's .engram file for instant onboarding</small>
              </div>
              <button className="btn btn-secondary" onClick={handleImport} id="import-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                Import
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Clear All Memories</span>
                <small>Permanently delete all memories for this project</small>
              </div>
              <button
                className="btn"
                style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
                onClick={() => {
                  if (confirm('Are you sure? This cannot be undone.')) {
                    fetch('/api/memories', { method: 'DELETE' }).catch(() => {});
                  }
                }}
                id="clear-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_forever</span>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="section" style={{ padding: 'var(--space-4) var(--space-5)', marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--outline)' }}>
            <span>Engram v1.0.0</span>
            <span>Built for Claude Code</span>
          </div>
        </div>
      </div>
    </div>
  );
}
