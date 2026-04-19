import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' }}>
      <div style={{ padding: '2rem', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #D4AF37', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ color: '#D4AF37', textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'Arial, sans-serif' }}>CrowdSync Staff Portal</h2>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', color: '#ff4444', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0A0A0A', border: '1px solid #333', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0A0A0A', border: '1px solid #333', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            type="submit"
            style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: '#D4AF37', 
              color: '#000', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Authenticate
          </button>
        </form>
        <p style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>
          Restricted Access. Authorized Personnel Only.
        </p>
      </div>
    </div>
  );
};

export default Login;
