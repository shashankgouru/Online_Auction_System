import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

// ── TimerDisplay ─────────────────────────────────────────────────────────────
function TimerDisplay({ seconds, status }) {
  const urgent  = seconds <= 5 && seconds > 0 && status === 'ACTIVE'
  const ended   = status === 'ENDED' || seconds === 0

  return (
    <div style={s.timerWrap}>
      <p style={s.timerLabel}>
        {ended ? 'Auction ended' : 'Time remaining'}
      </p>
      <div style={{
        ...s.timerValue,
        ...(urgent ? s.timerUrgent : {}),
        ...(ended  ? s.timerEnded  : {}),
      }}>
        {ended ? '00' : String(Math.max(seconds, 0)).padStart(2, '0')}
      </div>
      <p style={s.timerSublabel}>seconds</p>
      {urgent && <div style={s.timerPulse} />}
    </div>
  )
}

// ── PriceDisplay ──────────────────────────────────────────────────────────────
function PriceDisplay({ price, flash }) {
  return (
    <div style={{ ...s.priceWrap, ...(flash ? s.priceFlash : {}) }}>
      <p style={s.priceLabel}>Current bid</p>
      <p style={s.priceValue}>
        ${Number(price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

// ── ActiveUsers ───────────────────────────────────────────────────────────────
function ActiveUsers({ count }) {
  return (
    <div style={s.activeUsersWrap}>
      <div style={s.activeDot} />
      <span style={s.activeCount}>{count}</span>
      <span style={s.activeLabel}>{count === 1 ? 'user' : 'users'} watching</span>
    </div>
  )
}

// ── BidFeed ───────────────────────────────────────────────────────────────────
function BidFeed({ bids }) {
  return (
    <div style={s.feedWrap}>
      <p style={s.feedTitle}>Live bid feed</p>
      <div style={s.feedList}>
        {bids.length === 0 ? (
          <p style={s.feedEmpty}>No bids yet — be the first!</p>
        ) : (
          bids.map((bid, i) => (
            <div
              key={bid.id || i}
              style={{ ...s.feedItem, ...(i === 0 ? s.feedItemNew : {}) }}
            >
              <div style={s.feedAvatar}>
                {bid.bidderUsername?.charAt(0).toUpperCase()}
              </div>
              <div style={s.feedInfo}>
                <p style={s.feedBidder}>
                  {bid.bidderUsername}
                  {i === 0 && <span style={s.feedLeading}> Leading</span>}
                </p>
                <p style={s.feedTime}>
                  {bid.placedAt
                    ? new Date(bid.placedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })
                    : 'just now'}
                </p>
              </div>
              <p style={{ ...s.feedAmount, ...(i === 0 ? s.feedAmountTop : {}) }}>
                ${Number(bid.bidAmount || bid.amount).toLocaleString('en-US', {
                  minimumFractionDigits: 2
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── BidPanel ──────────────────────────────────────────────────────────────────
function BidPanel({ minBid, onBid, loading, error, success, disabled, user, auctionId }) {
  const [amount, setAmount] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    onBid(parseFloat(amount))
    setAmount('')
  }

  if (!user) {
    return (
      <div style={s.panelWrap}>
        <p style={s.panelTitle}>Place a bid</p>
        <p style={s.panelNote}>Sign in to participate in this live auction</p>
        <Link to="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
          Sign in to bid
        </Link>
      </div>
    )
  }

  if (disabled) {
    return (
      <div style={s.panelWrap}>
        <p style={s.panelTitle}>Auction ended</p>
        <p style={s.panelNote}>This auction has concluded.</p>
      </div>
    )
  }

  return (
    <div style={s.panelWrap}>
      <p style={s.panelTitle}>Place a bid</p>
      <p style={s.panelMinBid}>
        Minimum: <strong style={{ color: 'var(--gold-bright)' }}>${Number(minBid).toFixed(2)}</strong>
      </p>

      {error && <div style={s.panelError}>⚠ {error}</div>}
      {success && <div style={s.panelSuccess}>✓ {success}</div>}

      <form onSubmit={handleSubmit} style={s.panelForm}>
        <div style={s.bidInputWrap}>
          <span style={s.bidCurrency}>$</span>
          <input
            type="number"
            step="0.01"
            min={minBid}
            placeholder={Number(minBid).toFixed(2)}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={s.bidInput}
            required
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 800 }}
          disabled={loading}
        >
          {loading ? 'Placing…' : '⚡ Place Bid'}
        </button>
      </form>
      <p style={s.panelDisclaimer}>By bidding you agree to purchase if you win.</p>
    </div>
  )
}

// ── Main LiveAuctionPage ──────────────────────────────────────────────────────
export default function LiveAuctionPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const stompRef = useRef(null)
  const token    = localStorage.getItem('token')

  const [auction, setAuction]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [connected, setConnected]     = useState(false)

  // Live room state
  const [currentPrice, setCurrentPrice] = useState(0)
  const [timer, setTimer]               = useState(15)
  const [activeUsers, setActiveUsers]   = useState(0)
  const [highestBidder, setHighestBidder] = useState(null)
  const [totalBids, setTotalBids]       = useState(0)
  const [status, setStatus]             = useState('ACTIVE')
  const [winner, setWinner]             = useState(null)
  const [bidFeed, setBidFeed]           = useState([])
  const [priceFlash, setPriceFlash]     = useState(false)

  // Bid form state
  const [bidLoading, setBidLoading]   = useState(false)
  const [bidError, setBidError]       = useState('')
  const [bidSuccess, setBidSuccess]   = useState('')

  // Load auction data
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/auctions/${id}`)
        setAuction(data)
        setCurrentPrice(parseFloat(data.currentPrice || data.startingPrice))
        setTotalBids(data.totalBids || 0)
        setHighestBidder(data.highestBidderUsername)
        if (data.status !== 'ACTIVE') setStatus(data.status)
      } catch {
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    // Load initial bid feed
    const fetchBids = async () => {
      try {
        const { data } = await api.get(`/auctions/${id}/bids/top?limit=10`)
        setBidFeed(data.map(b => ({
          id: b.id,
          bidderUsername: b.bidderUsername,
          amount: b.amount,
          bidAmount: b.amount,
          placedAt: b.placedAt,
        })))
      } catch {}
    }

    fetch()
    fetchBids()
  }, [id])

  // Flash price
  const flashPrice = useCallback(() => {
    setPriceFlash(true)
    setTimeout(() => setPriceFlash(false), 600)
  }, [])

  // Connect WebSocket
  useEffect(() => {
    const client = new Client({
      brokerURL: 'ws://localhost:8081/ws',
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

      onConnect: () => {
        setConnected(true)

        // Subscribe to the auction room topic
        client.subscribe(`/topic/auction/${id}`, (message) => {
          const data = JSON.parse(message.body)
          handleRoomMessage(data)
        })

        // Subscribe to personal error queue
        if (user) {
          client.subscribe(`/user/queue/errors`, (message) => {
            const err = JSON.parse(message.body)
            setBidError(err.message || 'Bid failed')
            setBidLoading(false)
          })
        }

        // Join the room
        client.publish({ destination: `/app/auction/${id}/join` })
      },

      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    })

    client.activate()
    stompRef.current = client

    return () => {
      if (stompRef.current) {
        stompRef.current.publish({ destination: `/app/auction/${id}/leave` })
        stompRef.current.deactivate()
      }
    }
  }, [id, token])

  const handleRoomMessage = useCallback((data) => {
    switch (data.type) {
      case 'ROOM_STATE':
        if (data.currentPrice) setCurrentPrice(parseFloat(data.currentPrice))
        if (data.totalBids   != null) setTotalBids(data.totalBids)
        if (data.remainingTime != null) setTimer(data.remainingTime)
        if (data.activeUsers != null) setActiveUsers(data.activeUsers)
        if (data.highestBidderUsername) setHighestBidder(data.highestBidderUsername)
        break

      case 'NEW_BID':
        setCurrentPrice(parseFloat(data.currentPrice))
        setTotalBids(data.totalBids)
        setHighestBidder(data.highestBidderUsername)
        setTimer(15) // reset shown on next TIMER_TICK
        flashPrice()
        setBidFeed(prev => [{
          id: data.bidId,
          bidderUsername: data.bidderUsername,
          bidAmount: data.bidAmount,
          amount: data.bidAmount,
          placedAt: data.placedAt,
        }, ...prev].slice(0, 20))
        if (data.activeUsers != null) setActiveUsers(data.activeUsers)
        setBidSuccess(`Bid of $${Number(data.bidAmount).toFixed(2)} placed!`)
        setBidLoading(false)
        setTimeout(() => setBidSuccess(''), 3000)
        break

      case 'TIMER_TICK':
        if (data.remainingTime != null) setTimer(data.remainingTime)
        if (data.activeUsers  != null) setActiveUsers(data.activeUsers)
        break

      case 'AUCTION_ENDED':
        setStatus('ENDED')
        setTimer(0)
        setWinner(data.winnerUsername)
        if (data.currentPrice) setCurrentPrice(parseFloat(data.currentPrice))
        if (data.totalBids != null) setTotalBids(data.totalBids)
        break

      default:
        break
    }
  }, [flashPrice])

  // Place bid via WebSocket
  const handleBid = useCallback((amount) => {
    if (!stompRef.current?.connected) {
      setBidError('Not connected. Please refresh.')
      return
    }
    setBidError('')
    setBidSuccess('')
    setBidLoading(true)

    stompRef.current.publish({
      destination: `/app/auction/${id}/bid`,
      body: JSON.stringify({ amount }),
    })

    // If no response in 5s, clear loading
    setTimeout(() => setBidLoading(false), 5000)
  }, [id])

  if (loading) return (
    <div style={s.loadingPage}><div style={s.spinner} /></div>
  )
  if (!auction) return null

  const minBid = currentPrice
    ? (currentPrice + parseFloat(auction.minimumBidIncrement || 1)).toFixed(2)
    : parseFloat(auction.startingPrice).toFixed(2)

  const isEnded = status === 'ENDED' || status === 'SOLD'

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div className="container" style={s.headerInner}>
          <div style={s.headerLeft}>
            <Link to={`/auctions/${id}`} style={s.backLink}>← Detail view</Link>
            <h1 style={s.headerTitle} title={auction.title}>
              {auction.title.length > 50 ? auction.title.slice(0, 50) + '…' : auction.title}
            </h1>
          </div>
          <div style={s.headerRight}>
            <div style={s.connectionDot}>
              <div style={{ ...s.dot, ...(connected ? s.dotOn : s.dotOff) }} />
              <span style={s.dotLabel}>{connected ? 'Live' : 'Connecting…'}</span>
            </div>
            <ActiveUsers count={activeUsers} />
          </div>
        </div>
      </div>

      {/* Winner banner */}
      {isEnded && (
        <div style={s.winnerBanner}>
          <div className="container" style={s.winnerInner}>
            <span style={s.winnerIcon}>🏆</span>
            <div>
              <p style={s.winnerTitle}>Auction Complete!</p>
              {winner ? (
                <p style={s.winnerMsg}>
                  {winner === user?.username
                    ? '🎉 Congratulations! You won this auction!'
                    : `Winner: ${winner} — Final price: $${Number(currentPrice).toFixed(2)}`}
                </p>
              ) : (
                <p style={s.winnerMsg}>Auction ended with no bids.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="container" style={s.mainLayout}>

        {/* LEFT — Bid feed */}
        <BidFeed bids={bidFeed} />

        {/* CENTER — Timer + Price */}
        <div style={s.center}>
          <TimerDisplay seconds={timer} status={isEnded ? 'ENDED' : 'ACTIVE'} />
          <PriceDisplay price={currentPrice} flash={priceFlash} />

          <div style={s.centerStats}>
            <div style={s.stat}>
              <p style={s.statVal}>{totalBids}</p>
              <p style={s.statLabel}>Total bids</p>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <p style={s.statVal}>{highestBidder || '—'}</p>
              <p style={s.statLabel}>Leading bidder</p>
            </div>
          </div>

          {auction.reservePrice && (
            <div style={s.reserveInfo}>
              {auction.reserveMet
                ? <span style={s.reserveMet}>✓ Reserve price met</span>
                : <span style={s.reserveNotMet}>Reserve price not yet met</span>}
            </div>
          )}
        </div>

        {/* RIGHT — Bid panel */}
        <BidPanel
          minBid={minBid}
          onBid={handleBid}
          loading={bidLoading}
          error={bidError}
          success={bidSuccess}
          disabled={isEnded}
          user={user}
          auctionId={id}
        />

      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { flex: 1, background: 'var(--bg-base)', minHeight: '100vh' },
  loadingPage: { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 48, height: 48, border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  // Header
  header: { borderBottom: '1px solid var(--border-subtle)', background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(12px)', padding: '14px 0', position: 'sticky', top: 64, zIndex: 50 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  backLink: { fontSize: 12, color: 'var(--accent-bright)', textDecoration: 'none', fontFamily: "'Syne', sans-serif", fontWeight: 600 },
  headerTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 },
  connectionDot: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  dotOn:  { background: '#10b981', boxShadow: '0 0 8px #10b981' },
  dotOff: { background: '#5a5780' },
  dotLabel: { fontSize: 11, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },

  // Winner
  winnerBanner: { background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(124,58,237,0.1))', borderBottom: '1px solid rgba(245,158,11,0.25)', padding: '16px 0' },
  winnerInner: { display: 'flex', alignItems: 'center', gap: 16 },
  winnerIcon: { fontSize: 36 },
  winnerTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--gold-bright)', marginBottom: 4 },
  winnerMsg:   { fontSize: 14, color: 'var(--text-primary)' },

  // Main layout
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr 1fr',
    gap: 24,
    paddingTop: 32,
    paddingBottom: 80,
    alignItems: 'start',
  },

  // ── Timer ──
  timerWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' },
  timerLabel: { fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)' },
  timerValue: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 'clamp(80px, 12vw, 128px)',
    lineHeight: 1, letterSpacing: '-4px',
    color: 'var(--text-primary)',
    transition: 'color 0.3s',
    position: 'relative', zIndex: 1,
  },
  timerUrgent: {
    color: '#ef4444',
    animation: 'pulse 0.8s ease-in-out infinite',
    textShadow: '0 0 40px rgba(239,68,68,0.5)',
  },
  timerEnded: { color: 'var(--text-muted)' },
  timerSublabel: { fontSize: 13, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  timerPulse: {
    position: 'absolute', inset: -20, borderRadius: '50%',
    border: '2px solid rgba(239,68,68,0.3)',
    animation: 'ripple 1s ease-out infinite',
    pointerEvents: 'none',
  },

  // ── Price ──
  priceWrap: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 20, padding: '24px 32px', textAlign: 'center',
    transition: 'all 0.3s',
  },
  priceFlash: {
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.4)',
    boxShadow: '0 0 32px rgba(245,158,11,0.2)',
  },
  priceLabel: { fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 },
  priceValue: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 44px)', color: 'var(--gold-bright)', letterSpacing: '-1px' },

  // ── Center ──
  center: { display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'stretch' },
  centerStats: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    borderRadius: 14, padding: '16px 24px', gap: 24,
  },
  stat: { textAlign: 'center' },
  statVal: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', marginBottom: 2 },
  statLabel: { fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  statDivider: { width: 1, height: 36, background: 'var(--border-subtle)', flexShrink: 0 },
  reserveInfo: { textAlign: 'center' },
  reserveMet:    { fontSize: 12, color: 'var(--success)', fontFamily: "'Syne', sans-serif", fontWeight: 700 },
  reserveNotMet: { fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" },

  // ── Active users ──
  activeUsersWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse 2s infinite' },
  activeCount: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' },
  activeLabel: { fontSize: 12, color: 'var(--text-muted)' },

  // ── Bid feed ──
  feedWrap: { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 400 },
  feedTitle: { fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  feedList: { display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 480 },
  feedEmpty: { fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' },
  feedItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    transition: 'all 0.3s',
  },
  feedItemNew: {
    background: 'rgba(124,58,237,0.08)',
    border: '1px solid var(--border)',
    animation: 'slideIn 0.3s ease',
  },
  feedAvatar: { width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 },
  feedInfo: { flex: 1, minWidth: 0 },
  feedBidder: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  feedLeading: { fontSize: 10, background: 'rgba(16,185,129,0.15)', color: 'var(--success)', borderRadius: 4, padding: '1px 6px', marginLeft: 4, fontWeight: 700 },
  feedTime: { fontSize: 10, color: 'var(--text-muted)', marginTop: 1 },
  feedAmount: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0 },
  feedAmountTop: { color: 'var(--gold-bright)', fontSize: 16 },

  // ── Bid panel ──
  panelWrap: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 },
  panelTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' },
  panelMinBid: { fontSize: 13, color: 'var(--text-secondary)' },
  panelNote: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 },
  panelError: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' },
  panelSuccess: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#6ee7b7' },
  panelForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  panelDisclaimer: { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' },

  // Input
  bidInputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  bidCurrency: { position: 'absolute', left: 16, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--gold-bright)', pointerEvents: 'none', zIndex: 1 },
  bidInput: {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 16px 16px 38px',
    color: 'var(--text-primary)', fontSize: 22, fontFamily: "'Syne', sans-serif", fontWeight: 800,
    transition: 'all 0.2s',
  },
}