import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

function Layout({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      closeSidebar()
    }
  }

  return (
    <div className="app">
      {/* Hamburger button - visible on mobile */}
      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar backdrop - visible on mobile when sidebar is open */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
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
          <NavLink to="/" end onClick={handleNavClick}>
            <span className="icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/enquiries" onClick={handleNavClick}>
            <span className="icon">📋</span>
            <span>Enquiries</span>
          </NavLink>
          <NavLink to="/production" onClick={handleNavClick}>
            <span className="icon">🏭</span>
            <span>Production</span>
          </NavLink>
          <NavLink to="/dispatch" onClick={handleNavClick}>
            <span className="icon">🚚</span>
            <span>Dispatch</span>
          </NavLink>
          <NavLink to="/reports" onClick={handleNavClick}>
            <span className="icon">📊</span>
            <span>Reports</span>
          </NavLink>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout() }} className="logout-link">
            <span className="icon">🚪</span>
            <span>Logout</span>
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout