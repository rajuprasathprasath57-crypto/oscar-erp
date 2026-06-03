import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    activeProduction: 0,
    completedProduction: 0,
    pendingDispatch: 0,
    recentEnquiries: []
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const { count: totalEnquiries } = await supabase
        .from('enquiries')
        .select('*', { count: 'exact', head: true })

      const { count: activeProduction } = await supabase
        .from('productions')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'shipping')
        .not('status', 'eq', 'ready')

      const { count: completedProduction } = await supabase
        .from('productions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['ready', 'shipping'])

      const { data: recent } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalEnquiries: totalEnquiries || 0,
        activeProduction: activeProduction || 0,
        completedProduction: completedProduction || 0,
        pendingDispatch: 0,
        recentEnquiries: recent || []
      })
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Loading dashboard...</div>
  }

  const fulfilmentRate = stats.totalEnquiries
    ? Math.round((stats.completedProduction / stats.totalEnquiries) * 100)
    : 0

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div className="hero-panel">
          <div className="hero-copy">
            <span className="hero-eyebrow">Live Operations Desk</span>
            <h1>Oscar Leather ERP</h1>
            <p>Premium control room for enquiries, production, dispatch, and customer delivery tracking.</p>
          </div>
          <div className="hero-metrics">
            <div>
              <span>Total Orders</span>
              <strong>{stats.totalEnquiries}</strong>
            </div>
            <div>
              <span>Fulfilment</span>
              <strong>{fulfilmentRate}%</strong>
            </div>
          </div>
        </div>
        <div className="hero-side">
          <div className="mini-card mini-card-dark">
            <span>Open Work</span>
            <strong>{stats.activeProduction + stats.pendingDispatch}</strong>
            <small>Production + dispatch queue</small>
          </div>
          <div className="mini-card">
            <span>Recent Enquiries</span>
            <strong>{stats.recentEnquiries.length}</strong>
            <small>Latest customer activity</small>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <span className="page-kicker">Business overview and quick actions</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <h3>{stats.totalEnquiries}</h3>
          <p>Total Enquiries</p>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏭</div>
          <h3>{stats.activeProduction}</h3>
          <p>Active Production</p>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <h3>{stats.completedProduction}</h3>
          <p>Completed Production</p>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <h3>{stats.pendingDispatch}</h3>
          <p>Pending Dispatch</p>
        </div>
      </div>

      <div className="dashboard-workspace">
        <div className="card recent-card">
          <div className="card-title-row">
            <h2>Recent Enquiries</h2>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/enquiries')}>View All</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Order From</th>
                <th>Stage</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEnquiries.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No enquiries yet</td></tr>
              ) : (
                stats.recentEnquiries.map((enq) => (
                  <tr key={enq.id}>
                    <td>{enq.enquiry_date}</td>
                    <td style={{ fontWeight: 700 }}>{enq.customer_name}</td>
                    <td><span className="badge badge-info">{enq.order_from}</span></td>
                    <td>
                      <span className={`badge ${
                        enq.stage === 'production' ? 'badge-success' : 
                        enq.stage === 'declined' ? 'badge-danger' : 
                        'badge-warning'
                      }`}>{enq.stage}</span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => navigate('/enquiries')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="action-panel">
          <h2>Quick Actions</h2>
          <button className="action-tile" onClick={() => navigate('/enquiries')}>
            <span>📋</span>
            <strong>New Enquiry</strong>
          </button>
          <button className="action-tile" onClick={() => navigate('/production')}>
            <span>🏭</span>
            <strong>Production</strong>
          </button>
          <button className="action-tile" onClick={() => navigate('/dispatch')}>
            <span>🚚</span>
            <strong>Dispatch</strong>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
