import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Layout from '../components/Layout';

const Dashboard = () => {
  const [density, setDensity] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiChat, setAiChat] = useState([]);

  useEffect(() => {
    // Initial fetches (Incidents and Orders only)
    const fetchOrders = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/orders');
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders');
      }
    };
    const fetchIncidents = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/incidents');
        const data = await response.json();
        setIncidents(data);
      } catch (err) {
        console.error('Failed to fetch incidents');
      }
    };

    fetchOrders();
    fetchIncidents();
    const interval = setInterval(() => {
      fetchOrders();
      fetchIncidents();
    }, 5000);

    // Setup WebSocket for Alerts
    const socket = io('http://localhost:4000');
    socket.emit('join_room', 'staff-room');
    
    socket.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 5)); // Keep latest 5
    });

    socket.on('crowd_state_update', (state) => {
      if (state && state.density) {
        setDensity(state.density);
      }
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput;
    setAiChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiInput('');

    try {
      const response = await fetch('http://localhost:4000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await response.json();
      setAiChat(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (err) {
      console.error('AI Chat Error');
    }
  };

  const assignIncident = async (id) => {
    try {
      await fetch(`http://localhost:4000/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'Me (Dashboard)', status: 'IN_PROGRESS' })
      });
      // Will auto-refresh on next poll
    } catch (err) {}
  };

  const getDensityColor = (pct) => {
    if (!pct) return 'var(--panel-bg)';
    if (pct < 50) return '#2e7d32'; // Green
    if (pct < 80) return '#f9a825'; // Yellow
    return '#c62828'; // Red
  };
  return (
    <Layout>
      <div className="col-span-12">
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-muted)' }}>Main command center for venue operations.</p>
      </div>
      
      <div className="col-span-8" style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.5rem', minHeight: '300px' }}>
        <h3>Live Heatmap</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Monitor crowd density across all venue zones.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '200px' }}>
          <div style={{ backgroundColor: getDensityColor(density['zone-a']), borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: '#fff', margin: 0 }}>Zone A (Main Stage)</h4>
            <p style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{density['zone-a'] || 0}%</p>
          </div>
          <div style={{ backgroundColor: getDensityColor(density['zone-b']), borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: '#fff', margin: 0 }}>Zone B (Food Court)</h4>
            <p style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{density['zone-b'] || 0}%</p>
          </div>
        </div>
      </div>
      
      <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <h3>Incident Reports</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Live updates from CrowdSync Control.</p>
          
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alerts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent incidents.</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} style={{ padding: '0.75rem', backgroundColor: alert.priority === 'CRITICAL' ? 'var(--alert-bg)' : '#1a1a1a', borderLeft: `3px solid ${alert.priority === 'CRITICAL' ? 'var(--text-alert)' : 'var(--gold-accent)'}`, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  <strong style={{ display: 'block', color: alert.priority === 'CRITICAL' ? 'var(--text-alert)' : 'var(--gold-accent)' }}>{alert.title}</strong>
                  {alert.message}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <h3>Vendor Orders</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Live pre-order queue.</p>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No pending orders.</p>
            ) : (
              orders.map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>{order.id}</strong>
                    <div style={{ color: 'var(--text-muted)' }}>{order.items.length} items (${order.totalAmount.toFixed(2)})</div>
                  </div>
                  <span style={{ color: 'var(--gold-accent)' }}>{order.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3>AI Copilot</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Ask me about the venue state.</p>
          <div style={{ flex: 1, backgroundColor: '#1a1a1a', borderRadius: '4px', padding: '0.5rem', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {aiChat.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? 'var(--gold-accent)' : 'var(--panel-bg)', color: msg.sender === 'user' ? '#000' : 'var(--text-main)', padding: '0.5rem', borderRadius: '4px', maxWidth: '80%', fontSize: '0.875rem' }}>
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleAiSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="e.g. Which zone is crowded?" style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: '#1a1a1a', color: 'var(--text-main)' }} />
            <button type="submit" style={{ backgroundColor: 'var(--gold-accent)', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Ask</button>
          </form>
        </div>
      </div>
      
      {/* Row for Tasks */}
      <div className="col-span-12" style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.5rem', marginTop: '1.5rem' }}>
        <h3>Staff Tasks & Incidents</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage active deployments.</p>
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {incidents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No open incidents.</p>
          ) : (
            incidents.map(inc => (
              <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>{inc.title}</strong>
                  <div style={{ color: 'var(--text-muted)' }}>{inc.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: inc.status === 'OPEN' ? 'var(--text-alert)' : 'var(--gold-accent)' }}>{inc.status} {inc.assignedTo ? `(${inc.assignedTo})` : ''}</span>
                  {inc.status === 'OPEN' && (
                    <button onClick={() => assignIncident(inc.id)} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--gold-accent)', color: 'var(--gold-accent)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>Assign to me</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
