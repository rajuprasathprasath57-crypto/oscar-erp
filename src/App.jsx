import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Enquiries from './components/Enquiries'
import Production from './components/Production'
import Dispatch from './components/Dispatch'
import CustomerTracking from './components/CustomerTracking'
import Login from './components/Login'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('oscar_erp_auth') === 'true'
  )

  const handleLogin = () => {
    setIsAuthenticated(true)
    localStorage.setItem('oscar_erp_auth', 'true')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('oscar_erp_auth')
  }

  return (
    <Routes>
      <Route path="/track/:id" element={<CustomerTracking />} />
      <Route 
        path="/" 
        element={
          isAuthenticated ? 
            <Layout onLogout={handleLogout} /> : 
            <Navigate to="/login" />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="enquiries" element={<Enquiries />} />
        <Route path="production" element={<Production />} />
        <Route path="dispatch" element={<Dispatch />} />
      </Route>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? 
            <Navigate to="/" /> : 
            <Login onLogin={handleLogin} />
        } 
      />
    </Routes>
  )
}

export default App