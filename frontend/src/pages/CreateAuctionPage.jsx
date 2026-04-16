import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const CATEGORIES = [
  'ELECTRONICS', 'FASHION', 'HOME_AND_GARDEN', 'SPORTS',
  'COLLECTIBLES', 'ART', 'VEHICLES', 'JEWELRY', 'BOOKS', 'TOYS', 'MUSIC', 'OTHER'
]

const INITIAL_FORM = {
  title:                '',
  description:          '',
  category:             '',
  startingPrice:        '',
  reservePrice:         '',
  minimumBidIncrement:  '1.00',
  startTime:            '',
  endTime:              '',
}

// Convert datetime-local string to LocalDateTime format backend expects
// HTML datetime-local gives "2026-04-11T14:30" — backend needs "2026-04-11T14:30:00"
const toLocalDateTime = (datetimeLocal) => {
  if (!datetimeLocal) return null
  // Append seconds if missing
  return datetimeLocal.length === 16 ? datetimeLocal + ':00' : datetimeLocal
}

export default function CreateAuctionPage() {
  const { isVerifiedSeller } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]       = useState(INITIAL_FORM)
  const [images, setImages]   = useState([''])     // list of image URL inputs
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  // Not a verified seller — show gate
  if (!isVerifiedSeller) {
    return (
      <div style={s.page}>
        <div className="container" style={s.gate}>
          <span style={s.gateIcon}>🔒</span>
          <h2 style={s.gateTitle}>Verified Sellers Only</h2>
          <p style={s.gateSub}>
            You need to be a verified seller to create auctions.
            Apply from your <Link to="/my-auctions" style={s.gateLink}>My Auctions</Link> page.
          </p>
          <Link to="/my-auctions" className="btn-primary" style={{ marginTop: 16 }}>
            Go to My Auctions
          </Link>
        </div>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(err => ({ ...err, [name]: '' }))
  }

  const handleImageChange = (index, value) => {
    const updated = [...images]
    updated[index] = value
    setImages(updated)
  }

  const addImageField = () => {
    if (images.length < 5) setImages(prev => [...prev, ''])
  }

  const removeImageField = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    // Client-side validation
    const clientErrors = {}
    if (!form.startTime) clientErrors.startTime = 'Start time is required'
    if (!form.endTime)   clientErrors.endTime   = 'End time is required'
    if (form.startTime && form.endTime) {
      if (new Date(form.endTime) <= new Date(form.startTime)) {
        clientErrors.endTime = 'End time must be after start time'
      }
      if (new Date(form.endTime) <= new Date()) {
        clientErrors.endTime = 'End time must be in the future'
      }
    }
    if (form.reservePrice && parseFloat(form.reservePrice) < parseFloat(form.startingPrice)) {
      clientErrors.reservePrice = 'Reserve price must be greater than or equal to starting price'
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setLoading(false)
      return
    }

    // Build payload
    const validImages = images.filter(url => url.trim() !== '')
    const payload = {
      title:               form.title,
      description:         form.description,
      category:            form.category,
      startingPrice:       parseFloat(form.startingPrice),
      minimumBidIncrement: parseFloat(form.minimumBidIncrement) || 1.00,
      startTime:           toLocalDateTime(form.startTime),
      endTime:             toLocalDateTime(form.endTime),
      images:              validImages.length > 0 ? validImages : undefined,
    }
    if (form.reservePrice) {
      payload.reservePrice = parseFloat(form.reservePrice)
    }

    try {
      const { data } = await api.post('/auctions', payload)
      navigate(`/auctions/${data.id}`)
    } catch (err) {
      const data = err.response?.data
      if (data?.fieldErrors) {
        setErrors(data.fieldErrors)
      } else {
        setErrors({ general: data?.message || 'Failed to create auction. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // Min datetime for inputs — now + 5 minutes
  const minDateTime = new Date(Date.now() + 5 * 60000)
    .toISOString().slice(0, 16)

  return (
    <div style={s.page}>
      <div className="container" style={s.inner}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>Create Auction</h1>
            <p style={s.sub}>List your item for competitive bidding</p>
          </div>
          <Link to="/my-auctions" className="btn-ghost" style={{ alignSelf: 'flex-start', fontSize: 13 }}>
            ← Back to My Auctions
          </Link>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>

          {/* General error */}
          {errors.general && (
            <div style={s.errorBanner}>⚠ {errors.general}</div>
          )}

          {/* ── Section: Basic Info ── */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Item Details</h2>

            <div className="field">
              <label>Title *</label>
              <input
                name="title"
                placeholder="e.g. Vintage Rolex Submariner 1965"
                value={form.title}
                onChange={handleChange}
                maxLength={150}
                required
              />
              {errors.title && <span className="error-msg">{errors.title}</span>}
              <span style={s.charCount}>{form.title.length}/150</span>
            </div>

            <div className="field">
              <label>Description *</label>
              <textarea
                name="description"
                placeholder="Describe your item in detail — condition, history, measurements, any defects..."
                value={form.description}
                onChange={handleChange}
                rows={5}
                style={s.textarea}
                required
              />
              {errors.description && <span className="error-msg">{errors.description}</span>}
              <span style={s.charCount}>{form.description.length} characters (min 20)</span>
            </div>

            <div className="field">
              <label>Category *</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              {errors.category && <span className="error-msg">{errors.category}</span>}
            </div>
          </div>

          {/* ── Section: Pricing ── */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Pricing</h2>

            <div style={s.row3}>
              <div className="field">
                <label>Starting Price ($) *</label>
                <input
                  name="startingPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.startingPrice}
                  onChange={handleChange}
                  required
                />
                {errors.startingPrice && <span className="error-msg">{errors.startingPrice}</span>}
              </div>

              <div className="field">
                <label>Reserve Price ($) <span style={s.optional}>optional</span></label>
                <input
                  name="reservePrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="No reserve"
                  value={form.reservePrice}
                  onChange={handleChange}
                />
                {errors.reservePrice && <span className="error-msg">{errors.reservePrice}</span>}
              </div>

              <div className="field">
                <label>Min Bid Increment ($)</label>
                <input
                  name="minimumBidIncrement"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1.00"
                  value={form.minimumBidIncrement}
                  onChange={handleChange}
                />
                {errors.minimumBidIncrement && <span className="error-msg">{errors.minimumBidIncrement}</span>}
              </div>
            </div>

            <div style={s.pricingNote}>
              <span style={s.noteIcon}>ℹ</span>
              <span>
                <strong>Reserve price</strong> is the minimum you'll accept. Bidders won't see the exact amount — only whether it's been met.
                If not met by auction end, you're not obligated to sell.
              </span>
            </div>
          </div>

          {/* ── Section: Timing ── */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Auction Schedule</h2>

            <div style={s.row2}>
              <div className="field">
                <label>Start Time *</label>
                <input
                  name="startTime"
                  type="datetime-local"
                  min={minDateTime}
                  value={form.startTime}
                  onChange={handleChange}
                  required
                />
                {errors.startTime && <span className="error-msg">{errors.startTime}</span>}
              </div>

              <div className="field">
                <label>End Time *</label>
                <input
                  name="endTime"
                  type="datetime-local"
                  min={form.startTime || minDateTime}
                  value={form.endTime}
                  onChange={handleChange}
                  required
                />
                {errors.endTime && <span className="error-msg">{errors.endTime}</span>}
              </div>
            </div>

            <div style={s.pricingNote}>
              <span style={s.noteIcon}>ℹ</span>
              <span>
                Once the auction starts it moves to <strong>ACTIVE</strong> status and bidding opens.
                The auction status will show as <strong>SCHEDULED</strong> until then.
              </span>
            </div>
          </div>

          {/* ── Section: Images ── */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Images <span style={s.optional}>up to 5 URLs</span></h2>

            <div style={s.imageFields}>
              {images.map((url, i) => (
                <div key={i} style={s.imageRow}>
                  <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <input
                      type="url"
                      placeholder={`Image URL ${i + 1} — e.g. https://example.com/photo.jpg`}
                      value={url}
                      onChange={e => handleImageChange(i, e.target.value)}
                    />
                  </div>
                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageField(i)}
                      style={s.removeImgBtn}
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {images.length < 5 && (
              <button
                type="button"
                onClick={addImageField}
                className="btn-ghost"
                style={{ fontSize: 13, marginTop: 10 }}
              >
                + Add another image
              </button>
            )}
          </div>

          {/* ── Submit ── */}
          <div style={s.submitRow}>
            <Link to="/my-auctions" className="btn-ghost" style={{ padding: '14px 28px' }}>
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '14px 40px', fontSize: 16 }}
              disabled={loading}
            >
              {loading ? 'Creating auction…' : '🚀 Create auction'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

const s = {
  page: { flex: 1, paddingBottom: 80 },
  inner: { paddingTop: 48, maxWidth: 800 },

  // Gate
  gate: {
    paddingTop: 100, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16, textAlign: 'center',
  },
  gateIcon: { fontSize: 56, opacity: 0.4 },
  gateTitle: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700 },
  gateSub: { fontSize: 15, color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6 },
  gateLink: { color: 'var(--accent-bright)', fontWeight: 600, textDecoration: 'none' },

  // Header
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 40,
  },
  heading: {
    fontFamily: "'Syne', sans-serif", fontSize: 32,
    fontWeight: 800, letterSpacing: '-1px', marginBottom: 6,
  },
  sub: { fontSize: 15, color: 'var(--text-secondary)' },

  // Form
  form: { display: 'flex', flexDirection: 'column', gap: 32 },

  errorBanner: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 12, padding: '14px 18px', fontSize: 14,
    color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8,
  },

  // Sections
  section: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 18, padding: '28px 32px',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  sectionTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
    color: 'var(--text-primary)', marginBottom: 4,
    paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)',
  },

  // Layouts
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },

  // Textarea
  textarea: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    borderRadius: 12, padding: '12px 16px', color: 'var(--text-primary)',
    fontSize: 15, resize: 'vertical', minHeight: 120,
    fontFamily: "'DM Sans', sans-serif", width: '100%',
    transition: 'all 0.2s',
  },

  // Helpers
  charCount: { fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 },
  optional: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 },

  // Pricing note
  pricingNote: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    borderRadius: 10, padding: '12px 16px',
    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
    display: 'flex', gap: 10, alignItems: 'flex-start',
  },
  noteIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },

  // Images
  imageFields: { display: 'flex', flexDirection: 'column', gap: 10 },
  imageRow: { display: 'flex', gap: 10, alignItems: 'center' },
  removeImgBtn: {
    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#fca5a5', cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },

  // Submit
  submitRow: {
    display: 'flex', justifyContent: 'flex-end',
    gap: 12, paddingTop: 8,
  },
}