import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const TABS = ['Pending Sellers', 'All Users']

export default function AdminPage() {
  const [tab, setTab]                     = useState('Pending Sellers')
  const [pendingSellers, setPendingSellers] = useState([])
  const [allUsers, setAllUsers]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [actionLoading, setActionLoading] = useState(null) // userId being actioned
  const [toast, setToast]                 = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchPendingSellers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/sellers/pending')
      setPendingSellers(data)
    } catch {
      showToast('Failed to load pending sellers', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAllUsers = useCallback(async () => {
    setLoading(true)
    try {
      // Using the user list from pending + any future endpoint
      // For now reuse pending and show a note
      const { data } = await api.get('/admin/sellers/pending')
      setPendingSellers(data)
    } catch {
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'Pending Sellers') fetchPendingSellers()
    else fetchAllUsers()
  }, [tab])

  const handleApprove = async (userId, username) => {
    setActionLoading(userId)
    try {
      await api.post(`/admin/sellers/${userId}/approve`)
      setPendingSellers(prev => prev.filter(u => u.id !== userId))
      showToast(`✓ ${username} approved as seller`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Approval failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId, username) => {
    if (!window.confirm(`Reject seller application from ${username}?`)) return
    setActionLoading(userId)
    try {
      await api.post(`/admin/sellers/${userId}/reject`)
      setPendingSellers(prev => prev.filter(u => u.id !== userId))
      showToast(`Application from ${username} rejected`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Rejection failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div style={s.page}>

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, ...(toast.type === 'error' ? s.toastError : s.toastSuccess) }}>
          {toast.msg}
        </div>
      )}

      <div className="container" style={s.inner}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>Admin Dashboard</h1>
            <p style={s.sub}>Manage sellers, users and platform settings</p>
          </div>
          <div style={s.adminBadge}>⚙ Admin</div>
        </div>

        {/* Stats row */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <p style={s.statValue}>{pendingSellers.length}</p>
            <p style={s.statLabel}>Pending Applications</p>
          </div>
          <div style={s.statCard}>
            <p style={{ ...s.statValue, color: 'var(--success)' }}>Active</p>
            <p style={s.statLabel}>Platform Status</p>
          </div>
          <div style={s.statCard}>
            <p style={{ ...s.statValue, color: 'var(--accent-bright)' }}>Phase 2</p>
            <p style={s.statLabel}>Current Phase</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            >
              {t}
              {t === 'Pending Sellers' && pendingSellers.length > 0 && (
                <span style={s.tabBadge}>{pendingSellers.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Pending Sellers Tab ── */}
        {tab === 'Pending Sellers' && (
          <div style={s.section}>
            {loading ? (
              <div style={s.skeletons}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={s.skRow} />
                ))}
              </div>
            ) : pendingSellers.length === 0 ? (
              <div style={s.empty}>
                <span style={s.emptyIcon}>✓</span>
                <h3 style={s.emptyTitle}>No pending applications</h3>
                <p style={s.emptySub}>All seller applications have been reviewed</p>
              </div>
            ) : (
              <>
                <p style={s.tableHint}>
                  {pendingSellers.length} user{pendingSellers.length !== 1 ? 's' : ''} waiting for seller approval
                </p>
                <div style={s.table}>
                  {/* Table header */}
                  <div style={s.tableHeader}>
                    <span>User</span>
                    <span>Email</span>
                    <span>Status</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                  </div>

                  {/* Rows */}
                  {pendingSellers.map(seller => (
                    <div key={seller.id} style={s.tableRow}>

                      {/* User info */}
                      <div style={s.userCell}>
                        <div style={s.avatar}>
                          {seller.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={s.userName}>{seller.firstName} {seller.lastName}</p>
                          <p style={s.userHandle}>@{seller.username}</p>
                        </div>
                      </div>

                      {/* Email */}
                      <p style={s.email}>{seller.email}</p>

                      {/* Status */}
                      <span style={s.pendingBadge}>⏳ Pending</span>

                      {/* Actions */}
                      <div style={s.actions}>
                        <button
                          onClick={() => handleApprove(seller.id, seller.username)}
                          disabled={actionLoading === seller.id}
                          style={s.approveBtn}
                        >
                          {actionLoading === seller.id ? '…' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(seller.id, seller.username)}
                          disabled={actionLoading === seller.id}
                          style={s.rejectBtn}
                        >
                          {actionLoading === seller.id ? '…' : '✕ Reject'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── All Users Tab ── */}
        {tab === 'All Users' && (
          <div style={s.section}>
            <div style={s.comingSoon}>
              <span style={s.comingIcon}>🔧</span>
              <h3 style={s.comingTitle}>Full User Management</h3>
              <p style={s.comingSub}>
                Complete user list with search, filter by role, ban/unban, and activity stats will be added in Phase 5 (Trust & Safety).
              </p>
              <div style={s.comingList}>
                <p style={s.comingItem}>📋 View all registered users</p>
                <p style={s.comingItem}>🔍 Search and filter by role/status</p>
                <p style={s.comingItem}>🚫 Ban / unban users</p>
                <p style={s.comingItem}>📊 Activity and bid statistics</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  page: { flex: 1, paddingBottom: 80, position: 'relative' },
  inner: { paddingTop: 48 },

  // Toast
  toast: {
    position: 'fixed', top: 80, right: 24, zIndex: 999,
    padding: '12px 20px', borderRadius: 12,
    fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    animation: 'fadeIn 0.3s ease',
  },
  toastSuccess: { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7' },
  toastError: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' },

  // Header
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  heading: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 },
  sub: { fontSize: 15, color: 'var(--text-secondary)' },
  adminBadge: {
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
    background: 'var(--accent-subtle)', border: '1px solid var(--border)',
    color: 'var(--accent-bright)', padding: '8px 16px', borderRadius: 999,
  },

  // Stats
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 },
  statCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 16, padding: '20px 24px',
  },
  statValue: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: 'var(--gold-bright)', letterSpacing: '-1px', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },

  // Tabs
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', marginBottom: 28 },
  tab: {
    fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14,
    padding: '10px 20px', background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    borderBottom: '2px solid transparent', marginBottom: -1,
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
  },
  tabActive: { color: 'var(--text-primary)', borderBottom: '2px solid var(--accent)' },
  tabBadge: {
    background: 'var(--accent)', color: '#fff',
    borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 700,
  },

  // Section
  section: { minHeight: 300 },
  tableHint: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 },

  // Table
  table: { display: 'flex', flexDirection: 'column', gap: 8 },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr',
    padding: '10px 20px',
    fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)',
  },
  tableRow: {
    display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr',
    padding: '16px 20px', alignItems: 'center',
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 12, gap: 16,
  },

  // User cell
  userCell: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: '#fff',
  },
  userName: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' },
  userHandle: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },

  email: { fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" },

  pendingBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
    background: 'rgba(245,158,11,0.12)', color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.25)', borderRadius: 999,
    padding: '4px 10px',
  },

  // Action buttons
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  approveBtn: {
    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
    color: '#6ee7b7', transition: 'all 0.2s',
  },
  rejectBtn: {
    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
    color: '#fca5a5', transition: 'all 0.2s',
  },

  // Skeletons
  skeletons: { display: 'flex', flexDirection: 'column', gap: 8 },
  skRow: { height: 72, borderRadius: 12 },

  // Empty
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12 },
  emptyIcon: { fontSize: 48, color: 'var(--success)', opacity: 0.5 },
  emptyTitle: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)' },
  emptySub: { fontSize: 14, color: 'var(--text-muted)' },

  // Coming soon
  comingSoon: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 16, padding: 40, textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  comingIcon: { fontSize: 48, opacity: 0.4 },
  comingTitle: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700 },
  comingSub: { fontSize: 14, color: 'var(--text-secondary)', maxWidth: 420, lineHeight: 1.6 },
  comingList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, textAlign: 'left' },
  comingItem: { fontSize: 13, color: 'var(--text-muted)', padding: '6px 12px', background: 'var(--bg-elevated)', borderRadius: 8 },
}