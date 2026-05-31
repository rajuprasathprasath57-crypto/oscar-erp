import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Dispatch() {
  const [productions, setProductions] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [selectedProd, setSelectedProd] = useState(null)
  const [dispatchForm, setDispatchForm] = useState({ courier_name: '', tracking_id: '', photo_urls: [] })
  const [uploading, setUploading] = useState(false)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [claimEditModal, setClaimEditModal] = useState(false)
  const [claimEditProd, setClaimEditProd] = useState(null)
  const [claimEditVal, setClaimEditVal] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Ready productions
      const pRes = await fetch('https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/productions?status=eq.ready&select=id,model,quantity,enquiry_id&order=created_at.desc', {
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
      })
      const prods = await pRes.json()
      if (prods && prods.length) {
        const eIds = [...new Set(prods.map(p => p.enquiry_id))]
        const eRes = await fetch(`https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/enquiries?id=in.(${eIds.join(',')})&select=id,customer_name,mobile,location,state`, {
          headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
        })
        const enqs = await eRes.json()
        enqs.forEach(e => prods.filter(p => p.enquiry_id === e.id).forEach(p => p.customer = e))
      }
      setProductions(prods || [])

      // Dispatched history
      const dRes = await fetch('https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/dispatch?order=created_at.desc&select=id,production_id,enquiry_id,courier_name,tracking_id,photo_urls,created_at', {
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
      })
      let dData = await dRes.json()
      
      if (dData && dData.length) {
        const pIds = [...new Set(dData.map(d => d.production_id))]
        const pRes2 = await fetch(`https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/productions?id=in.(${pIds.join(',')})&select=id,model,quantity,enquiry_id,grand_total,advance,claim,balance,extra_charge,gst_amount,price,total`, {
          headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
        })
        const pData = await pRes2.json()
        const eIds2 = [...new Set(pData.map(p => p.enquiry_id).filter(Boolean))]
        const eRes2 = await fetch(`https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/enquiries?id=in.(${eIds2.join(',')})&select=id,customer_name,location,state,mobile,order_from,enquiry_date`, {
          headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
        })
        const eData = await eRes2.json()
        dData.forEach(d => {
          const prod = pData.find(p => p.id === d.production_id)
          const enq = prod ? eData.find(e => e.id === prod.enquiry_id) : null
          d.enquiry = enq || null
          d.production = prod || null
        })
      }
      setDispatches(dData || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const handleMarkPaid = async (prod) => {
    if (!confirm('Mark this order as fully paid? Balance will be set to ₹0')) return
    try {
      await supabase.from('productions').update({ balance: 0, claim: parseFloat(prod.grand_total || 0) - parseFloat(prod.advance || 0) }).eq('id', prod.id)
      setMsg({ text: '✅ Marked as Paid! Balance: ₹0', type: 'success' })
      loadData()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const openDispatchModal = (prod) => {
    setSelectedProd(prod)
    setDispatchForm({ courier_name: '', tracking_id: '', photo_urls: [] })
    setShowDispatchModal(true)
  }

  const compressImage = (file, maxSizeKB = 50) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target.result
        img.onload = () => {
          let canvas = document.createElement('canvas')
          let w = img.width
          let h = img.height
          const maxDim = 600
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = h * (maxDim / w); w = maxDim }
            else { w = w * (maxDim / h); h = maxDim }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          const tryCompress = (quality) => {
            canvas.toBlob((blob) => {
              if (blob.size > maxSizeKB * 1024 && quality > 0.1) {
                tryCompress(quality - 0.15)
              } else {
                resolve(blob)
              }
            }, 'image/jpeg', quality)
          }
          tryCompress(0.7)
        }
      }
    })
  }

  const handlePhotoUpload = async (e) => {
    const files = e.target.files
    if (!files || !files.length) return
    setUploading(true)
    try {
      const newUrls = []
      for (const file of files) {
        const compressed = await compressImage(file, 50)
        const fileName = `dispatch-${selectedProd.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error: upErr } = await supabase.storage.from('dispatch-photos').upload(`dispatch-photos/${fileName}`, compressed, { contentType: 'image/jpeg' })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('dispatch-photos').getPublicUrl(`dispatch-photos/${fileName}`)
        newUrls.push(publicUrl)
      }
      setDispatchForm(p => ({ ...p, photo_urls: [...p.photo_urls, ...newUrls] }))
    } catch (err) { setMsg({ text: 'Photo error: ' + err.message, type: 'error' }) } finally { setUploading(false) }
  }

  const removePhoto = (url) => setDispatchForm(p => ({ ...p, photo_urls: p.photo_urls.filter(u => u !== url) }))

  const handleDispatchSubmit = async (e) => {
    e.preventDefault()
    if (!dispatchForm.courier_name.trim() || !dispatchForm.tracking_id.trim()) { setMsg({ text: 'Courier name and tracking ID required!', type: 'error' }); return }
    try {
      const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch('https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/rpc/create_dispatch', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
        body: JSON.stringify({ p_production_id: selectedProd.id, p_enquiry_id: selectedProd.enquiry_id, p_courier_name: dispatchForm.courier_name, p_tracking_id: dispatchForm.tracking_id, p_photo_urls: dispatchForm.photo_urls })
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Dispatch failed') }
      await supabase.from('productions').update({ status: 'dispatched', created_at: new Date().toISOString() }).eq('id', selectedProd.id)
      setMsg({ text: 'Dispatch recorded successfully!', type: 'success' }); setShowDispatchModal(false); setSelectedProd(null); loadData()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const openClaimEdit = (prod, enq) => { setClaimEditProd({ ...prod, enquiry: enq }); setClaimEditVal(String(prod.claim || 0)); setClaimEditModal(true) }

  const handleClaimSave = async () => {
    const claimVal = parseFloat(claimEditVal) || 0
    try {
      const prod = claimEditProd
      const balance = (parseFloat(prod.grand_total) || 0) - (parseFloat(prod.advance) || 0) - claimVal
      await supabase.from('productions').update({ claim: claimVal, balance: balance }).eq('id', prod.id)
      setMsg({ text: `Claim updated to ₹${claimVal}. Balance: ₹${balance}`, type: 'success' })
      setClaimEditModal(false); setClaimEditProd(null); loadData()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  return (
    <div className="erp-page dispatch-page">
      <div className="page-header">
        <div>
          <h1>🚚 Dispatch</h1>
          <span className="page-kicker">Ship ready orders, track couriers, claims, payments, and delivery photos.</span>
        </div>
      </div>

      {msg.text && (<div className={`alert alert-${msg.type}`}>{msg.text}<button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setMsg({ text: '', type: '' })}>×</button></div>)}

      <h2 className="section-title">Ready to Dispatch</h2>
      <div className="card data-card" style={{ overflowX: 'auto' }}>
        {loading ? <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading...</p>
        : productions.length === 0 ? <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No items ready for dispatch.</p>
        : <table>
            <thead><tr><th>ID</th><th>Customer</th><th>Location</th><th>Contact</th><th>Model</th><th>Qty</th><th>Action</th></tr></thead>
            <tbody>{productions.map(prod => (
              <tr key={prod.id}>
                <td style={{ fontWeight: 600 }}>#{prod.id}</td>
                <td>{prod.customer?.customer_name || 'N/A'}</td>
                <td>{prod.customer?.location || '-'} {prod.customer?.state ? `/ ${prod.customer.state}` : ''}</td>
                <td>{prod.customer?.mobile || '-'}</td>
                <td>{prod.model || 'N/A'}</td>
                <td>{prod.quantity}</td>
                <td><button className="btn btn-sm btn-success" onClick={() => openDispatchModal(prod)}>📦 Dispatch</button></td>
              </tr>
            ))}</tbody>
          </table>}
      </div>

      <h2 className="section-title">Dispatch History</h2>
      <div className="card data-card" style={{ overflowX: 'auto' }}>
        {loading ? <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading...</p>
        : dispatches.length === 0 ? <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No dispatches yet.</p>
        : <table>
            <thead><tr>
              <th>Date</th><th>Customer</th><th>Location</th><th>Contact</th><th>Source</th>
              <th>Model</th><th>Qty</th><th>Grand Total</th><th>Advance</th><th>Claim</th><th>Balance</th>
              <th>Paid</th><th>Courier</th><th>Tracking</th><th>Photos</th>
            </tr></thead>
            <tbody>{dispatches.map(disp => {
              const bal = parseFloat(disp.production?.balance || 0)
              return (
              <tr key={disp.id}>
                <td>{new Date(disp.created_at).toLocaleDateString()}</td>
                <td style={{ fontWeight: 600 }}>{disp.enquiry?.customer_name || 'N/A'}</td>
                <td>{disp.enquiry?.location || '-'} {disp.enquiry?.state ? `/ ${disp.enquiry.state}` : ''}</td>
                <td>{disp.enquiry?.mobile || '-'}</td>
                <td><span className="badge badge-info">{disp.enquiry?.order_from || '-'}</span></td>
                <td>{disp.production?.model || 'N/A'}</td>
                <td>{disp.production?.quantity || '-'}</td>
                <td style={{ color: '#2e7d32', fontWeight: 600 }}>₹{parseFloat(disp.production?.grand_total || 0).toFixed(2)}</td>
                <td style={{ color: '#e94560', fontWeight: 600 }}>₹{parseFloat(disp.production?.advance || 0).toFixed(2)}</td>
                <td><span style={{ color: '#f39c12', fontWeight: 600, cursor: 'pointer' }} onClick={() => openClaimEdit(disp.production, disp.enquiry)}>₹{parseFloat(disp.production?.claim || 0).toFixed(2)} ✏️</span></td>
                <td style={{ color: bal <= 0 ? '#2ecc71' : '#e65100', fontWeight: 600 }}>
                  ₹{bal.toFixed(2)} {bal <= 0 && '✅'}
                </td>
                <td>{bal > 0 ? <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(disp.production)}>💰 Paid</button> : <span className="badge badge-success">Paid ✅</span>}</td>
                <td><span className="badge badge-info">{disp.courier_name}</span></td>
                <td style={{ fontWeight: 600, fontSize: '12px' }}>{disp.tracking_id}</td>
                <td>{disp.photo_urls && disp.photo_urls.length > 0 ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {disp.photo_urls.slice(0, 2).map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`P${i+1}`} style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} /></a>)}
                    {disp.photo_urls.length > 2 && <span style={{ fontSize: '10px', color: '#999' }}>+{disp.photo_urls.length - 2}</span>}
                  </div>
                ) : <span className="badge badge-secondary">No</span>}</td>
              </tr>
            )})}</tbody>
          </table>}
      </div>

      {showDispatchModal && (
        <div className="modal-overlay" onClick={() => setShowDispatchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📦 Dispatch Order</h2>
            {selectedProd && <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <p><strong>Customer:</strong> {selectedProd.customer?.customer_name || 'N/A'} | <strong>Contact:</strong> {selectedProd.customer?.mobile || 'N/A'}</p>
              <p><strong>Model:</strong> {selectedProd.model} | <strong>Qty:</strong> {selectedProd.quantity}</p>
            </div>}
            <form onSubmit={handleDispatchSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Courier Name *</label>
                  <select value={dispatchForm.courier_name} onChange={e => setDispatchForm(p => ({ ...p, courier_name: e.target.value }))} required>
                    <option value="">Select courier</option>
                    <option value="DTDC">DTDC</option><option value="Delhivery">Delhivery</option><option value="Blue Dart">Blue Dart</option>
                    <option value="FedEx">FedEx</option><option value="India Post">India Post</option><option value="Ekart">Ekart</option>
                    <option value="XpressBees">XpressBees</option><option value="Amazon Shipping">Amazon Shipping</option>
                    <option value="Porter">Porter</option><option value="Shadowfax">Shadowfax</option><option value="LoadShare">LoadShare</option>
                    <option value="Rider Air">Rider Air</option><option value="Shree Maruti">Shree Maruti Courier</option>
                    <option value="Ecom Express">Ecom Express</option><option value="DHL">DHL</option>
                    <option value="Professional">Professional Courier</option><option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group"><label>Tracking ID *</label><input type="text" value={dispatchForm.tracking_id} onChange={e => setDispatchForm(p => ({ ...p, tracking_id: e.target.value }))} placeholder="Enter tracking number" required /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>📸 Upload Photos (Optional)</label>
                  <div className="photo-upload-area">
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} id="dispatch-photo-upload" />
                    <label htmlFor="dispatch-photo-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      {uploading ? <span>⏳ Uploading...</span> : <><div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div><p style={{ color: '#666' }}>Click to upload photos</p></>}
                    </label>
                  </div>
                  {dispatchForm.photo_urls.length > 0 && <div className="photo-preview">{dispatchForm.photo_urls.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt={`Upload ${i+1}`} />
                      <button type="button" onClick={() => removePhoto(url)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                    </div>
                  ))}</div>}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowDispatchModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={uploading}>{uploading ? '⏳ Uploading...' : '✅ Confirm Dispatch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {claimEditModal && (
        <div className="modal-overlay" onClick={() => setClaimEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>💰 Edit Claim Amount</h2>
            {claimEditProd && <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <p><strong>Customer:</strong> {claimEditProd.enquiry?.customer_name || 'N/A'} | <strong>Model:</strong> {claimEditProd.model}</p>
              <p><strong>Grand Total:</strong> ₹{parseFloat(claimEditProd.grand_total || 0).toFixed(2)} | <strong>Advance:</strong> ₹{parseFloat(claimEditProd.advance || 0).toFixed(2)}</p>
              <p><strong>Current Claim:</strong> ₹{parseFloat(claimEditProd.claim || 0).toFixed(2)} → <strong>New:</strong> ₹{parseFloat(claimEditVal || 0).toFixed(2)}</p>
              <p><strong>New Balance:</strong> ₹{(parseFloat(claimEditProd.grand_total || 0) - parseFloat(claimEditProd.advance || 0) - parseFloat(claimEditVal || 0)).toFixed(2)}</p>
            </div>}
            <div className="form-group"><label>Claim Amount</label><input type="number" value={claimEditVal} onChange={e => setClaimEditVal(e.target.value)} min="0" step="0.01" style={{ padding: '12px', border: '1.5px solid #ddd0c0', borderRadius: '8px', fontSize: '16px' }} /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setClaimEditModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleClaimSave}>💾 Save Claim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dispatch
