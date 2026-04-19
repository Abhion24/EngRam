import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Memories from './pages/Memories';
import Sessions from './pages/Sessions';
import ContextPreview from './pages/ContextPreview';
import Settings from './pages/Settings';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/memories', label: 'Memories', icon: 'memory' },
  { path: '/sessions', label: 'Sessions', icon: 'history' },
  { path: '/context', label: 'Context Preview', icon: 'visibility' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export default function App() {
  const location = useLocation();

  return (
    <div className="app-layout">
      {/* ─── Sidebar ─────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <span className="logo-title">Engram</span>
            <span className="logo-subtitle">Memory OS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              end={item.path === '/'}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-project">
            <div className="sidebar-project-label">Active Project</div>
            <div className="sidebar-project-name">Project Alpha</div>
          </div>
          <div className="sidebar-session">
            <span className="session-dot"></span>
            <span>Session Active</span>
          </div>
        </div>
        <div className="sidebar-version">v1.0.4</div>
      </aside>

      {/* ─── Main Content ────────────────────────────────── */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/context" element={<ContextPreview />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
