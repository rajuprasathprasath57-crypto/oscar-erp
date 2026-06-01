import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const ORDER_SOURCES = [
  'facebook', 'instagram', 'youtube', 'indiamart', 
  'direct', 'referral', 'agent', 'local agent', 'google', 'others'
]

function Enquiries() {
  const [enquiries, setEnquiries] = useState([])
  const [binItems, setBinItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMTPModal, setShowMTPModal] = useState(false)
  const [selectedEnquiry, setSelectedEnquiry] = useState(null)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showBin, setShowBin] = useState(false)

  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [searchName, setSearchName] = useState('')

  const [form, setForm] = useState({
    order_from: 'direct',
    enquiry_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    location: '',
    state: '',
    contact: '',
    mobile: '',
    quotation: false,
    dtp: false,
    stage: 'enquiry',
    notes: ''
  })

  const [mtpForm, setMtpForm] = useState({
    model: '',
    quantity: '',
    price: '',
    total: 0,
    extra_charge: '',
    gst_percentage: 0,
    gst_amount: 0,
    grand_total: 0,
    advance: '',
    claim: '',
    balance: 0
  })

  const navigate = useNavigate()

  // Load all data on mount
  useEffect(() => {
    loadEnquiries()
    loadBin()
  }, [])

  const loadEnquiries = async () => {
    setLoading(true)
    try {
      let q = supabase.from('enquiries').select('*').neq('stage', 'deleted').order('created_at', { ascending: false })
      if (filterMonth) {
        q = q.gte('enquiry_date', `${filterYear || '2024'}-${filterMonth}-01`)
        q = q.lte('enquiry_date', `${filterYear || '2024'}-${filterMonth}-${new Date(filterYear || '2024', parseInt(filterMonth), 0).getDate()}`)
      }
      if (filterYear && !filterMonth) {
        q = q.gte('enquiry_date', `${filterYear}-01-01`).lte('enquiry_date', `${filterYear}-12-31`)
      }
      if (searchName) q = q.ilike('customer_name', `%${searchName}%`)
      const { data, error } = await q
      if (error) throw error
      setEnquiries(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadBin = async () => {
    try {
      const { data, error } = await supabase.from('enquiries').select('*').eq('stage', 'deleted').order('created_at', { ascending: false })
      if (error) throw error
      setBinItems(data || [])
    } catch (err) { console.error(err) }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_name.trim()) { setMsg({ text: 'Customer name is required!', type: 'error' }); return }
    try {
      const { error } = await supabase.rpc('create_enquiry', {
        p_order_from: form.order_from, p_enquiry_date: form.enquiry_date, p_customer_name: form.customer_name,
        p_location: form.location || null, p_state: form.state || null, p_contact: form.contact || null,
        p_mobile: form.mobile || null, p_quotation: form.quotation, p_dtp: form.dtp, p_stage: form.stage, p_notes: form.notes || null
      })
      if (error) throw error
      setMsg({ text: 'Enquiry created successfully!', type: 'success' })
      setShowForm(false)
      setForm({ order_from: 'direct', enquiry_date: new Date().toISOString().split('T')[0], customer_name: '', location: '', state: '', contact: '', mobile: '', quotation: false, dtp: false, stage: 'enquiry', notes: '' })
      loadEnquiries()
    } catch (err) { setMsg({ text: 'Error creating enquiry: ' + err.message, type: 'error' }) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Move this enquiry to bin?')) return
    try {
      const { error } = await supabase.from('enquiries').update({ stage: 'deleted' }).eq('id', id)
      if (error) throw error
      setMsg({ text: 'Moved to bin!', type: 'success' })
      await loadEnquiries()
      await loadBin()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const handleRestore = async (id) => {
    try {
      const { error } = await supabase.from('enquiries').update({ stage: 'enquiry' }).eq('id', id)
      if (error) throw error
      setMsg({ text: 'Restored successfully!', type: 'success' })
      await loadEnquiries()
      await loadBin()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const handlePermanentDelete = async (id) => {
    if (!confirm('Permanently delete this enquiry? This cannot be undone!')) return
    try {
      const { error } = await supabase.from('enquiries').delete().eq('id', id)
      if (error) throw error
      setMsg({ text: 'Permanently deleted!', type: 'success' })
      await loadBin()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const handleDecline = async (id) => {
    if (!confirm('Decline this enquiry?')) return
    try {
      await supabase.from('enquiries').update({ stage: 'declined' }).eq('id', id)
      setMsg({ text: 'Enquiry declined!', type: 'success' })
      loadEnquiries()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const openMTPModal = (enquiry) => {
    setSelectedEnquiry(enquiry)
    setMtpForm({ model: '', quantity: '', price: '', total: 0, extra_charge: '', gst_percentage: 0, gst_amount: 0, grand_total: 0, advance: '', claim: '', balance: 0 })
    setShowMTPModal(true)
    document.body.classList.add('modal-open')
  }

  const handleMtpFormChange = (e) => {
    const { name, value } = e.target
    setMtpForm(prev => {
      const u = { ...prev, [name]: value }
      const qty = parseFloat(name === 'quantity' ? value : prev.quantity) || 0
      const price = parseFloat(name === 'price' ? value : prev.price) || 0
      const extra = parseFloat(name === 'extra_charge' ? value : prev.extra_charge) || 0
      const gstPct = name === 'gst_percentage' ? parseFloat(value) || 0 : (parseFloat(prev.gst_percentage) || 0)
      const total = qty * price
      const gstAmt = (total + extra) * (gstPct / 100)
      u.total = total
      u.gst_amount = gstAmt
      u.grand_total = total + extra + gstAmt
      const adv = parseFloat(name === 'advance' ? value : prev.advance) || 0
      const clm = parseFloat(name === 'claim' ? value : prev.claim) || 0
      u.balance = (total + extra + gstAmt) - adv - clm
      return u
    })
  }

  const closeMTPModal = () => {
    setShowMTPModal(false)
    document.body.classList.remove('modal-open')
  }

  const handleMTPSubmit = async (e) => {
    e.preventDefault()
    if (!mtpForm.model.trim()) { setMsg({ text: 'Model name is required!', type: 'error' }); return }
    if (!mtpForm.quantity || !mtpForm.price) { setMsg({ text: 'Quantity and Price are required!', type: 'error' }); return }
    try {
      const insertData = {
        enquiry_id: selectedEnquiry.id,
        model: mtpForm.model,
        quantity: parseInt(mtpForm.quantity) || 1,
        price: parseFloat(mtpForm.price) || 0,
        total: parseFloat(mtpForm.total) || 0,
        extra_charge: parseFloat(mtpForm.extra_charge) || 0,
        gst_percentage: parseInt(mtpForm.gst_percentage) || 0,
        gst_amount: parseFloat(mtpForm.gst_amount) || 0,
        grand_total: parseFloat(mtpForm.grand_total) || 0,
        advance: parseFloat(mtpForm.advance) || 0,
        claim: parseFloat(mtpForm.claim) || 0,
        balance: parseFloat(mtpForm.balance) || 0
      }
      await supabase.from('enquiries').update({ stage: 'production' }).eq('id', selectedEnquiry.id)
      const { error } = await supabase.from('productions').insert([insertData])
      if (error) throw error
      setMsg({ text: 'Moved to Production successfully!', type: 'success' })
      closeMTPModal(); setSelectedEnquiry(null); loadEnquiries()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const getBadge = (s) => {
    const m = { enquiry: 'badge-warning', production: 'badge-success', declined: 'badge-danger' }
    return <span className={`badge ${m[s] || 'badge-secondary'}`}>{s}</span>
  }

  return (
    <div className="erp-page enquiries-page">
      <div className="page-header">
        <div>
          <h1>Enquiries {showBin ? '(Bin)' : ''}</h1>
          <span className="page-kicker">Capture leads, qualify customers, and move orders into production.</span>
        </div>
        <div className="page-actions">
          <button className={`btn ${showBin ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              if (showBin) { setShowBin(false); return }
              fetch('https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/enquiries?stage=eq.deleted&order=created_at.desc', {
                headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: 'Bearer ' + import.meta.env.VITE_SUPABASE_ANON_KEY }
              })
              .then(r => r.json())
              .then(data => { setBinItems(data || []); setShowBin(true) })
              .catch(() => setShowBin(true))
            }}>
            🗑️ {showBin ? 'Back to Enquiries' : `Bin (${binItems.length})`}
          </button>
          {!showBin && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Close' : '➕ New Enquiry'}
            </button>
          )}
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type}`}>
          {msg.text}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setMsg({ text: '', type: '' })}>×</button>
        </div>
      )}

      {!showBin && showForm && (
        <div className="card form-card">
          <h2>New Enquiry Form</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group"><label>Order From *</label>
                <select name="order_from" value={form.order_from} onChange={handleFormChange}>
                  {ORDER_SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Date *</label><input type="date" name="enquiry_date" value={form.enquiry_date} onChange={handleFormChange} required /></div>
              <div className="form-group"><label>Customer Name *</label><input type="text" name="customer_name" value={form.customer_name} onChange={handleFormChange} placeholder="Customer name" required /></div>
              <div className="form-group"><label>Location</label><input type="text" name="location" value={form.location} onChange={handleFormChange} placeholder="Location" /></div>
              <div className="form-group"><label>State</label><input type="text" name="state" value={form.state} onChange={handleFormChange} placeholder="State" /></div>
              <div className="form-group"><label>Mobile</label><input type="text" name="mobile" value={form.mobile} onChange={handleFormChange} /></div>
              <div className="form-group" style={{ flexDirection: 'row', gap: '16px' }}>
                <label><input type="checkbox" name="quotation" checked={form.quotation} onChange={handleFormChange} /> Quotation</label>
                <label><input type="checkbox" name="dtp" checked={form.dtp} onChange={handleFormChange} /> DTP</label>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Notes</label><textarea name="notes" value={form.notes} onChange={handleFormChange} /></div>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-success">Save</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {!showBin && (
        <>
          <div className="filter-bar">
            <div className="form-group"><label>Month</label>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                <option value="">All</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Year</label>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All</option>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Search</label><input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Name..." /></div>
            <button className="btn btn-primary" onClick={loadEnquiries}>🔍 Search</button>
            {(filterMonth || filterYear || searchName) && <button className="btn btn-outline" onClick={() => { setFilterMonth(''); setFilterYear(''); setSearchName(''); loadEnquiries() }}>Clear</button>}
          </div>

          <div className="card data-card" style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>ID</th><th>Date</th><th>Source</th><th>Customer</th><th>Location</th><th>Contact</th><th>Quotation</th><th>DTP</th><th>Stage</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Loading...</td></tr>
                : enquiries.length === 0 ? <tr><td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No enquiries found</td></tr>
                : enquiries.map(enq => (
                    <tr key={enq.id}>
                      <td style={{ fontWeight: 600 }}>OLP#{enq.id}</td>
                      <td>{enq.enquiry_date}</td>
                      <td><span className="badge badge-info">{enq.order_from}</span></td>
                      <td style={{ fontWeight: 600 }}>{enq.customer_name}</td>
                      <td>{enq.location || '-'}{enq.state ? ` / ${enq.state}` : ''}</td>
                      <td>{enq.mobile || enq.contact || '-'}</td>
                      <td>{enq.quotation ? '✅' : '❌'}</td>
                      <td>{enq.dtp ? '✅' : '❌'}</td>
                      <td>{getBadge(enq.stage)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {enq.stage === 'enquiry' && <>
                            <button className="btn btn-sm btn-success" onClick={() => openMTPModal(enq)}>📦 MTP</button>
                            <button className="btn btn-sm btn-warning" onClick={() => handleDecline(enq.id)}>✕ Decline</button>
                          </>}
                          {enq.stage === 'production' && <button className="btn btn-sm btn-info" onClick={() => navigate('/production')}>👁 Production</button>}
                          {enq.stage === 'declined' && <span className="badge badge-danger">Declined</span>}
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(enq.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showBin && (
        <div className="card data-card">
          <h2>🗑️ Enquiry Bin</h2>
          {binItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Bin is empty</p>
          ) : (
            <table>
              <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Source</th><th>Location</th><th>Contact</th><th>Actions</th></tr></thead>
              <tbody>
                {binItems.map(item => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td>{item.enquiry_date}</td>
                    <td style={{ fontWeight: 600 }}>{item.customer_name}</td>
                    <td><span className="badge badge-secondary">{item.order_from}</span></td>
                    <td>{item.location || '-'}</td>
                    <td>{item.mobile || item.contact || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-success" onClick={() => handleRestore(item.id)}>♻️ Restore</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete(item.id)}>🗑️ Delete Forever</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showMTPModal && (
        <div className="modal-overlay" onClick={closeMTPModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📦 Move to Production</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>Customer: <strong>{selectedEnquiry?.customer_name}</strong> | Date: <strong>{selectedEnquiry?.enquiry_date}</strong></p>
            <form onSubmit={handleMTPSubmit}>
              <div className="form-grid">
                <div className="form-group"><label>Model *</label><input type="text" name="model" value={mtpForm.model} onChange={handleMtpFormChange} required /></div>
                <div className="form-group"><label>Qty</label><input type="number" name="quantity" value={mtpForm.quantity} onChange={handleMtpFormChange} min="1" /></div>
                <div className="form-group"><label>Price</label><input type="number" name="price" value={mtpForm.price} onChange={handleMtpFormChange} min="0" step="0.01" /></div>
                <div className="form-group"><label>Total</label><input type="number" value={mtpForm.total.toFixed(2)} disabled /></div>
                <div className="form-group"><label>Extra</label><input type="number" name="extra_charge" value={mtpForm.extra_charge} onChange={handleMtpFormChange} min="0" step="0.01" /></div>
                <div className="form-group"><label>GST %</label>
                  <select name="gst_percentage" value={mtpForm.gst_percentage} onChange={handleMtpFormChange}>
                    <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
                <div className="form-group"><label>GST Amt</label><input type="number" value={mtpForm.gst_amount.toFixed(2)} disabled /></div>
                <div className="form-group"><label>Grand Total</label><input type="number" value={mtpForm.grand_total.toFixed(2)} disabled style={{ fontWeight: 700, color: '#2e7d32' }} /></div>
                <div className="form-group"><label>Advance</label><input type="number" name="advance" value={mtpForm.advance} onChange={handleMtpFormChange} min="0" step="0.01" /></div>
                <div className="form-group"><label>Claim</label><input type="number" name="claim" value={mtpForm.claim} onChange={handleMtpFormChange} min="0" step="0.01" /></div>
                <div className="form-group"><label>Balance</label><input type="number" value={mtpForm.balance.toFixed(2)} disabled style={{ fontWeight: 700, color: '#e65100' }} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeMTPModal}>Cancel</button>
                <button type="submit" className="btn btn-success">✅ Confirm MTP</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Enquiries
