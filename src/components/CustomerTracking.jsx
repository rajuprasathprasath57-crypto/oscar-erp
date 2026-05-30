import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STAGES = ['cutting', 'attatching', 'plate', 'emossing', 'stitching', 'packing', 'ready']

const STAGE_LABELS = {
  cutting: 'Cutting', attatching: 'Attaching', plate: 'Plate Work',
  emossing: 'Embossing', stitching: 'Stitching', packing: 'Packing',
  ready: 'Ready'
}

const STAGE_ICONS = {
  cutting: '✂️', attatching: '🔗', plate: '📋',
  emossing: '🔥', stitching: '🧵', packing: '📦',
  ready: '✅'
}

function CustomerTracking() {
  const { id } = useParams()
  const [production, setProduction] = useState(null)
  const [dispatch, setDispatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTracking()
  }, [id])

  const loadTracking = async () => {
    setLoading(true)
    try {
      const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Load production with enquiry details using raw fetch
      const prodRes = await fetch(`https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/productions?id=eq.${id}&select=id,model,quantity,price,total,extra_charge,gst_percentage,gst_amount,grand_total,advance,claim,balance,status,created_at,enquiry_id`, {
        headers: { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY }
      })
      const prods = await prodRes.json()
      if (!prods || !prods.length || prods[0].status === 'deleted') {
        setError('Order not found!')
        return
      }
      const prod = prods[0]

      // Get enquiry details
      if (prod.enquiry_id) {
        const enqRes = await fetch(`https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/enquiries?id=eq.${prod.enquiry_id}&select=id,customer_name,enquiry_date,order_from,mobile,location,state`, {
          headers: { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY }
        })
        const enqs = await enqRes.json()
        prod.enquiries = enqs && enqs.length ? enqs[0] : null
      }
      
      setProduction(prod)

      // Load dispatch info using raw fetch
      const dispRes = await fetch(`https://zvqkzysnteasdotiftgs.supabase.co/rest/v1/dispatch?production_id=eq.${id}&select=id,courier_name,tracking_id,photo_urls,created_at`, {
        headers: { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY }
      })
      const dispData = await dispRes.json()
      setDispatch(dispData && dispData.length ? dispData[0] : null)
      
    } catch (err) {
      setError('Order not found or an error occurred.')
      console.error('Error loading tracking:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="customer-tracking">
        <div className="tracking-header">
          <img src="/logo.jpeg" alt="OSCAR LEATHER" style={{ width: '160px', height: 'auto', background: 'white', padding: '8px', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
          <h1>OSCAR LEATHER PRODUCTS</h1>
          <p>Loading your order status...</p>
        </div>
      </div>
    )
  }

  if (error || !production) {
    return (
      <div className="customer-tracking">
        <div className="tracking-header">
          <img src="/logo.jpeg" alt="OSCAR LEATHER" style={{ width: '160px', height: 'auto', background: 'white', padding: '8px', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
          <h1>OSCAR LEATHER PRODUCTS</h1>
          <p>Track Your Order</p>
        </div>
        <div className="tracking-order-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ color: '#e74c3c' }}>{error || 'Order Not Found'}</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>Please check your tracking link and try again.</p>
        </div>
      </div>
    )
  }

  const currentIdx = STAGES.indexOf(production.status)

  return (
    <div className="customer-tracking">
      <div className="tracking-header">
        <img src="/logo.jpeg" alt="OSCAR LEATHER" style={{ width: '160px', height: 'auto', background: 'white', padding: '8px', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
        <h1>OSCAR LEATHER PRODUCTS</h1>
        <p>Track Your Order Status</p>
      </div>

      <div className="tracking-order-card">
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>
          Order #{production.id} - {production.model || 'Leather Product'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px', background: '#f8f9fa', padding: '16px', borderRadius: '10px' }}>
          <div>
            <small style={{ color: '#999' }}>Customer</small>
            <p style={{ fontWeight: 600 }}>{production.enquiries?.customer_name || 'N/A'}</p>
          </div>
          <div>
            <small style={{ color: '#999' }}>Location</small>
            <p style={{ fontWeight: 600 }}>{production.enquiries?.location || '-'}{production.enquiries?.state ? `, ${production.enquiries.state}` : ''}</p>
          </div>
          <div>
            <small style={{ color: '#999' }}>Order Date</small>
            <p style={{ fontWeight: 600 }}>{production.enquiries?.enquiry_date || 'N/A'}</p>
          </div>
          <div>
            <small style={{ color: '#999' }}>Source</small>
            <p style={{ fontWeight: 600 }}>{production.enquiries?.order_from || 'N/A'}</p>
          </div>
          <div>
            <small style={{ color: '#999' }}>Quantity</small>
            <p style={{ fontWeight: 600 }}>{production.quantity}</p>
          </div>
          <div>
            <small style={{ color: '#999' }}>Grand Total</small>
            <p style={{ fontWeight: 600, color: '#2e7d32' }}>₹{parseFloat(production.grand_total || 0).toFixed(2)}</p>
          </div>
          <div>
            <small style={{ color: '#999' }}>Advance Paid</small>
            <p style={{ fontWeight: 600, color: '#e94560' }}>₹{parseFloat(production.advance || 0).toFixed(2)}</p>
          </div>
          <div>
            <small style={{ color: '#999' }}>Balance</small>
            <p style={{ fontWeight: 600, color: parseFloat(production.balance || 0) <= 0 ? '#2ecc71' : '#e65100' }}>
              ₹{parseFloat(production.balance || 0).toFixed(2)} {parseFloat(production.balance || 0) <= 0 && '✅ Paid'}
            </p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="progress-tracker">
          {STAGES.map((stage, idx) => {
            const stageIcon = STAGE_ICONS[stage]
            const stageLabel = STAGE_LABELS[stage]
            let stepClass = ''
            if (idx < currentIdx) stepClass = 'completed'
            else if (idx === currentIdx) stepClass = 'active'

            return (
              <div key={stage} className={`progress-step ${stepClass}`}>
                <div className="step-circle">
                  {idx < currentIdx ? '✓' : idx === currentIdx ? stageIcon : stageIcon}
                </div>
                <div className="step-label">{stageLabel}</div>
              </div>
            )
          })}
        </div>

        {/* Current Status */}
        <div style={{ textAlign: 'center', padding: '16px', background: '#e8f5e9', borderRadius: '10px', marginTop: '10px' }}>
          <p style={{ fontSize: '14px', color: '#555' }}>Current Status</p>
          <h3 style={{ fontSize: '22px', color: '#2e7d32', marginTop: '4px' }}>
            {STAGE_ICONS[production.status]} {STAGE_LABELS[production.status]}
          </h3>
        </div>
      </div>

      {/* Dispatch Information */}
      {dispatch && (
        <div className="tracking-order-card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>🚚 Shipping Information</h3>
          
          <div className="tracking-dispatch">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <small style={{ color: '#999' }}>Courier Partner</small>
                <p style={{ fontWeight: 600, fontSize: '16px' }}>{dispatch.courier_name}</p>
              </div>
              <div>
                <small style={{ color: '#999' }}>Tracking ID</small>
                <p style={{ fontWeight: 600, fontSize: '16px', color: '#3498db' }}>{dispatch.tracking_id}</p>
              </div>
              <div>
                <small style={{ color: '#999' }}>Dispatched On</small>
                <p style={{ fontWeight: 600, fontSize: '16px' }}>
                  {new Date(dispatch.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Courier Photos */}
            {dispatch.photo_urls && dispatch.photo_urls.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ fontWeight: 600, marginBottom: '10px', color: '#555' }}>📸 Dispatch Photos</p>
                <div className="photo-preview">
                  {dispatch.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={url} 
                        alt={`Dispatch photo ${i+1}`} 
                        style={{ 
                          width: '100%', 
                          height: '160px', 
                          objectFit: 'cover', 
                          borderRadius: '10px',
                          border: '1px solid #eee',
                          transition: 'transform 0.2s'
                        }}
                        onMouseOver={e => e.target.style.transform = 'scale(1.02)'}
                        onMouseOut={e => e.target.style.transform = 'scale(1)'}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="tracking-order-card" style={{ textAlign: 'center', background: '#fff8f0' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Need help? Contact us at <strong style={{ color: '#e94560' }}>7904927682</strong>
        </p>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '30px', color: '#aaa', fontSize: '12px' }}>
        <p>OSCAR LEATHER PRODUCTS</p>
        <p style={{ marginTop: '4px' }}>Quality Leather Products</p>
      </div>
    </div>
  )
}

export default CustomerTracking