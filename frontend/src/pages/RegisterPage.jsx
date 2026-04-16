import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(err => ({ ...err, [e.target.name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      if (data?.fieldErrors) {
        setErrors(data.fieldErrors)
      } else {
        setErrors({ general: data?.message || 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.glow} />

      <div style={styles.card} className="animate-fade-up">
        {/* Header */}
        <div style={styles.header}>
          <Link to="/" style={styles.logoLink}>
            <span style={styles.logoIcon}>⬡</span>
            <span style={styles.logoText}>AuctionX</span>
          </Link>
          <h1 style={styles.heading}>Create account</h1>
          <p style={styles.subheading}>Join thousands of bidders and sellers</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {errors.general && (
            <div style={styles.errorBanner}>
              <span>⚠</span> {errors.general}
            </div>
          )}

          <div style={styles.row}>
            <div className="field">
              <label>First name</label>
              <input
                name="firstName"
                placeholder="John"
                value={form.firstName}
                onChange={handleChange}
                required
              />
              {errors.firstName && <span className="error-msg">{errors.firstName}</span>}
            </div>
            <div className="field">
              <label>Last name</label>
              <input
                name="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={handleChange}
                required
              />
              {errors.lastName && <span className="error-msg">{errors.lastName}</span>}
            </div>
          </div>

          <div className="field">
            <label>Username</label>
            <input
              name="username"
              placeholder="johndoe"
              value={form.username}
              onChange={handleChange}
              required
            />
            {errors.username && <span className="error-msg">{errors.username}</span>}
          </div>

          <div className="field">
            <label>Email address</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <div className="field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              placeholder="Min 8 chars, upper + lower + number"
              value={form.password}
              onChange={handleChange}
              required
            />
            {errors.password && <span className="error-msg">{errors.password}</span>}
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.footerLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'fixed',
    top: '-20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '700px',
    height: '700px',
    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '460px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
  },
  logoIcon: { fontSize: '24px', color: '#7c3aed' },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '22px',
    color: '#f1f0ff',
  },
  heading: { fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' },
  subheading: { fontSize: '14px', color: 'var(--text-secondary)' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  errorBanner: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#fca5a5',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  footerText: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  footerLink: {
    color: 'var(--accent-bright)',
    fontWeight: 600,
    textDecoration: 'none',
  },
}