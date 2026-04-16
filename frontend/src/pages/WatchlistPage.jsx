import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

export default function WatchlistPage() {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const fetchWatchlist = async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/user/watchlist?page=${p}&size=12`)
      setItems(data.content)
      setTotalPages(data.totalPages)
    } catch {
      // handled silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWatchlist(page) }, [page])

  const handleRemove = async (auctionId) => {
    try {
      await api.delete(`/user/watchlist/${auctionId}`)
      setItems(prev => prev.filter(i => i.auctionId !== auctionId))
    } catch {
      // non-critical
    }
  }

  const statusColor = (s) => ({
    ACTIVE:    '#10b981',
    SCHEDULED: '#8b5cf6',
    ENDED:     '#ef4444',
    SOLD:      '#f59e0b',
  }[s] || '#5a5780')

  return (
    <div style={s.page}>
      <div className="container" style={s.inner}>
        <h1 style={s.heading}>Watchlist</h1>
        <p style={s.sub}>Auctions you are following</p>

        {loading ? (
          <div style={s.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={s.skCard} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={s.empty}>
            <span style={s.emptyIcon}>♡</span>
            <h3 style={s.emptyTitle}>Your watchlist is empty</h3>
            <p style={s.emptySub}>Save auctions to track them here</p>
            <Link to="/" className="btn-primary" style={{ marginTop: 8 }}>Browse auctions</Link>
          </div>
        ) : (
          <div style={s.grid}>
            {items.map(item => (
              <div key={item.watchlistId} style={s.card}>
                {/* Image */}
                <div style={s.imageWrap}>
                  {item.firstImage ? (
                    <img src={item.firstImage} alt={item.auctionTitle} style={s.image} />
                  ) : (
                    <div style={s.imagePlaceholder}>🏷</div>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(item.auctionId)}
                    style={s.removeBtn}
                    title="Remove from watchlist"
                  >
                    ♥
                  </button>
                </div>

                {/* Body */}
                <div style={s.body}>
                  <div style={s.topRow}>
                    <p style={s.category}>{item.category?.replace(/_/g, ' ')}</p>
                    <span style={{ ...s.statusDot, background: statusColor(item.status) }} />
                  </div>

                  <Link to={`/auctions/${item.auctionId}`} style={s.title}>
                    {item.auctionTitle}
                  </Link>

                  <div style={s.footer}>
                    <div>
                      <p style={s.priceLabel}>Current bid</p>
                      <p style={s.price}>
                        ${Number(item.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div style={s.endInfo}>
                      <p style={s.bids}>{item.totalBids} bids</p>
                      <p style={s.endDate}>
                        {new Date(item.endTime).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <Link to={`/auctions/${item.auctionId}`} className="btn-primary" style={{ width: '100%', textAlign: 'center', marginTop: 12, padding: '10px', fontSize: 13 }}>
                    View auction
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={s.pagination}>
            <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 20px', fontSize: 13 }}>
              ← Previous
            </button>
            <span style={s.pageInfo}>Page {page + 1} of {totalPages}</span>
            <button className="btn-ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 20px', fontSize: 13 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { flex: 1, paddingBottom: 80 },
  inner: { paddingTop: 48 },
  heading: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 },
  sub: { fontSize: 15, color: 'var(--text-secondary)', marginBottom: 40 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
  skCard: { height: 340, borderRadius: 18 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 12 },
  emptyIcon: { fontSize: 56, opacity: 0.3, color: '#ef4444' },
  emptyTitle: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text-secondary)' },
  emptySub: { fontSize: 14, color: 'var(--text-muted)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  imageWrap: { position: 'relative', height: 180, background: 'var(--bg-elevated)', flexShrink: 0 },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.2 },
  removeBtn: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  body: { padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  category: { fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent-bright)' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  title: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 },
  footer: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  priceLabel: { fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  price: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--gold-bright)', letterSpacing: '-0.5px' },
  endInfo: { textAlign: 'right' },
  bids: { fontSize: 12, color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif", fontWeight: 600 },
  endDate: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 40 },
  pageInfo: { fontFamily: "'Syne', sans-serif", fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 },
}