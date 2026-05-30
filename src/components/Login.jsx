import React, { useState } from 'react'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // Password loaded from environment variable (fallback: oscar2024)
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'oscar2024'
    if (password === adminPassword) {
      onLogin()
    } else {
      setError('Invalid password. Please try again.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png" alt="OSCAR LEATHER" style={{ width: '160px', height: 'auto', background: 'white', padding: '8px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
        <h1>OSCAR LEATHER</h1>
        <p>Products ERP System</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login