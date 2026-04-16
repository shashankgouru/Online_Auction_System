import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'SOLD', 'CANCELLED']

export default function MyAuctionsPage() {
  const { user, refreshUser } = useAuth()
  const [auctions, setAuctions]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [status, setStatus]           = useState('ALL')
  const [page, setPage]               = useState(0)
  const [totalPages, setTotalPages]   = useState(0)
  const [applyMsg, setApplyMsg]       = useState('')

  // Recompute from live user state every render
  const isVerifiedSeller = user?.role === 'SELLER' && user?.sellerStatus === 'VERIFIED'
  const isPending        = user?.sellerStatus === 'PENDING'
  const isRejected       = user?.sellerStatus === 'REJECTED'
  const isNone           = !user?.sellerStatus || user?.sellerStatus === 'NONE'

  // On mount — always refresh from backend so role changes are reflected
  useEffect(() => {
    if (user) refreshUser()
  }, [])

  // Fetch auctions only when verified
  useEffect(() => {
    if (!isVerifiedSeller) { setLoading(false); return }
    const fetch = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page, size: 12 })
        if (status !== 'ALL') params.append('status', status)
        const { data } = await api.get(`/auctions/my?${params}`)
        setAuctions(data.content)
        setTotalPages(data.totalPages)
      } catch {
        // handled silently
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [status, page, isVerifiedSeller])

  useEffect(() => { setPage(0) }, [status])

  const handleApply = async () => {
    try {
      await api.post('/user/apply-seller')
      await refreshUser() // update role in state immediately
      setApplyMsg('Application submitted! An admin will review it shortly.')
    } catch (err) {
      setApplyMsg(err.response?.data?.message || 'Failed to apply.')
    }
  }

  const handleRefreshStatus = async () => {
    setRefreshing(true)
    await refreshUser()
    setRefreshing(false)
  }

  const handleCancel = async (auctionId) => {
    if (!window.confirm('Cancel this auction?')) return
    try {
      await api.delete(`/auctions/${auctionId}`)
      setAuctions(prev => prev.map(a =>
        a.id === auctionId ? { ...a, status: 'CANCELLED' } : a
      ))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel auction')
    }
  }

  const statusColor = (s) => ({
    ACTIVE:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    SCHEDULED: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
    ENDED:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
    SOLD:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
    DRAFT:     { color: '#5a5780', bg: 'rgba(90,87,128,0.1)'   },
    CANCELLED: { color: '#5a5780', bg: 'rgba(90,87,128,0.1)'   },
  }[s] || { color: '#5a5780', bg: 'rgba(90,87,128,0.1)' })

  return (
    <div style={s.page}>
      <div className="container" style={s.inner}>
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>My Auctions</h1>
            <p style={s.sub}>Manage your listed items</p>
          </div>
          {isVerifiedSeller && (
            <Link to="/create-auction" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              + Create auction
            </Link>
          )}
        </div>

        {/* ── NOT A VERIFIED SELLER ── */}
        {!isVerifiedSeller && (
          <div style={s.flowWrap}>

            {/* Step 1 */}
            <div style={{ ...s.step, ...(isNone ? s.stepActive : s.stepDone) }}>
              <div style={s.stepNum}>{isNone ? '1' : '✓'}</div>
              <div style={s.stepBody}>
                <p style={s.stepTitle}>Apply to become a seller</p>
                <p style={s.stepDesc}>Submit your application. It takes less than 10 seconds.</p>
                {isNone && (
                  applyMsg
                    ? <p style={s.applySuccess}>{applyMsg}</p>
                    : <button onClick={handleApply} className="btn-primary" style={{ marginTop: 12, fontSize: 13 }}>
                        Apply now
                      </button>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ ...s.step, ...(isPending ? s.stepActive : isRejected ? s.stepFail : !isNone ? s.stepDone : {}) }}>
              <div style={{ ...s.stepNum, ...(isRejected ? s.stepNumFail : {}) }}>
                {isRejected ? '✕' : isPending || isNone ? '2' : '✓'}
              </div>
              <div style={s.stepBody}>
                <p style={s.stepTitle}>Wait for admin approval</p>
                {isPending && (
                  <>
                    <p style={s.stepDesc}>Your application is under review. You can check for updates below.</p>
                    <button
                      onClick={handleRefreshStatus}
                      className="btn-ghost"
                      style={{ marginTop: 12, fontSize: 13 }}
                      disabled={refreshing}
                    >
                      {refreshing ? 'Checking…' : '↻ Check approval status'}
                    </button>
                  </>
                )}
                {isRejected && (
                  <p style={{ ...s.stepDesc, color: 'var(--danger)' }}>
                    Your application was rejected. Contact support for more information.
                  </p>
                )}
                {isNone && <p style={s.stepDesc}>An admin will review and approve your application.</p>}
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ ...s.step, ...(isVerifiedSeller ? s.stepActive : {}) }}>
              <div style={s.stepNum}>3</div>
              <div style={s.stepBody}>
                <p style={s.stepTitle}>Start creating auctions</p>
                <p style={s.stepDesc}>Once approved, the "+ Create auction" button appears at the top of this page.</p>
              </div>
            </div>

          </div>
        )}

        {/* ── VERIFIED SELLER VIEW ── */}
        {isVerifiedSeller && (
          <>
            <div style={s.filters}>
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setStatus(f)}
                  style={{ ...s.filterPill, ...(status === f ? s.filterPillActive : {}) }}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={s.skeletons}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={s.skRow} />
                ))}
              </div>
            ) : auctions.length === 0 ? (
              <div style={s.empty}>
                <span style={s.emptyIcon}>📦</span>
                <h3 style={s.emptyTitle}>No auctions found</h3>
                <p style={s.emptySub}>
                  {status === 'ALL'
                    ? "You haven't created any auctions yet."
                    : `No ${status.toLowerCase()} auctions.`}
                </p>
                <Link to="/create-auction" className="btn-primary" style={{ marginTop: 8 }}>
                  Create your first auction
                </Link>
              </div>
            ) : (
              <div style={s.list}>
                {auctions.map(auction => {
                  const sc = statusColor(auction.status)
                  return (
                    <div key={auction.id} style={s.row}>
                      <div style={s.rowImage}>
                        {auction.images?.[0]
                          ? <img src={auction.images[0]} alt="" style={s.rowImg} />
                          : <div style={s.rowImgPlaceholder}>🏷</div>
                        }
                      </div>
                      <div style={s.rowInfo}>
                        <Link to={`/auctions/${auction.id}`} style={s.rowTitle}>
                          {auction.title}
                        </Link>
                        <p style={s.rowCategory}>{auction.category?.replace(/_/g, ' ')}</p>
                      </div>
                      <span style={{ ...s.statusBadge, color: sc.color, background: sc.bg }}>
                        {auction.status}
                      </span>
                      <div style={s.rowPrice}>
                        <p style={s.rowPriceVal}>
                          ${Number(auction.currentPrice || auction.startingPrice)
                            .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p style={s.rowBids}>{auction.totalBids} bids</p>
                      </div>
                      <p style={s.rowDate}>
                        {new Date(auction.endTime).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                      <div style={s.rowActions}>
                        <Link to={`/auctions/${auction.id}`} className="btn-ghost"
                          style={{ padding: '6px 14px', fontSize: 12 }}>
                          View
                        </Link>
                        {(auction.status === 'DRAFT' || auction.status === 'SCHEDULED') && (
                          <button onClick={() => handleCancel(auction.id)} style={s.cancelBtn}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div style={s.pagination}>
                <button className="btn-ghost" disabled={page === 0}
                  onClick={() => setPage(p => p - 1)} style={{ padding: '8px 20px', fontSize: 13 }}>
                  ← Previous
                </button>
                <span style={s.pageInfo}>Page {page + 1} of {totalPages}</span>
                <button className="btn-ghost" disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)} style={{ padding: '8px 20px', fontSize: 13 }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { flex: 1, paddingBottom: 80 },
  inner: { paddingTop: 48 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  heading: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 },
  sub: { fontSize: 15, color: 'var(--text-secondary)' },

  // Step flow
  flowWrap: { display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560 },
  step: {
    display: 'flex', gap: 18, padding: '24px 28px',
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 14, opacity: 0.5,
  },
  stepActive: { opacity: 1, border: '1px solid var(--border)' },
  stepDone:   { opacity: 0.7 },
  stepFail:   { opacity: 1, border: '1px solid rgba(239,68,68,0.3)' },
  stepNum: {
    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
    background: 'var(--accent-subtle)', border: '1px solid var(--border)',
    color: 'var(--accent-bright)', fontFamily: "'Syne', sans-serif",
    fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stepNumFail: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' },
  stepBody: { display: 'flex', flexDirection: 'column', gap: 4 },
  stepTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' },
  stepDesc:  { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 },
  applySuccess: { fontSize: 13, color: 'var(--success)', marginTop: 8, background: 'rgba(16,185,129,0.1)', padding: '8px 12px', borderRadius: 8 },

  // Filters
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  filterPill: { padding: '6px 14px', borderRadius: 999, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px' },
  filterPillActive: { background: 'var(--accent-subtle)', border: '1px solid var(--border)', color: 'var(--accent-bright)' },

  // Skeletons
  skeletons: { display: 'flex', flexDirection: 'column', gap: 10 },
  skRow: { height: 72, borderRadius: 12 },

  // Empty
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 12 },
  emptyIcon: { fontSize: 56, opacity: 0.3 },
  emptyTitle: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text-secondary)' },
  emptySub: { fontSize: 14, color: 'var(--text-muted)' },

  // List
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'grid', gridTemplateColumns: '56px 1fr 120px 130px 110px 130px', gap: 16, alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '14px 18px' },
  rowImage: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 },
  rowImg: { width: '100%', height: '100%', objectFit: 'cover' },
  rowImgPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, opacity: 0.3 },
  rowInfo: { minWidth: 0 },
  rowTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowCategory: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' },
  rowPrice: {},
  rowPriceVal: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--gold-bright)' },
  rowBids: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  rowDate: { fontSize: 12, color: 'var(--text-secondary)' },
  rowActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: { padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 40 },
  pageInfo: { fontFamily: "'Syne', sans-serif", fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 },
}