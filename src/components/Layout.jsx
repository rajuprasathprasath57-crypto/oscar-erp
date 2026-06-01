import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

function Layout({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <div className="app">
      <div className="app-ambient" aria-hidden="true" />
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="brand-lockup">
            <img className="brand-logo" src="/logo.png" alt="Oscar Leather" />
            <div>
              <h2>OSCAR LEATHER</h2>
              <p>Products ERP System</p>
            </div>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            <span className="icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/enquiries">
            <span className="icon">📋</span>
            <span>Enquiries</span>
          </NavLink>
          <NavLink to="/production">
            <span className="icon">🏭</span>
            <span>Production</span>
          </NavLink>
          <NavLink to="/dispatch">
            <span className="icon">🚚</span>
            <span>Dispatch</span>
          </NavLink>
          <NavLink to="/reports">
            <span className="icon">📊</span>
            <span>Reports</span>
          </NavLink>
          <a href="#" onClick={handleLogout} className="logout-link">
            <span className="icon">🚪</span>
            <span>Logout</span>
          </a>
        </nav>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
