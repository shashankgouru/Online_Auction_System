import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Background glow */}
      <div style={styles.glow} />

      <div style={styles.card} className="animate-fade-up">
        {/* Header */}
        <div style={styles.header}>
          <Link to="/" style={styles.logoLink}>
            <span style={styles.logoIcon}>⬡</span>
            <span style={styles.logoText}>AuctionX</span>
          </Link>
          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.subheading}>Sign in to your account to continue bidding</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBanner}>
              <span>⚠</span> {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footerText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.footerLink}>Create one</Link>
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
    padding: '24px',
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
    maxWidth: '420px',
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
  logoIcon: {
    fontSize: '24px',
    color: '#7c3aed',
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '22px',
    color: '#f1f0ff',
  },
  heading: {
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
    marginBottom: '4px',
  },
  subheading: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
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
