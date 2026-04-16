import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

export default function MyBidsPage() {
  const [bids, setBids]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await api.get(`/user/bids?page=${page}&size=20`)
        setBids(data.content)
        setTotalPages(data.totalPages)
      } catch {
        // handled silently
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [page])

  return (
    <div style={s.page}>
      <div className="container" style={s.inner}>
        <h1 style={s.heading}>My Bids</h1>
        <p style={s.sub}>All bids you have placed across auctions</p>

        {loading ? (
          <div style={s.skeletons}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={s.skRow} />
            ))}
          </div>
        ) : bids.length === 0 ? (
          <div style={s.empty}>
            <span style={s.emptyIcon}>🎯</span>
            <h3 style={s.emptyTitle}>No bids yet</h3>
            <p style={s.emptySub}>Start bidding on active auctions</p>
            <Link to="/" className="btn-primary" style={{ marginTop: 8 }}>Browse auctions</Link>
          </div>
        ) : (
          <div style={s.table}>
            {/* Header */}
            <div style={s.tableHeader}>
              <span>Auction</span>
              <span>Your bid</span>
              <span>Status</span>
              <span>Placed at</span>
            </div>

            {bids.map(bid => (
              <div key={bid.id} style={s.tableRow}>
                <Link to={`/auctions/${bid.auctionId}`} style={s.auctionLink}>
                  {bid.auctionTitle}
                </Link>
                <span style={s.amount}>
                  ${Number(bid.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ ...s.rank, ...(bid.rank === 1 ? s.rankLeading : {}) }}>
                  {bid.rank === 1 ? '🏆 Leading' : `#${bid.rank}`}
                </span>
                <span style={s.time}>
                  {new Date(bid.placedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={s.pagination}>
            <button
              className="btn-ghost"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '8px 20px', fontSize: 13 }}
            >
              ← Previous
            </button>
            <span style={s.pageInfo}>Page {page + 1} of {totalPages}</span>
            <button
              className="btn-ghost"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '8px 20px', fontSize: 13 }}
            >
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
  skeletons: { display: 'flex', flexDirection: 'column', gap: 10 },
  skRow: { height: 56 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 12 },
  emptyIcon: { fontSize: 56, opacity: 0.3 },
  emptyTitle: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text-secondary)' },
  emptySub: { fontSize: 14, color: 'var(--text-muted)' },
  table: { display: 'flex', flexDirection: 'column', gap: 2 },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
    padding: '12px 16px',
    fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)',
  },
  tableRow: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
    padding: '14px 16px',
    background: 'var(--bg-card)',
    borderRadius: 10,
    alignItems: 'center',
    border: '1px solid var(--border-subtle)',
  },
  auctionLink: {
    fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14,
    color: 'var(--text-primary)', textDecoration: 'none',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  amount: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--gold-bright)' },
  rank: { fontFamily: "'Syne', sans-serif", fontSize: 13, color: 'var(--text-secondary)' },
  rankLeading: { color: 'var(--success)', fontWeight: 700 },
  time: { fontSize: 12, color: 'var(--text-muted)' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 40 },
  pageInfo: { fontFamily: "'Syne', sans-serif", fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 },
}