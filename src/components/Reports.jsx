import React, { useState, useEffect } from 'react'

function Reports() {
  const [monthlyData, setMonthlyData] = useState([])
  const [yearlyData, setYearlyData] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState([])

  useEffect(() => {
    loadReports()
  }, [selectedYear])

  const loadReports = async () => {
    setLoading(true)
    try {
      const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      const prodRes = await fetch(
        `https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/productions?select=id,enquiry_id,grand_total,advance,claim,balance,extra_charge,gst_amount,total,price,quantity,model,status,created_at&order=created_at.desc`,
        { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }
      )
      const allProds = await prodRes.json()
      const prods = allProds || []

      const enqIds = [...new Set(prods.map(p => p.enquiry_id).filter(Boolean))]
      let enqData = []
      if (enqIds.length) {
        const enqRes = await fetch(
          `https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/enquiries?id=in.(${enqIds.join(',')})&select=id,customer_name,order_from,enquiry_date`,
          { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }
        )
        enqData = await enqRes.json() || []
      }

      const availYears = [...new Set(prods.map(p => new Date(p.created_at).getFullYear()).filter(Boolean))].sort()
      setYears(availYears)
      if (!availYears.includes(selectedYear) && availYears.length) {
        setSelectedYear(availYears[availYears.length - 1])
      }

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const monthTotals = months.map((m, i) => {
        const mp = prods.filter(p => { if (!p.created_at) return false; const d = new Date(p.created_at); return d.getFullYear() === parseInt(selectedYear) && d.getMonth() === i })
        return {
          month: m, count: mp.length,
          dispatched: mp.filter(p => p.status === 'dispatched').length,
          grand_total: mp.reduce((s, p) => s + parseFloat(p.grand_total || 0), 0),
          advance: mp.reduce((s, p) => s + parseFloat(p.advance || 0), 0),
          balance: mp.reduce((s, p) => s + parseFloat(p.balance || 0), 0)
        }
      })
      setMonthlyData(monthTotals)

      const yearTotals = availYears.map(y => {
        const yp = prods.filter(p => { if (!p.created_at) return false; return new Date(p.created_at).getFullYear() === y })
        return {
          year: y, count: yp.length,
          dispatched: yp.filter(p => p.status === 'dispatched').length,
          grand_total: yp.reduce((s, p) => s + parseFloat(p.grand_total || 0), 0),
          advance: yp.reduce((s, p) => s + parseFloat(p.advance || 0), 0),
          balance: yp.reduce((s, p) => s + parseFloat(p.balance || 0), 0)
        }
      })
      setYearlyData(yearTotals)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const maxGrand = Math.max(...monthlyData.map(m => m.grand_total), 1)
  const maxBalance = Math.max(...monthlyData.map(m => m.balance), 1)
  const totalGrand = yearlyData.reduce((s, y) => s + y.grand_total, 0)
  const totalAdvance = yearlyData.reduce((s, y) => s + y.advance, 0)
  const totalBalance = yearlyData.reduce((s, y) => s + y.balance, 0)

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading reports...</div>

  return (
    <div>
      <div className="page-header">
        <h1>📊 Reports</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', color: '#8b7355', fontWeight: 700 }}>Year:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
            style={{ padding: '8px 12px', border: '1.5px solid #ddd0c0', borderRadius: '8px', background: 'white' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
            {years.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
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
          <p style={{ color: '#666', fontSize: '13px' }}>Total Orders</p>
        </div>
      </div>

      {/* Bar Chart - Grand Total & Balance by Month */}
      <div className="card">
        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#1a1a2e' }}>📊 Revenue Chart - {selectedYear}</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px', padding: '0 10px', borderBottom: '2px solid #ddd', marginBottom: '8px', position: 'relative' }}>
          {monthlyData.map((m, i) => {
            const gH = Math.max((m.grand_total / maxGrand) * 170, 4)
            const bH = Math.max((m.balance / maxBalance) * 170, 4)
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
                {/* Grand Total bar */}
                <div style={{ width: '60%', background: 'linear-gradient(180deg, #2e7d32, #4caf50)', borderRadius: '4px 4px 0 0', height: gH + 'px', minHeight: '4px', transition: 'height 0.3s', position: 'relative', marginBottom: '2px' }}
                  title={`${m.month}: Grand Total ₹${m.grand_total.toFixed(2)}`}>
                  {m.grand_total > 0 && <span style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '8px', color: '#2e7d32', fontWeight: 700 }}>₹{(m.grand_total / 1000).toFixed(1)}k</span>}
                </div>
                {/* Balance bar */}
                <div style={{ width: '60%', background: 'linear-gradient(180deg, #e65100, #ff9800)', borderRadius: '4px 4px 0 0', height: bH + 'px', minHeight: '4px', transition: 'height 0.3s' }}
                  title={`${m.month}: Balance ₹${m.balance.toFixed(2)}`}>
                </div>
                <span style={{ fontSize: '9px', marginTop: '4px', color: '#666', fontWeight: 600 }}>{m.month}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#666' }}>
          <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4caf50', borderRadius: '2px', marginRight: '4px' }}></span> Grand Total</span>
          <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ff9800', borderRadius: '2px', marginRight: '4px' }}></span> Balance</span>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="card">
        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#1a1a2e' }}>📅 Monthly Breakdown - {selectedYear}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Orders</th>
                <th>Dispatched</th>
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
                  <td>{m.dispatched}</td>
                  <td style={{ color: '#2e7d32', fontWeight: 600 }}>₹{m.grand_total.toFixed(2)}</td>
                  <td style={{ color: '#e94560', fontWeight: 600 }}>₹{m.advance.toFixed(2)}</td>
                  <td style={{ color: '#e65100', fontWeight: 600 }}>₹{m.balance.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f5f0eb', fontWeight: 700 }}>
                <td>Total</td>
                <td>{monthlyData.reduce((s, m) => s + m.count, 0)}</td>
                <td>{monthlyData.reduce((s, m) => s + m.dispatched, 0)}</td>
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
                <th>Dispatched</th>
                <th>Grand Total</th>
                <th>Advance</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No orders yet</td></tr>
              ) : (
                yearlyData.map((y, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{y.year}</td>
                    <td>{y.count}</td>
                    <td>{y.dispatched}</td>
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
                  <td>{yearlyData.reduce((s, y) => s + y.dispatched, 0)}</td>
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