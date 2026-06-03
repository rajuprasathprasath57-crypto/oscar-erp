import React, { useState } from 'react'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isShaking, setIsShaking] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Password loaded from environment variable (fallback: OLP123)
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'OLP123'
    if (password === adminPassword) {
      onLogin()
    } else {
      setError('Invalid password. Please try again.')
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 400) // removes shake class after animation ends
    }
  }

  return (
    <div className="login-page">
      <div className="login-ambient" aria-hidden="true" />
      <div className={`login-card ${isShaking ? 'shake' : ''}`}>
        <span className="login-pill">Secure ERP Access</span>
        <img className="login-logo" src="/logo.png" alt="OSCAR LEATHER" />
        <h1>OSCAR LEATHER</h1>
        <p>Products ERP System</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                style={{ marginBottom: 0 }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
