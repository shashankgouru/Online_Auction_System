import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

function useCountdown(endTime) {
  const calc = () => {
    const diff = new Date(endTime) - new Date()
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true }
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      expired: false,
    }
  }
  const [time, setTime] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(t)
  }, [endTime])
  return time
}

function CountdownDisplay({ endTime, status }) {
  const { d, h, m, s, expired } = useCountdown(endTime)
  if (status !== 'ACTIVE') return null
  const urgent = d === 0 && h < 2

  return (
    <div style={{ ...styles.countdown, ...(urgent ? styles.countdownUrgent : {}) }}>
      <span style={styles.countdownIcon}>⏱</span>
      {d > 0
        ? `${d}d ${h}h ${m}m`
        : expired
        ? 'Ended'
        : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
    </div>
  )
}

export default function AuctionCard({ auction }) {
  const [hovered, setHovered] = useState(false)
  const img = auction.images?.[0]

  const statusBadge = {
    ACTIVE:    { label: 'Live',      class: 'badge-active'    },
    SCHEDULED: { label: 'Upcoming',  class: 'badge-scheduled' },
    ENDED:     { label: 'Ended',     class: 'badge-ended'     },
    SOLD:      { label: 'Sold',      class: 'badge-ended'     },
    DRAFT:     { label: 'Draft',     class: 'badge-draft'     },
    CANCELLED: { label: 'Cancelled', class: 'badge-draft'     },
  }[auction.status] || { label: auction.status, class: 'badge-draft' }

  return (
    <Link
      to={`/auctions/${auction.id}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <article style={{
        ...styles.card,
        ...(hovered ? styles.cardHover : {}),
      }}>
        {/* Image */}
        <div style={styles.imageWrap}>
          {img ? (
            <img src={img} alt={auction.title} style={styles.image} />
          ) : (
            <div style={styles.imagePlaceholder}>
              <span style={styles.placeholderIcon}>🏷</span>
            </div>
          )}
          <div style={styles.imageOverlay} />

          {/* Badges on image */}
          <div style={styles.imageBadges}>
            <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
          </div>

          {/* Countdown */}
          <CountdownDisplay endTime={auction.endTime} status={auction.status} />
        </div>

        {/* Body */}
        <div style={styles.body}>
          <p style={styles.category}>{auction.category?.replace(/_/g, ' ')}</p>
          <h3 style={styles.title}>{auction.title}</h3>

          <div style={styles.footer}>
            <div>
              <p style={styles.priceLabel}>Current bid</p>
              <p style={styles.price}>
                ${Number(auction.currentPrice || auction.startingPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div style={styles.bidsInfo}>
              <span style={styles.bidsCount}>{auction.totalBids}</span>
              <span style={styles.bidsLabel}> bids</span>
            </div>
          </div>

          <p style={styles.seller}>by {auction.sellerUsername}</p>
        </div>
      </article>
    </Link>
  )
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHover: {
    border: '1px solid var(--border)',
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 48px rgba(124,58,237,0.2)',
  },
  imageWrap: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden',
    background: 'var(--bg-elevated)',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.35s ease',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-card))',
  },
  placeholderIcon: {
    fontSize: '48px',
    opacity: 0.3,
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(8,8,15,0.6) 0%, transparent 50%)',
  },
  imageBadges: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    display: 'flex',
    gap: '6px',
  },
  countdown: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    background: 'rgba(8,8,15,0.75)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '4px 10px',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: '12px',
    color: '#f1f0ff',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  countdownUrgent: {
    background: 'rgba(239,68,68,0.2)',
    border: '1px solid rgba(239,68,68,0.4)',
    color: '#fca5a5',
  },
  countdownIcon: { fontSize: '10px' },
  body: {
    padding: '16px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  category: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: 'var(--accent-bright)',
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  footer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  priceLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  price: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '20px',
    color: 'var(--gold-bright)',
    letterSpacing: '-0.5px',
  },
  bidsInfo: {
    textAlign: 'right',
  },
  bidsCount: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: '18px',
    color: 'var(--text-primary)',
  },
  bidsLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  seller: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
}