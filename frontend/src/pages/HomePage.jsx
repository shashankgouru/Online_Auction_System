import { useState, useEffect, useCallback } from 'react'
import AuctionCard from '../components/AuctionCard'
import api from '../api/axios'

const CATEGORIES = [
  'ALL', 'ELECTRONICS', 'FASHION', 'HOME_AND_GARDEN', 'SPORTS',
  'COLLECTIBLES', 'ART', 'VEHICLES', 'JEWELRY', 'BOOKS', 'TOYS', 'MUSIC', 'OTHER'
]

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest first' },
  { value: 'ending_soon', label: 'Ending soon'  },
  { value: 'price_asc',   label: 'Price: Low → High' },
  { value: 'price_desc',  label: 'Price: High → Low' },
]

export default function HomePage() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('ALL')
  const [sort, setSort] = useState('newest')

  const fetchAuctions = useCallback(async () => {
    setLoading(true)
    try {
      let res
      const params = { page, size: 12, sort }

      if (keyword.trim()) {
        res = await api.get('/auctions/search', {
          params: {
            ...params,
            keyword: keyword.trim(),
            ...(category !== 'ALL' ? { category } : {}),
          }
        })
      } else if (category !== 'ALL') {
        res = await api.get(`/auctions/category/${category}`, { params })
      } else {
        res = await api.get('/auctions', { params })
      }

      setAuctions(res.data.content)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      console.error('Failed to fetch auctions', err)
    } finally {
      setLoading(false)
    }
  }, [page, keyword, category, sort])

  useEffect(() => { fetchAuctions() }, [fetchAuctions])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [keyword, category, sort])

  const handleSearch = (e) => {
    e.preventDefault()
    setKeyword(searchInput)
  }

  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroGlow} />
        <div className="container" style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Bid Win <span style={styles.heroAccent}>Own</span>
          </h1>
          <p style={styles.heroSub}>
            Real-time auctions on thousands of items. Every second counts.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              style={styles.searchInput}
              placeholder="Search auctions…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ borderRadius: '10px', padding: '0 28px' }}>
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={styles.main}>

        {/* Filters bar */}
        <div style={styles.filtersBar}>
          {/* Category pills */}
          <div style={styles.categoryPills}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  ...styles.pill,
                  ...(category === cat ? styles.pillActive : {}),
                }}
              >
                {cat === 'ALL' ? 'All' : cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={styles.sortSelect}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Results header */}
        <div style={styles.resultsHeader}>
          {keyword && (
            <p style={styles.resultsMeta}>
              Results for "<strong style={{ color: 'var(--text-primary)' }}>{keyword}</strong>"
              <button onClick={() => { setKeyword(''); setSearchInput('') }} style={styles.clearBtn}>
                ✕ Clear
              </button>
            </p>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={styles.skeletonCard} />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>🔍</span>
            <h3 style={styles.emptyTitle}>No auctions found</h3>
            <p style={styles.emptySub}>Try a different search or category</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {auctions.map((auction, i) => (
              <div
                key={auction.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-up"
              >
                <AuctionCard auction={auction} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              className="btn-ghost"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              ← Previous
            </button>
            <span style={styles.pageInfo}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="btn-ghost"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { flex: 1 },
  hero: {
    position: 'relative',
    padding: '80px 0 60px',
    overflow: 'hidden',
    borderBottom: '1px solid var(--border-subtle)',
  },
  heroGlow: {
    position: 'absolute',
    top: '-50%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '900px',
    height: '600px',
    background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  heroTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 'clamp(40px, 6vw, 72px)',
    letterSpacing: '-2px',
    lineHeight: 1.05,
  },
  heroAccent: {
    color: 'var(--accent-bright)',
    position: 'relative',
  },
  heroSub: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    maxWidth: '480px',
  },
  searchForm: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    maxWidth: '560px',
    marginTop: '8px',
  },
  searchInput: {
    flex: 1,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '14px 20px',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontFamily: "'DM Sans', sans-serif",
  },
  main: {
    paddingTop: '40px',
    paddingBottom: '80px',
  },
  filtersBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  categoryPills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  pill: {
    padding: '6px 14px',
    borderRadius: '999px',
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    fontFamily: "'Syne', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  pillActive: {
    background: 'var(--accent-subtle)',
    border: '1px solid var(--border)',
    color: 'var(--accent-bright)',
  },
  sortSelect: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    color: 'var(--text-primary)',
    fontFamily: "'Syne', sans-serif",
    fontSize: '13px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  resultsHeader: { marginBottom: '16px', minHeight: '24px' },
  resultsMeta: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '4px',
    transition: 'color 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  skeletonCard: { height: '340px' },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '100px 0',
  },
  emptyIcon: { fontSize: '56px', opacity: 0.3 },
  emptyTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
  },
  emptySub: { fontSize: '14px', color: 'var(--text-muted)' },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '56px',
  },
  pageInfo: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
}