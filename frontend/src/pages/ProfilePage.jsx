import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()

  const [form, setForm] = useState({
    firstName:    '',
    lastName:     '',
    username:     '',
    phone:        '',
    profileImage: '',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)

  // Sync form whenever user object changes (e.g. after refreshUser)
  useEffect(() => {
    if (user) {
      setForm({
        firstName:    user.firstName    || '',
        lastName:     user.lastName     || '',
        username:     user.username     || '',
        phone:        user.phone        || '',
        profileImage: user.profileImage || '',
      })
    }
  }, [user])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(err => ({ ...err, [e.target.name]: '' }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setSaved(false)

    const payload = {
      firstName:    form.firstName    || undefined,
      lastName:     form.lastName     || undefined,
      username:     form.username     || undefined,
      phone:        form.phone        || undefined,
      profileImage: form.profileImage || undefined,
    }
    // Remove undefined keys
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

    try {
      await api.put('/user/profile', payload)
      // refreshUser pulls latest from backend and updates context + localStorage
      // useEffect above will then sync form automatically
      await refreshUser()
      setSaved(true)
    } catch (err) {
      const data = err.response?.data
      if (data?.fieldErrors) {
        setErrors(data.fieldErrors)
      } else {
        setErrors({ general: data?.message || 'Failed to update profile' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div className="container" style={s.inner}>

        {/* Header */}
        <div style={s.header}>
          {/* Profile image or initial */}
          <div style={s.avatarWrap}>
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" style={s.avatarImg} />
            ) : (
              <div style={s.avatarLarge}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 style={s.heading}>{user?.firstName} {user?.lastName}</h1>
            <p style={s.sub}>@{user?.username} · {user?.email}</p>
            <div style={s.badges}>
              <span style={s.roleBadge}>{user?.role}</span>
              {user?.sellerStatus && user.sellerStatus !== 'NONE' && (
                <span style={{
                  ...s.statusBadge,
                  ...(user.sellerStatus === 'VERIFIED' ? s.statusVerified :
                      user.sellerStatus === 'PENDING'  ? s.statusPending  : s.statusRejected)
                }}>
                  {user.sellerStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Edit Profile</h2>

          <form onSubmit={handleSubmit} style={s.form}>
            {errors.general && (
              <div style={s.errorBanner}>⚠ {errors.general}</div>
            )}
            {saved && (
              <div style={s.successBanner}>✓ Profile updated successfully</div>
            )}

            <div style={s.row2}>
              <div className="field">
                <label>First name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="John"
                />
                {errors.firstName && <span className="error-msg">{errors.firstName}</span>}
              </div>
              <div className="field">
                <label>Last name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                />
                {errors.lastName && <span className="error-msg">{errors.lastName}</span>}
              </div>
            </div>

            <div className="field">
              <label>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="johndoe"
              />
              {errors.username && <span className="error-msg">{errors.username}</span>}
            </div>

            <div className="field">
              <label>Phone <span style={s.optional}>optional</span></label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 99999 99999"
                maxLength={15}
              />
              {errors.phone && <span className="error-msg">{errors.phone}</span>}
            </div>

            <div className="field">
              <label>Profile image URL <span style={s.optional}>optional</span></label>
              <input
                name="profileImage"
                value={form.profileImage}
                onChange={handleChange}
                placeholder="https://example.com/photo.jpg"
              />
              {errors.profileImage && <span className="error-msg">{errors.profileImage}</span>}
              {/* Live preview */}
              {form.profileImage && (
                <div style={s.imagePreviewWrap}>
                  <img
                    src={form.profileImage}
                    alt="Preview"
                    style={s.imagePreview}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <span style={s.imagePreviewLabel}>Preview</span>
                </div>
              )}
            </div>

            <div style={s.submitRow}>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '12px 32px' }}
                disabled={loading}
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Account info — read only */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Account Info</h2>
          <div style={s.infoGrid}>
            <div style={s.infoItem}>
              <p style={s.infoLabel}>Email</p>
              <p style={s.infoValue}>{user?.email}</p>
            </div>
            <div style={s.infoItem}>
              <p style={s.infoLabel}>Role</p>
              <p style={s.infoValue}>{user?.role}</p>
            </div>
            <div style={s.infoItem}>
              <p style={s.infoLabel}>Seller status</p>
              <p style={s.infoValue}>{user?.sellerStatus || 'N/A'}</p>
            </div>
            <div style={s.infoItem}>
              <p style={s.infoLabel}>Account status</p>
              <p style={{ ...s.infoValue, color: 'var(--success)' }}>Active</p>
            </div>
          </div>
          <p style={s.emailNote}>
            ⚠ Email cannot be changed. Contact support if you need to update it.
          </p>
        </div>

      </div>
    </div>
  )
}

const s = {
  page: { flex: 1, paddingBottom: 80 },
  inner: { paddingTop: 48, maxWidth: 680 },

  // Header
  header: { display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 },
  avatarWrap: { flexShrink: 0 },
  avatarLarge: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: '#fff',
  },
  avatarImg: {
    width: 72, height: 72, borderRadius: '50%',
    objectFit: 'cover', border: '2px solid var(--border)',
  },
  heading: {
    fontFamily: "'Syne', sans-serif", fontSize: 26,
    fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4,
  },
  sub: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 },
  badges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  roleBadge: {
    display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
    fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase',
    background: 'var(--accent-subtle)', color: 'var(--accent-bright)',
    border: '1px solid var(--border)',
  },
  statusBadge: {
    display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
    fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase',
  },
  statusVerified: { background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.25)' },
  statusPending:  { background: 'rgba(245,158,11,0.12)', color: '#fbbf24',         border: '1px solid rgba(245,158,11,0.25)' },
  statusRejected: { background: 'rgba(239,68,68,0.12)',  color: '#fca5a5',         border: '1px solid rgba(239,68,68,0.25)'  },

  // Cards
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 18, padding: '28px 32px', marginBottom: 20,
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  cardTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
    paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)', marginBottom: 4,
  },

  // Form
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  optional: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 },
  submitRow: { display: 'flex', justifyContent: 'flex-end', marginTop: 4 },
  errorBanner: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10, padding: '12px 16px', fontSize: 13,
    color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8,
  },
  successBanner: {
    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: 10, padding: '12px 16px', fontSize: 13,
    color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 8,
  },

  // Image preview
  imagePreviewWrap: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 },
  imagePreview: {
    width: 48, height: 48, borderRadius: '50%',
    objectFit: 'cover', border: '2px solid var(--border)',
  },
  imagePreviewLabel: { fontSize: 12, color: 'var(--text-muted)' },

  // Info grid
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  infoLabel: {
    fontSize: 11, color: 'var(--text-muted)',
    fontFamily: "'Syne', sans-serif", fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: 14, color: 'var(--text-primary)',
    fontFamily: "'Syne', sans-serif", fontWeight: 600,
  },
  emailNote: {
    fontSize: 12, color: 'var(--text-muted)',
    background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px',
  },
}