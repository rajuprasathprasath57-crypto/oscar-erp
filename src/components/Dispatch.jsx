import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Dispatch() {
  const [productions, setProductions] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [binItems, setBinItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [selectedProd, setSelectedProd] = useState(null)
  const [dispatchForm, setDispatchForm] = useState({
    courier_name: '',
    tracking_id: '',
    photo_urls: []
  })
  const [uploading, setUploading] = useState(false)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [showBin, setShowBin] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load productions that are in "ready" stage (ready to dispatch)
      const { data: prods, error: prodError } = await supabase
        .from('productions')
        .select('*, enquiries (customer_name, mobile, location, state)')
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
      if (prodError) throw prodError
      setProductions(prods || [])

      // Load existing dispatches
      const { data: disp, error: dispError } = await supabase
        .from('dispatch')
        .select('*, productions (model, quantity, enquiries (customer_name))')
        .order('created_at', { ascending: false })
      if (dispError) throw dispError
      setDispatches(disp || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const openDispatchModal = (prod) => {
    setSelectedProd(prod)
    setDispatchForm({
      courier_name: '',
      tracking_id: '',
      photo_urls: []
    })
    setShowDispatchModal(true)
  }

  // Compress image to under 50KB
  const compressImage = (file, maxSizeKB = 50) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target.result
        img.onload = () => {
          let quality = 0.7
          let canvas = document.createElement('canvas')
          let w = img.width, h = img.height
          const maxDim = 600 // max width/height
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = h * (maxDim / w); w = maxDim }
            else { w = w * (maxDim / h); h = maxDim }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          
          const tryCompress = (q) => {
            canvas.toBlob((blob) => {
              if (blob.size > maxSizeKB * 1024 && q > 0.1) {
                tryCompress(q - 0.15)
              } else {
                resolve(blob)
              }
            }, 'image/jpeg', q)
          }
          tryCompress(quality)
        }
      }
    })
  }

  const handlePhotoUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const newUrls = []
      
      for (const file of files) {
        // Compress image
        const compressedBlob = await compressImage(file, 50)
        const fileName = `dispatch-${selectedProd.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const filePath = `dispatch-photos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('dispatch-photos')
          .upload(filePath, compressedBlob, { contentType: 'image/jpeg' })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('dispatch-photos')
          .getPublicUrl(filePath)

        newUrls.push(publicUrl)
      }

      setDispatchForm(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, ...newUrls]
      }))
    } catch (err) {
      setMsg({ text: 'Error uploading photo: ' + err.message, type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (url) => {
    setDispatchForm(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter(u => u !== url)
    }))
  }

  const handleDispatchSubmit = async (e) => {
    e.preventDefault()
    if (!dispatchForm.courier_name.trim() || !dispatchForm.tracking_id.trim()) {
      setMsg({ text: 'Courier name and tracking ID are required!', type: 'error' })
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
          p_courier_name: dispatchForm.courier_name,
          p_tracking_id: dispatchForm.tracking_id,
          p_photo_urls: dispatchForm.photo_urls
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Dispatch failed')
      }

      // Update production status to dispatched
      const { error: prodError } = await supabase
        .from('productions')
        .update({ status: 'dispatched', created_at: new Date().toISOString() })
        .eq('id', selectedProd.id)
      if (prodError) throw prodError

      setMsg({ text: 'Dispatch recorded successfully!', type: 'success' })
      setShowDispatchModal(false)
      setSelectedProd(null)
      loadData()
    } catch (err) {
      setMsg({ text: 'Error: ' + err.message, type: 'error' })
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>🚚 Dispatch</h1>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type}`}>
          {msg.text}
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            onClick={() => setMsg({ text: '', type: '' })}
          >×</button>
        </div>
      )}

      {/* Ready to Dispatch */}
      <h2 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>Ready to Dispatch</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading...</p>
        ) : productions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No items ready for dispatch. Click "Ready" stage in Production first.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Model</th>
                <th>Quantity</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {productions.map((prod) => (
                <tr key={prod.id}>
                  <td style={{ fontWeight: 600 }}>#{prod.id}</td>
                  <td>{prod.enquiries?.customer_name || 'N/A'}</td>
                  <td>{prod.model || 'N/A'}</td>
                  <td>{prod.quantity}</td>
                  <td>{prod.enquiries?.mobile || prod.enquiries?.location || 'N/A'}</td>
                  <td>
                    <button className="btn btn-sm btn-success" onClick={() => openDispatchModal(prod)}>
                      📦 Dispatch Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dispatch History */}
      <h2 style={{ fontSize: '18px', margin: '24px 0 12px', color: '#1a1a2e' }}>Dispatch History</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        {dispatches.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No dispatches yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Model</th>
                <th>Courier</th>
                <th>Tracking ID</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((disp) => (
                <tr key={disp.id}>
                  <td>{new Date(disp.dispatched_at).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{disp.productions?.enquiries?.customer_name || 'N/A'}</td>
                  <td>{disp.productions?.model || 'N/A'}</td>
                  <td><span className="badge badge-info">{disp.courier_name}</span></td>
                  <td style={{ fontWeight: 600 }}>{disp.tracking_id}</td>
                  <td>
                    {disp.photo_urls && disp.photo_urls.length > 0 ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {disp.photo_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Dispatch ${i+1}`} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="badge badge-secondary">No photos</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="modal-overlay" onClick={() => setShowDispatchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📦 Dispatch Order</h2>
            {selectedProd && (
              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <p><strong>Customer:</strong> {selectedProd.enquiries?.customer_name}</p>
                <p><strong>Model:</strong> {selectedProd.model}</p>
                <p><strong>Quantity:</strong> {selectedProd.quantity}</p>
              </div>
            )}
            <form onSubmit={handleDispatchSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Courier Name *</label>
                  <select
                    value={dispatchForm.courier_name}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, courier_name: e.target.value }))}
                    required
                  >
                    <option value="">Select courier</option>
                    <option value="DTDC">DTDC</option>
                    <option value="Delhivery">Delhivery</option>
                    <option value="Blue Dart">Blue Dart</option>
                    <option value="FedEx">FedEx</option>
                    <option value="India Post">India Post</option>
                    <option value="Ekart">Ekart</option>
                    <option value="XpressBees">XpressBees</option>
                    <option value="Amazon Shipping">Amazon Shipping</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tracking ID *</label>
                  <input
                    type="text"
                    value={dispatchForm.tracking_id}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, tracking_id: e.target.value }))}
                    placeholder="Enter tracking number"
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Upload Photos (Optional)</label>
                  <div className="photo-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      {uploading ? (
                        <span>Uploading...</span>
                      ) : (
                        <>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                          <p style={{ color: '#666' }}>Click to upload photos</p>
                          <p style={{ color: '#999', fontSize: '12px' }}>JPEG, PNG, GIF</p>
                        </>
                      )}
                    </label>
                  </div>
                  {dispatchForm.photo_urls.length > 0 && (
                    <div className="photo-preview">
                      {dispatchForm.photo_urls.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} alt={`Upload ${i+1}`} />
                          <button
                            type="button"
                            onClick={() => removePhoto(url)}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: '#e74c3c',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowDispatchModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={uploading}>
                  {uploading ? '⏳ Uploading...' : '✅ Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dispatch