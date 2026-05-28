import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const STAGES = ['cutting', 'attatching', 'plate', 'emossing', 'stitching', 'packing', 'ready']

function Production() {
  const [productions, setProductions] = useState([])
  const [binItems, setBinItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [editModal, setEditModal] = useState(false)
  const [selectedProd, setSelectedProd] = useState(null)
  const [dispatchModal, setDispatchModal] = useState(false)
  const [dispatchForm, setDispatchForm] = useState({ courier_name: '', tracking_id: '', courier_custom: '', photo_urls: [] })
  const [uploading, setUploading] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showBin, setShowBin] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { loadProductions(); loadBin() }, [])

  const loadProductions = async () => {
    loadBin()
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('productions')
        .select('*, enquiries (customer_name, enquiry_date, order_from, mobile, location, state)')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
      if (error) throw error
      setProductions(data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const loadBin = async () => {
    try {
      const { data } = await supabase
        .from('productions')
        .select('*, enquiries (customer_name, enquiry_date, order_from, mobile, location, state)')
        .eq('status', 'deleted')
        .order('created_at', { ascending: false })
      setBinItems(data || [])
    } catch (err) { console.error(err) }
  }

  const advanceStage = async (prod, direction = 'next') => {
    const currentIdx = STAGES.indexOf(prod.status)
    if (currentIdx === -1) return
    const newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1
    if (newIdx < 0 || newIdx >= STAGES.length) return
    const newStatus = STAGES[newIdx]
    try {
      await supabase.from('productions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', prod.id)
      setMsg({ text: `Status updated to: ${newStatus}`, type: 'success' })
      loadProductions()
      // Auto-open dispatch modal when status reaches "ready"
      if (newStatus === 'ready') {
        setTimeout(() => openDispatchModal(prod), 300)
      }
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
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
          let w = img.width, h = img.height
          const maxDim = 600
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = h * (maxDim / w); w = maxDim }
            else { w = w * (maxDim / h); h = maxDim }
          }
          canvas.width = w; canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          const tryC = (q) => {
            canvas.toBlob((blob) => {
              if (blob.size > maxSizeKB * 1024 && q > 0.1) tryC(q - 0.15)
              else resolve(blob)
            }, 'image/jpeg', q)
          }
          tryC(0.7)
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
    } catch (err) { setMsg({ text: 'Photo error: ' + err.message, type: 'error' }) }
    finally { setUploading(false) }
  }

  const removePhoto = (url) => {
    setDispatchForm(p => ({ ...p, photo_urls: p.photo_urls.filter(u => u !== url) }))
  }

  const openDispatchModal = (prod) => {
    setSelectedProd(prod)
    setDispatchForm({ courier_name: '', tracking_id: '', courier_custom: '', photo_urls: [] })
    setDispatchModal(true)
  }

  const handleDispatchSubmit = async (e) => {
    e.preventDefault()
    const courier = dispatchForm.courier_name === 'Other' ? dispatchForm.courier_custom : dispatchForm.courier_name
    if (!courier || !dispatchForm.tracking_id) {
      setMsg({ text: 'Courier name and tracking ID required!', type: 'error' })
      return
    }
    try {
      const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/rpc/create_dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: API_KEY, Authorization: 'Bearer ' + API_KEY },
        body: JSON.stringify({
          p_production_id: selectedProd.id,
          p_enquiry_id: selectedProd.enquiry_id,
          p_courier_name: courier,
          p_tracking_id: dispatchForm.tracking_id,
          p_photo_urls: dispatchForm.photo_urls
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Dispatch failed')
      }
      await supabase.from('productions').update({ status: 'dispatched', updated_at: new Date().toISOString() }).eq('id', selectedProd.id)
      setMsg({ text: 'Dispatched successfully!', type: 'success' })
      setDispatchModal(false)
      setSelectedProd(null)
      loadProductions()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Move this production to bin?')) return
    try {
      await supabase.from('productions').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', id)
      setMsg({ text: 'Moved to bin!', type: 'success' })
      loadProductions(); loadBin()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const handleRestore = async (id) => {
    try {
      await supabase.from('productions').update({ status: 'cutting', updated_at: new Date().toISOString() }).eq('id', id)
      setMsg({ text: 'Restored successfully!', type: 'success' })
      loadProductions(); loadBin()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const handlePermanentDelete = async (id) => {
    if (!confirm('Permanently delete this production? Cannot be undone!')) return
    try {
      await supabase.from('productions').delete().eq('id', id)
      setMsg({ text: 'Permanently deleted!', type: 'success' })
      loadBin()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const openEditModal = (prod) => {
    setSelectedProd(prod)
    setEditForm({
      model: prod.model || '', quantity: prod.quantity || 1, price: prod.price || '', total: prod.total || '',
      extra_charge: prod.extra_charge || '', gst_percentage: prod.gst_percentage || 0, gst_amount: prod.gst_amount || '',
      grand_total: prod.grand_total || '', advance: prod.advance || '', claim: prod.claim || '', balance: prod.balance || ''
    })
    setEditModal(true)
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    const numValue = value === '' ? '' : (name === 'model' ? value : parseFloat(value) || 0)
    setEditForm(prev => {
      const updated = { ...prev, [name]: numValue }
      if (name === 'model') return updated
      const qty = name === 'quantity' ? (numValue === '' ? 0 : numValue) : (prev.quantity === '' ? 0 : parseFloat(prev.quantity) || 0)
      const price = name === 'price' ? (numValue === '' ? 0 : numValue) : (prev.price === '' ? 0 : parseFloat(prev.price) || 0)
      const extra = name === 'extra_charge' ? (numValue === '' ? 0 : numValue) : (prev.extra_charge === '' ? 0 : parseFloat(prev.extra_charge) || 0)
      const gstPct = name === 'gst_percentage' ? numValue : prev.gst_percentage
      const total = qty * price
      const gstAmt = (total + extra) * (gstPct / 100)
      updated.total = total
      updated.gst_amount = gstAmt
      updated.grand_total = total + extra + gstAmt
      const adv = name === 'advance' ? (numValue === '' ? 0 : numValue) : (prev.advance === '' ? 0 : parseFloat(prev.advance) || 0)
      const clm = name === 'claim' ? (numValue === '' ? 0 : numValue) : (prev.claim === '' ? 0 : parseFloat(prev.claim) || 0)
      updated.balance = Math.max(0, updated.grand_total - adv - clm)
      return updated
    })
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    try {
      await supabase.from('productions').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', selectedProd.id)
      setMsg({ text: 'Production updated!', type: 'success' })
      setEditModal(false); setSelectedProd(null)
      loadProductions()
    } catch (err) { setMsg({ text: 'Error: ' + err.message, type: 'error' }) }
  }

  const getStageProgress = (status) => {
    const idx = STAGES.indexOf(status)
    return idx >= 0 ? ((idx + 1) / STAGES.length) * 100 : 0
  }

  const getStageColor = (status) => {
    const idx = STAGES.indexOf(status)
    if (idx <= 1) return '#e94560'
    if (idx <= 3) return '#f39c12'
    if (idx <= 5) return '#3498db'
    return '#2ecc71'
  }

  const generateTrackingLink = (prodId) => `${window.location.origin}/track/${prodId}`

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMsg({ text: 'Tracking link copied!', type: 'success' })
  }

  return (
    <div>
      <div className="page-header">
        <h1>Production {showBin ? '(Bin)' : ''}</h1>
          <button className={`btn ${showBin ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setShowBin(!showBin); if (!showBin) loadBin(); }}>
          🗑️ {showBin ? 'Back to Production' : `Bin (${binItems.length})`}
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type}`}>
          {msg.text}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setMsg({ text: '', type: '' })}>×</button>
        </div>
      )}

      {showBin ? (
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#1a1a2e' }}>🗑️ Production Bin</h2>
          {binItems.length === 0 ? <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Bin is empty</p>
          : (
            <table>
              <thead><tr><th>ID</th><th>Model</th><th>Customer</th><th>Qty</th><th>Grand Total</th><th>Actions</th></tr></thead>
              <tbody>
                {binItems.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td><td>{item.model || 'N/A'}</td>
                    <td>{item.enquiries?.customer_name || 'N/A'}</td><td>{item.quantity}</td>
                    <td>₹{parseFloat(item.grand_total).toFixed(2)}</td>
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
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {loading ? <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
          : productions.length === 0 ? <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No productions yet.</div>
          : productions.map((prod) => (
              <div key={prod.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>#{prod.id} - {prod.model || 'No Model'}</h3>
                    <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
                      Customer: <strong>{prod.enquiries?.customer_name || 'N/A'}</strong> | Date: {prod.enquiries?.enquiry_date || 'N/A'} | Source: {prod.enquiries?.order_from || 'N/A'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-sm btn-info" onClick={() => openEditModal(prod)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(prod.id)}>🗑️</button>
                    <div className="tracking-link-box" style={{ padding: '8px 12px', margin: 0 }}>
                      <input readOnly value={generateTrackingLink(prod.id)} style={{ fontSize: '11px', padding: '4px 8px', width: '200px' }} />
                      <button className="btn btn-sm btn-primary" style={{ marginTop: '4px' }} onClick={() => copyToClipboard(generateTrackingLink(prod.id))}>📋 Copy</button>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'white', background: getStageColor(prod.status), padding: '2px 10px', borderRadius: '10px' }}>Current: {prod.status}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>{Math.round(getStageProgress(prod.status))}% Complete</span>
                  </div>
                  <div style={{ background: '#eee', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${getStageProgress(prod.status)}%`, background: getStageColor(prod.status), height: '100%', borderRadius: '8px', transition: 'width 0.3s' }} />
                  </div>
                </div>

                <div className="status-bar" style={{ marginBottom: '12px' }}>
                  {STAGES.map((stage, idx) => {
                    const currentIdx = STAGES.indexOf(prod.status)
                    const isActive = stage === prod.status
                    const isCompleted = idx < currentIdx
                    const stageIcons = ['✂️', '🔗', '📋', '🔥', '🧵', '📦', '✅', '🚚']
                    return (
                      <button key={stage} className={`btn btn-sm ${isActive ? 'btn-primary' : isCompleted ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => advanceStage(prod, idx > currentIdx ? 'next' : 'prev')}>
                        {stageIcons[idx]} {stage.charAt(0).toUpperCase() + stage.slice(1)}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                  <div><small style={{ color: '#999' }}>Qty</small><br /><strong>{prod.quantity}</strong></div>
                  <div><small style={{ color: '#999' }}>Price</small><br /><strong>₹{parseFloat(prod.price).toFixed(2)}</strong></div>
                  <div><small style={{ color: '#999' }}>Total</small><br /><strong>₹{parseFloat(prod.total).toFixed(2)}</strong></div>
                  <div><small style={{ color: '#999' }}>Extra</small><br /><strong>₹{parseFloat(prod.extra_charge).toFixed(2)}</strong></div>
                  <div><small style={{ color: '#999' }}>GST ({prod.gst_percentage}%)</small><br /><strong>₹{parseFloat(prod.gst_amount).toFixed(2)}</strong></div>
                  <div style={{ borderTop: '2px solid #2ecc71' }}><small style={{ color: '#2ecc71', fontWeight: 700 }}>Grand Total</small><br /><strong style={{ color: '#2ecc71' }}>₹{parseFloat(prod.grand_total).toFixed(2)}</strong></div>
                  <div><small style={{ color: '#e94560' }}>Advance</small><br /><strong style={{ color: '#e94560' }}>₹{parseFloat(prod.advance).toFixed(2)}</strong></div>
                  <div><small style={{ color: '#f39c12' }}>Claim</small><br /><strong style={{ color: '#f39c12' }}>₹{parseFloat(prod.claim).toFixed(2)}</strong></div>
                  <div style={{ borderTop: '2px solid #e65100' }}><small style={{ color: '#e65100', fontWeight: 700 }}>Balance</small><br /><strong style={{ color: '#e65100' }}>₹{parseFloat(prod.balance).toFixed(2)}</strong></div>
                </div>
              </div>
            ))}
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>✏️ Edit Production #{selectedProd?.id}</h2>
            <form onSubmit={handleEditSave}>
              <div className="form-grid">
                <div className="form-group"><label>Model</label><input type="text" name="model" value={editForm.model} onChange={handleEditChange} placeholder="Model name" /></div>
                <div className="form-group"><label>Quantity</label><input type="number" name="quantity" value={editForm.quantity} onChange={handleEditChange} min="0" placeholder="0" /></div>
                <div className="form-group"><label>Price</label><input type="number" name="price" value={editForm.price} onChange={handleEditChange} min="0" step="0.01" placeholder="0" /></div>
                <div className="form-group"><label>Total</label><input type="number" value={editForm.total.toFixed(2)} disabled style={{ background: '#f0f0f0' }} /></div>
                <div className="form-group"><label>Extra Charge</label><input type="number" name="extra_charge" value={editForm.extra_charge} onChange={handleEditChange} min="0" step="0.01" placeholder="0" /></div>
                <div className="form-group">
                  <label>GST %</label>
                  <select name="gst_percentage" value={editForm.gst_percentage} onChange={handleEditChange}>
                    <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
                <div className="form-group"><label>GST Amount</label><input type="number" value={editForm.gst_amount.toFixed(2)} disabled style={{ background: '#f0f0f0' }} /></div>
                <div className="form-group"><label>Grand Total</label><input type="number" value={editForm.grand_total.toFixed(2)} disabled style={{ background: '#e8f5e9', fontWeight: 700 }} /></div>
                <div className="form-group"><label>Advance</label><input type="number" name="advance" value={editForm.advance} onChange={handleEditChange} min="0" step="0.01" placeholder="0" /></div>
                <div className="form-group"><label>Claim</label><input type="number" name="claim" value={editForm.claim} onChange={handleEditChange} min="0" step="0.01" placeholder="0" /></div>
                <div className="form-group"><label>Balance</label><input type="number" value={editForm.balance.toFixed(2)} disabled style={{ background: '#fff3e0', fontWeight: 700 }} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">💾 Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dispatchModal && (
        <div className="modal-overlay" onClick={() => setDispatchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🚚 Dispatch Order #{selectedProd?.id}</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Customer: <strong>{selectedProd?.enquiries?.customer_name}</strong> | Model: <strong>{selectedProd?.model}</strong>
            </p>
            <form onSubmit={handleDispatchSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Courier Name *</label>
                  <select value={dispatchForm.courier_name} onChange={(e) => setDispatchForm(p => ({ ...p, courier_name: e.target.value }))} required>
                    <option value="">Select courier</option>
                    <option value="DTDC">DTDC</option>
                    <option value="Delhivery">Delhivery</option>
                    <option value="Blue Dart">Blue Dart</option>
                    <option value="FedEx">FedEx</option>
                    <option value="India Post">India Post</option>
                    <option value="Ekart">Ekart</option>
                    <option value="XpressBees">XpressBees</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                  {dispatchForm.courier_name === 'Other' && (
                    <input type="text" value={dispatchForm.courier_custom} onChange={(e) => setDispatchForm(p => ({ ...p, courier_custom: e.target.value }))} placeholder="Type courier name..." required style={{ marginTop: '8px' }} />
                  )}
                </div>
                <div className="form-group">
                  <label>Tracking ID *</label>
                  <input type="text" value={dispatchForm.tracking_id} onChange={(e) => setDispatchForm(p => ({ ...p, tracking_id: e.target.value }))} placeholder="Enter tracking number" required />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>📸 Upload Photos (Optional - compressed to 50KB)</label>
                  <div className="photo-upload-area">
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} id="dispatch-photo-upload" />
                    <label htmlFor="dispatch-photo-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      {uploading ? <span>⏳ Uploading...</span> : (
                        <><div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                        <p style={{ color: '#666' }}>Click to upload photos</p>
                        <p style={{ color: '#999', fontSize: '12px' }}>JPEG, PNG - Auto compressed to 50KB</p></>
                      )}
                    </label>
                  </div>
                  {dispatchForm.photo_urls.length > 0 && (
                    <div className="photo-preview">
                      {dispatchForm.photo_urls.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} alt={`Upload ${i+1}`} />
                          <button type="button" onClick={() => removePhoto(url)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setDispatchModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">✅ Confirm Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Production