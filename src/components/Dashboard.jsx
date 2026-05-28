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
    return <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>Loading dashboard...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #3498db' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>{stats.totalEnquiries}</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Total Enquiries</p>
        </div>

        <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #e94560' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏭</div>
          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>{stats.activeProduction}</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Active Production</p>
        </div>

        <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>{stats.completedProduction}</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Completed Production</p>
        </div>

        <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #f39c12' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚚</div>
          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>{stats.pendingDispatch}</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Pending Dispatch</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#1a1a2e' }}>Recent Enquiries</h2>
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
                  <td style={{ fontWeight: 600 }}>{enq.customer_name}</td>
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

      <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#1a1a2e' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/enquiries')}>
            📋 New Enquiry
          </button>
          <button className="btn btn-success" onClick={() => navigate('/production')}>
            🏭 View Production
          </button>
          <button className="btn btn-info" onClick={() => navigate('/dispatch')}>
            🚚 Manage Dispatch
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard