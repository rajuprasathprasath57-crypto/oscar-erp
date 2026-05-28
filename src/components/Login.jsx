import React, { useState } from 'react'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // Simple password protection - change this as needed
    if (password === 'oscar2024') {
      onLogin()
    } else {
      setError('Invalid password. Please try again.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.jpeg" alt="OSCAR LEATHER" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '16px' }} />
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