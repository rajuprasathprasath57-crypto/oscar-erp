import React, { useState, useEffect } from 'react'

function Reports() {
  const [monthlyData, setMonthlyData] = useState([])
  const [yearlyData, setYearlyData] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [selectedYear])

  const loadReports = async () => {
    setLoading(true)
    try {
      const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Get all dispatched productions
      const prodRes = await fetch(
        `https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/productions?status=eq.dispatched&select=id,enquiry_id,grand_total,advance,claim,balance,created_at`,
        { headers: { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY } }
      )
      const allProds = await prodRes.json()
      const dispatched = allProds || []

      // Get all enquiries for customer names
      const enqIds = [...new Set(dispatched.map(p => p.enquiry_id).filter(Boolean))]
      let enqMap = {}
      if (enqIds.length) {
        const enqRes = await fetch(
          `https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/enquiries?id=in.(${enqIds.join(',')})&select=id,customer_name,order_from`,
          { headers: { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY } }
        )
        const enqs = await enqRes.json()
        enqs.forEach(e => { enqMap[e.id] = e.customer_name })
      }

      // Monthly breakdown for selected year
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const monthTotals = months.map((m, i) => {
        const monthProds = dispatched.filter(p => {
          const d = new Date(p.created_at)
          return d.getFullYear() === parseInt(selectedYear) && d.getMonth() === i
        })
        return {
          month: m,
          count: monthProds.length,
          grand_total: monthProds.reduce((s, p) => s + parseFloat(p.grand_total || 0), 0),
          advance: monthProds.reduce((s, p) => s + parseFloat(p.advance || 0), 0),
          balance: monthProds.reduce((s, p) => s + parseFloat(p.balance || 0), 0)
        }
      })
      setMonthlyData(monthTotals)

      // Yearly breakdown
      const years = [...new Set(dispatched.map(p => new Date(p.created_at).getFullYear()))].sort()
      const yearTotals = years.map(y => {
        const yrProds = dispatched.filter(p => new Date(p.created_at).getFullYear() === y)
        return {
          year: y,
          count: yrProds.length,
          grand_total: yrProds.reduce((s, p) => s + parseFloat(p.grand_total || 0), 0),
          advance: yrProds.reduce((s, p) => s + parseFloat(p.advance || 0), 0),
          balance: yrProds.reduce((s, p) => s + parseFloat(p.balance || 0), 0)
        }
      })
      setYearlyData(yearTotals)

    } catch (err) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalGrand = yearlyData.reduce((s, y) => s + y.grand_total, 0)
  const totalAdvance = yearlyData.reduce((s, y) => s + y.advance, 0)
  const totalBalance = yearlyData.reduce((s, y) => s + y.balance, 0)

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading reports...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>📊 Reports</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', color: '#8b7355', fontWeight: 700 }}>Year:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #ddd0c0', borderRadius: '8px', background: 'white' }}>
            {yearlyData.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
            {yearlyData.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>💰</div>
          <h3 style={{ fontSize: '22px', color: '#2e7d32', fontWeight: 700 }}>₹{totalGrand.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          <p style={{ color: '#666', fontSize: '13px' }}>Total Grand Amount</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>💳</div>
          <h3 style={{ fontSize: '22px', color: '#e94560', fontWeight: 700 }}>₹{totalAdvance.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          <p style={{ color: '#666', fontSize: '13px' }}>Total Advance Received</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>📋</div>
          <h3 style={{ fontSize: '22px', color: '#e65100', fontWeight: 700 }}>₹{totalBalance.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          <p style={{ color: '#666', fontSize: '13px' }}>Total Balance Pending</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>📦</div>
          <h3 style={{ fontSize: '22px', color: '#1565c0', fontWeight: 700 }}>{yearlyData.reduce((s, y) => s + y.count, 0)}</h3>
          <p style={{ color: '#666', fontSize: '13px' }}>Total Orders Dispatched</p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="card">
        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#1a1a2e' }}>📅 Monthly Breakdown - {selectedYear}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Orders</th>
                <th>Grand Total</th>
                <th>Advance</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td>{m.count}</td>
                  <td style={{ color: '#2e7d32', fontWeight: 600 }}>₹{m.grand_total.toFixed(2)}</td>
                  <td style={{ color: '#e94560', fontWeight: 600 }}>₹{m.advance.toFixed(2)}</td>
                  <td style={{ color: '#e65100', fontWeight: 600 }}>₹{m.balance.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f5f0eb', fontWeight: 700 }}>
                <td>Total</td>
                <td>{monthlyData.reduce((s, m) => s + m.count, 0)}</td>
                <td style={{ color: '#2e7d32' }}>₹{monthlyData.reduce((s, m) => s + m.grand_total, 0).toFixed(2)}</td>
                <td style={{ color: '#e94560' }}>₹{monthlyData.reduce((s, m) => s + m.advance, 0).toFixed(2)}</td>
                <td style={{ color: '#e65100' }}>₹{monthlyData.reduce((s, m) => s + m.balance, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Yearly Breakdown */}
      <div className="card">
        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#1a1a2e' }}>📆 Yearly Breakdown</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Orders</th>
                <th>Grand Total</th>
                <th>Advance</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No dispatched orders yet</td></tr>
              ) : (
                yearlyData.map((y, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{y.year}</td>
                    <td>{y.count}</td>
                    <td style={{ color: '#2e7d32', fontWeight: 600 }}>₹{y.grand_total.toFixed(2)}</td>
                    <td style={{ color: '#e94560', fontWeight: 600 }}>₹{y.advance.toFixed(2)}</td>
                    <td style={{ color: '#e65100', fontWeight: 600 }}>₹{y.balance.toFixed(2)}</td>
                  </tr>
                ))
              )}
              {yearlyData.length > 0 && (
                <tr style={{ background: '#f5f0eb', fontWeight: 700 }}>
                  <td>Total</td>
                  <td>{yearlyData.reduce((s, y) => s + y.count, 0)}</td>
                  <td style={{ color: '#2e7d32' }}>₹{totalGrand.toFixed(2)}</td>
                  <td style={{ color: '#e94560' }}>₹{totalAdvance.toFixed(2)}</td>
                  <td style={{ color: '#e65100' }}>₹{totalBalance.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports