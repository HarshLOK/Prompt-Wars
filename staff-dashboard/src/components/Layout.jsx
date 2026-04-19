import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, LogOut, Grid, AlertTriangle, CheckSquare, Settings } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--void-black)' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: 'var(--panel-bg)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color="var(--gold-accent)" /> 
            CrowdSync
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            Staff Portal
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '0.5rem 1.5rem' }}>
              <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                <Grid size={18} /> Dashboard
              </Link>
            </li>
            <li style={{ padding: '0.5rem 1.5rem' }}>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                <AlertTriangle size={18} /> Incidents
              </a>
            </li>
            <li style={{ padding: '0.5rem 1.5rem' }}>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                <CheckSquare size={18} /> Tasks
              </a>
            </li>
          </ul>
        </nav>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <Settings size={18} /> Settings
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation Bar */}
        <header style={{ height: '60px', backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem' }}>
          <div>
            <Menu size={20} style={{ cursor: 'pointer', color: 'var(--text-main)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Role: </span>
              <span style={{ color: 'var(--gold-accent)', fontFamily: 'var(--font-mono)' }}>{user?.role?.toUpperCase()}</span>
            </div>
            <button 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Page Content with 12-column grid */}
        <main style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div className="grid-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
