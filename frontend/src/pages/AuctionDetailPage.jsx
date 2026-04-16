import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

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

function TimeUnit({ value, label }) {
  return (
    <div style={s.timeUnit}>
      <div style={s.timeValue}>{String(value).padStart(2, '0')}</div>
      <div style={s.timeLabel}>{label}</div>
    </div>
  )
}

export default function AuctionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const stompRef = useRef(null)

  const [auction, setAuction]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [topBids, setTopBids]             = useState([])
  const [watching, setWatching]           = useState(false)
  const [watchLoading, setWatchLoading]   = useState(false)
  const [bidAmount, setBidAmount]         = useState('')
  const [bidLoading, setBidLoading]       = useState(false)
  const [bidError, setBidError]           = useState('')
  const [bidSuccess, setBidSuccess]       = useState('')
  const [connected, setConnected]         = useState(false)
  const [liveActivity, setLiveActivity]   = useState(null) // flash on new bid
  const [autoBidAmount, setAutoBidAmount] = useState('')
  const [autoBid, setAutoBid]             = useState(null)  // existing auto-bid
  const [autoBidLoading, setAutoBidLoading] = useState(false)
  const [autoBidMsg, setAutoBidMsg]       = useState('')
  const [showAutoBid, setShowAutoBid]     = useState(false)

  const fetchAuction = useCallback(async () => {
    try {
      const { data } = await api.get(`/auctions/${id}`)
      setAuction(data)
    } catch {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchTopBids = useCallback(async () => {
    try {
      const { data } = await api.get(`/auctions/${id}/bids/top?limit=8`)
      setTopBids(data)
    } catch {}
  }, [id])

  const checkWatchlist = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get(`/user/watchlist/${id}/check`)
      setWatching(data.watching)
    } catch {}
  }, [id, user])

  const fetchAutoBid = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get('/auctions/' + id + '/auto-bid')
      setAutoBid(data)
    } catch {
      setAutoBid(null) // 204 = no auto-bid set
    }
  }, [id, user])

  // Connect WebSocket
  useEffect(() => {
    fetchAuction()
    fetchTopBids()
    checkWatchlist()
    fetchAutoBid()

    const client = new Client({
      brokerURL: 'ws://localhost:8081/ws',
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        // Subscribe to this auction's topic
        client.subscribe(`/topic/auction/${id}`, (message) => {
          const data = JSON.parse(message.body)

          if (data.type === 'NEW_BID') {
            // Update auction state live
            setAuction(prev => prev ? {
              ...prev,
              currentPrice: data.currentPrice,
              totalBids: data.totalBids,
              highestBidderUsername: data.highestBidderUsername,
            } : prev)

            // Prepend to bid feed
            setTopBids(prev => [{
              id: data.bidId,
              bidderUsername: data.bidderUsername,
              amount: data.bidAmount,
              placedAt: data.placedAt,
            }, ...prev].slice(0, 8))

            // Flash live activity
            setLiveActivity(`${data.bidderUsername} just bid $${Number(data.bidAmount).toFixed(2)}`)
            setTimeout(() => setLiveActivity(null), 4000)
          }

          if (data.type === 'AUCTION_ENDED') {
            setAuction(prev => prev ? {
              ...prev,
              status: data.winnerUsername ? 'SOLD' : 'ENDED',
              winnerUsername: data.winnerUsername,
              currentPrice: data.currentPrice,
              totalBids: data.totalBids,
            } : prev)
          }
        })

        // Tell server we joined
        client.publish({ destination: `/app/auction/${id}/join` })
      },
      onDisconnect: () => setConnected(false),
    })

    client.activate()
    stompRef.current = client

    return () => { client.deactivate() }
  }, [id])

  const countdown = useCountdown(auction?.endTime || new Date().toISOString())
  const isActive  = auction?.status === 'ACTIVE'
  const isEnded   = auction?.status === 'ENDED' || auction?.status === 'SOLD'
  const urgent    = countdown.d === 0 && countdown.h < 2 && isActive

  const handlePlaceBid = async (e) => {
    e.preventDefault()
    setBidError('')
    setBidSuccess('')
    setBidLoading(true)
    try {
      await api.post(`/auctions/${id}/bids`, { amount: parseFloat(bidAmount) })
      setBidSuccess('Bid placed!')
      setBidAmount('')
      // WebSocket will update the UI — no need to re-fetch
    } catch (err) {
      setBidError(err.response?.data?.message || 'Failed to place bid')
    } finally {
      setBidLoading(false)
    }
  }

  const handleSetAutoBid = async (e) => {
    e.preventDefault()
    setAutoBidLoading(true)
    setAutoBidMsg('')
    try {
      const { data } = await api.post('/auctions/' + id + '/auto-bid', {
        maxAmount: parseFloat(autoBidAmount)
      })
      setAutoBid(data)
      setAutoBidMsg('Auto-bid set! We will bid for you up to $' + parseFloat(autoBidAmount).toFixed(2))
      setAutoBidAmount('')
    } catch (err) {
      setAutoBidMsg(err.response?.data?.message || 'Failed to set auto-bid')
    } finally {
      setAutoBidLoading(false)
    }
  }

  const handleCancelAutoBid = async () => {
    setAutoBidLoading(true)
    try {
      await api.delete('/auctions/' + id + '/auto-bid')
      setAutoBid(null)
      setAutoBidMsg('Auto-bid cancelled')
    } catch (err) {
      setAutoBidMsg(err.response?.data?.message || 'Failed to cancel')
    } finally {
      setAutoBidLoading(false)
    }
  }

  const handleWatchlist = async () => {
    if (!user) { navigate('/login'); return }
    setWatchLoading(true)
    try {
      if (watching) {
        await api.delete(`/user/watchlist/${id}`)
        setWatching(false)
      } else {
        await api.post(`/user/watchlist/${id}`)
        setWatching(true)
      }
    } catch {} finally {
      setWatchLoading(false)
    }
  }

  if (loading) return (
    <div style={s.loadingPage}><div style={s.spinner} /></div>
  )
  if (!auction) return null

  const images  = auction.images?.length ? auction.images : []
  const minBid  = auction.currentPrice
    ? (parseFloat(auction.currentPrice) + parseFloat(auction.minimumBidIncrement)).toFixed(2)
    : parseFloat(auction.startingPrice).toFixed(2)

  const statusBadgeClass =
    auction.status === 'ACTIVE'    ? 'badge-active'    :
    auction.status === 'SCHEDULED' ? 'badge-scheduled' :
    auction.status === 'ENDED' || auction.status === 'SOLD' ? 'badge-ended' : 'badge-draft'

  return (
    <div style={s.page}>

      {/* Live activity flash */}
      {liveActivity && (
        <div style={s.liveFlash} className="animate-fade-in">
          ⚡ {liveActivity}
        </div>
      )}

      <div className="container" style={s.inner}>

        {/* Breadcrumb */}
        <div style={s.breadcrumb}>
          <Link to="/" style={s.breadLink}>Browse</Link>
          <span style={s.breadSep}>›</span>
          <span style={s.breadCur}>{auction.category?.replace(/_/g, ' ')}</span>
          <span style={s.breadSep}>›</span>
          <span style={s.breadCur}>
            {auction.title.length > 40 ? auction.title.slice(0, 40) + '…' : auction.title}
          </span>
          {/* Live indicator */}
          {isActive && (
            <div style={s.liveIndicator}>
              <div style={{ ...s.liveDot, ...(connected ? s.liveDotOn : s.liveDotOff) }} />
              <span style={s.liveLabel}>{connected ? 'Live' : 'Connecting…'}</span>
            </div>
          )}
        </div>

        {/* Enter Live Room CTA — only for active auctions */}
        {isActive && (
          <Link
            to={`/live/${id}`}
            style={s.liveRoomBtn}
          >
            <span style={s.liveRoomDot} />
            ⚡ Enter Live Auction Room
            <span style={s.liveRoomHint}>15-second timer · real-time bidding</span>
          </Link>
        )}

        <div style={s.layout}>

          {/* ── LEFT COLUMN ── */}
          <div style={s.left}>

            {/* Main image */}
            <div style={s.mainImageWrap}>
              {images.length > 0
                ? <img src={images[selectedImage]} alt={auction.title} style={s.mainImage} />
                : <div style={s.noImage}><span style={{ fontSize: 72, opacity: 0.2 }}>🏷</span></div>
              }
              <span className={`badge ${statusBadgeClass}`} style={s.mainBadge}>
                {auction.status}
              </span>
              <button
                onClick={handleWatchlist}
                disabled={watchLoading}
                style={{ ...s.watchBtn, ...(watching ? s.watchBtnActive : {}) }}
              >
                {watching ? '♥' : '♡'}
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={s.thumbs}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => setSelectedImage(i)}
                    style={{ ...s.thumb, ...(selectedImage === i ? s.thumbActive : {}) }}>
                    <img src={img} alt="" style={s.thumbImg} />
                  </div>
                ))}
              </div>
            )}

            {/* Seller */}
            <div style={s.sellerCard}>
              <div style={s.sellerAvatar}>{auction.sellerUsername?.charAt(0).toUpperCase()}</div>
              <div>
                <p style={s.sellerLabel}>Listed by</p>
                <p style={s.sellerName}>{auction.sellerUsername}</p>
              </div>
            </div>

            {/* Bid feed */}
            {topBids.length > 0 && (
              <div style={s.bidHistory}>
                <div style={s.bidHistoryHeader}>
                  <h3 style={s.bidHistoryTitle}>Bid history</h3>
                  {isActive && connected && (
                    <span style={s.liveTag}>● Live</span>
                  )}
                </div>
                <div style={s.bidList}>
                  {topBids.map((bid, i) => (
                    <div key={bid.id || i} style={s.bidRow}>
                      <div style={s.bidLeft}>
                        <div style={{ ...s.bidAvatar, ...(i === 0 ? s.bidAvatarTop : {}) }}>
                          {bid.bidderUsername?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={s.bidder}>
                            {bid.bidderUsername}
                            {i === 0 && <span style={s.leadingBadge}> Leading</span>}
                          </p>
                          <p style={s.bidTime}>
                            {bid.placedAt ? new Date(bid.placedAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            }) : 'just now'}
                          </p>
                        </div>
                      </div>
                      <p style={{ ...s.bidAmt, ...(i === 0 ? s.bidAmtTop : {}) }}>
                        ${Number(bid.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={s.right}>
            <p style={s.categoryLabel}>{auction.category?.replace(/_/g, ' ')}</p>
            <h1 style={s.title}>{auction.title}</h1>

            {/* Winner banner */}
            {isEnded && auction.winnerUsername && (
              <div style={s.winnerBanner}>
                <span style={s.winnerIcon}>🏆</span>
                <div>
                  <p style={s.winnerTitle}>Auction Won!</p>
                  <p style={s.winnerName}>
                    {auction.winnerUsername === user?.username
                      ? '🎉 Congratulations! You won this auction!'
                      : `Winner: ${auction.winnerUsername}`}
                  </p>
                  <p style={s.winnerPrice}>
                    Final price: ${Number(auction.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {isEnded && !auction.winnerUsername && (
              <div style={s.endedBanner}>
                <span>🏁</span>
                <p>This auction ended with no bids placed.</p>
              </div>
            )}

            {/* Countdown */}
            {isActive && (
              <div style={{ ...s.countdownBox, ...(urgent ? s.countdownUrgent : {}) }}>
                <p style={s.countdownLabel}>
                  {urgent ? '⚡ Ending very soon!' : '⏱ Time remaining'}
                </p>
                <div style={s.countdownRow}>
                  <TimeUnit value={countdown.d} label="Days" />
                  <span style={s.timeSep}>:</span>
                  <TimeUnit value={countdown.h} label="Hours" />
                  <span style={s.timeSep}>:</span>
                  <TimeUnit value={countdown.m} label="Mins" />
                  <span style={s.timeSep}>:</span>
                  <TimeUnit value={countdown.s} label="Secs" />
                </div>
              </div>
            )}

            {/* Price box */}
            <div style={s.priceBox}>
              <div>
                <p style={s.priceLabel}>{isEnded ? 'Final price' : 'Current bid'}</p>
                <p style={s.currentPrice}>
                  ${Number(auction.currentPrice || auction.startingPrice)
                    .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div style={s.priceRight}>
                <p style={s.bidsCount}>{auction.totalBids} bids</p>
                <p style={s.startingNote}>
                  Started at ${Number(auction.startingPrice)
                    .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                {auction.reserveMet && (
                  <span style={s.reserveMet}>✓ Reserve met</span>
                )}
              </div>
            </div>

            {/* Bid form / CTA */}
            {!user ? (
              <div style={s.ctaBox}>
                <p style={s.ctaMsg}>Sign in to place a bid or save to watchlist</p>
                <div style={s.ctaButtons}>
                  <Link to="/login" className="btn-primary" style={s.ctaBtn}>Sign in</Link>
                  <Link to="/register" className="btn-ghost" style={s.ctaBtn}>Register</Link>
                </div>
              </div>
            ) : isActive ? (
              <div style={s.bidFormBox}>
                <p style={s.bidFormLabel}>
                  Minimum bid: <strong style={{ color: 'var(--gold-bright)' }}>${minBid}</strong>
                </p>
                {bidError && <div style={s.bidError}><span>⚠</span> {bidError}</div>}
                {bidSuccess && <div style={s.bidSuccess}><span>✓</span> {bidSuccess}</div>}
                <form onSubmit={handlePlaceBid} style={s.bidForm}>
                  <div style={s.bidInputWrap}>
                    <span style={s.bidCurrency}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min={minBid}
                      placeholder={minBid}
                      value={bidAmount}
                      onChange={e => {
                        setBidAmount(e.target.value)
                        setBidError('')
                        setBidSuccess('')
                      }}
                      style={s.bidInput}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: 16 }}
                    disabled={bidLoading}
                  >
                    {bidLoading ? 'Placing bid…' : '⚡ Place bid'}
                  </button>
                </form>
                <p style={s.bidNote}>By bidding you agree to purchase the item if you win.</p>
              </div>
            ) : auction.status === 'SCHEDULED' ? (
              <div style={s.ctaBox}>
                <p style={s.ctaMsg}>⏰ Bidding opens when the auction starts.</p>
              </div>
            ) : null}

            {/* Auto-bid — active auctions, logged-in users only */}
            {user && isActive && (
              <div style={s.autoBidSection}>
                <button
                  onClick={() => { setShowAutoBid(v => !v); setAutoBidMsg('') }}
                  style={s.autoBidToggle}
                >
                  <span style={s.autoBidToggleTitle}>⚡ Auto-bid</span>
                  <span style={s.autoBidToggleHint}>
                    {autoBid
                      ? `Active — max $${Number(autoBid.maxAmount).toFixed(2)}`
                      : 'Set a maximum and we bid for you'}
                  </span>
                  <span style={s.autoBidChevron}>{showAutoBid ? '▲' : '▼'}</span>
                </button>

                {showAutoBid && (
                  <div style={s.autoBidBody}>
                    <p style={s.autoBidDesc}>
                      Set a maximum amount. When someone outbids you, we automatically place the next minimum bid — up to your maximum.
                    </p>

                    {autoBidMsg && (
                      <div style={autoBidMsg.includes('cancel') || autoBidMsg.includes('Failed')
                        ? s.autoBidError : s.autoBidSuccess}>
                        {autoBidMsg}
                      </div>
                    )}

                    {autoBid ? (
                      <div style={s.autoBidActive}>
                        <div>
                          <p style={s.autoBidActiveLabel}>Your auto-bid is active</p>
                          <p style={s.autoBidActiveAmount}>
                            Maximum: ${Number(autoBid.maxAmount).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={handleCancelAutoBid}
                          disabled={autoBidLoading}
                          style={s.cancelAutoBidBtn}
                        >
                          {autoBidLoading ? '…' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSetAutoBid} style={s.autoBidForm}>
                        <div style={s.bidInputWrap}>
                          <span style={s.bidCurrency}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min={minBid}
                            placeholder={`Max amount (min $${minBid})`}
                            value={autoBidAmount}
                            onChange={e => setAutoBidAmount(e.target.value)}
                            style={s.bidInput}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn-primary"
                          style={{ width: '100%', padding: '12px' }}
                          disabled={autoBidLoading}
                        >
                          {autoBidLoading ? 'Setting…' : 'Set auto-bid'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div style={s.descSection}>
              <h3 style={s.descHeading}>About this item</h3>
              <p style={s.desc}>{auction.description}</p>
            </div>

            {/* Meta */}
            <div style={s.metaGrid}>
              <div style={s.metaItem}>
                <span style={s.metaLabel}>Category</span>
                <span style={s.metaVal}>{auction.category?.replace(/_/g, ' ')}</span>
              </div>
              <div style={s.metaItem}>
                <span style={s.metaLabel}>Min increment</span>
                <span style={s.metaVal}>${Number(auction.minimumBidIncrement).toFixed(2)}</span>
              </div>
              <div style={s.metaItem}>
                <span style={s.metaLabel}>Starts</span>
                <span style={s.metaVal}>
                  {new Date(auction.startTime).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <div style={s.metaItem}>
                <span style={s.metaLabel}>Ends</span>
                <span style={s.metaVal}>
                  {new Date(auction.endTime).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { flex: 1, paddingBottom: 80, position: 'relative' },
  inner: { paddingTop: 32 },
  loadingPage: { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 40, height: 40, border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  // Live flash
  liveFlash: {
    position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
    zIndex: 500, background: 'rgba(124,58,237,0.95)', backdropFilter: 'blur(12px)',
    color: '#fff', padding: '10px 24px', borderRadius: 999,
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
    boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
    whiteSpace: 'nowrap',
  },

  // Breadcrumb
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, flexWrap: 'wrap' },
  breadLink: { fontSize: 13, color: 'var(--accent-bright)', textDecoration: 'none', fontFamily: "'Syne', sans-serif", fontWeight: 600 },
  breadSep: { fontSize: 13, color: 'var(--text-muted)' },
  breadCur: { fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" },
  liveIndicator: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '3px 10px' },
  liveDot: { width: 8, height: 8, borderRadius: '50%' },
  liveDotOn: { background: '#10b981', boxShadow: '0 0 6px #10b981' },
  liveDotOff: { background: '#5a5780' },
  liveLabel: { fontSize: 11, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },

  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'start' },
  left: { display: 'flex', flexDirection: 'column', gap: 16 },
  right: { display: 'flex', flexDirection: 'column', gap: 24 },

  // Image
  mainImageWrap: { position: 'relative', borderRadius: 18, overflow: 'hidden', background: 'var(--bg-elevated)', aspectRatio: '4/3' },
  mainImage: { width: '100%', height: '100%', objectFit: 'cover' },
  noImage: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mainBadge: { position: 'absolute', top: 16, left: 16 },
  watchBtn: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: '50%', background: 'rgba(8,8,15,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  watchBtnActive: { color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)' },

  // Thumbnails
  thumbs: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  thumb: { width: 72, height: 72, borderRadius: 6, overflow: 'hidden', border: '2px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s' },
  thumbActive: { border: '2px solid var(--accent)' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },

  // Seller
  sellerCard: { display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' },
  sellerAvatar: { width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 },
  sellerLabel: { fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' },
  sellerName: { fontSize: 15, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 },

  // Bid history
  bidHistory: { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 },
  bidHistoryHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  bidHistoryTitle: { fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' },
  liveTag: { fontSize: 11, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 999 },
  bidList: { display: 'flex', flexDirection: 'column', gap: 10 },
  bidRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  bidLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  bidAvatar: { width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 },
  bidAvatarTop: { background: 'rgba(124,58,237,0.2)', border: '1px solid var(--border)', color: 'var(--accent-bright)' },
  bidder: { fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  leadingBadge: { fontSize: 10, background: 'rgba(16,185,129,0.15)', color: 'var(--success)', borderRadius: 4, padding: '1px 6px', marginLeft: 4, fontWeight: 700 },
  bidTime: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  bidAmt: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' },
  bidAmtTop: { color: 'var(--gold-bright)', fontSize: 16 },

  // Right column
  categoryLabel: { fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent-bright)' },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2 },

  // Winner
  winnerBanner: { display: 'flex', alignItems: 'flex-start', gap: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '20px 24px' },
  winnerIcon: { fontSize: 32, flexShrink: 0 },
  winnerTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--gold-bright)', marginBottom: 4 },
  winnerName: { fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 },
  winnerPrice: { fontSize: 13, color: 'var(--text-secondary)' },
  endedBanner: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 20px', fontSize: 14, color: 'var(--text-secondary)' },

  // Countdown
  countdownBox: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 18, padding: '20px 24px' },
  countdownUrgent: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' },
  countdownLabel: { fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 },
  countdownRow: { display: 'flex', alignItems: 'center', gap: 8 },
  timeUnit: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52 },
  timeValue: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 },
  timeLabel: { fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 },
  timeSep: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--text-muted)', paddingBottom: 14 },

  // Price
  priceBox: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: '20px 24px' },
  priceLabel: { fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 },
  currentPrice: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 36, color: 'var(--gold-bright)', letterSpacing: '-1px' },
  priceRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 },
  bidsCount: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' },
  startingNote: { fontSize: 12, color: 'var(--text-muted)' },
  reserveMet: { fontSize: 11, color: 'var(--success)', fontFamily: "'Syne', sans-serif", fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 4, alignSelf: 'flex-end' },

  // Bid form
  bidFormBox: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  bidFormLabel: { fontFamily: "'Syne', sans-serif", fontSize: 13, color: 'var(--text-secondary)' },
  bidError: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 },
  bidSuccess: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 8 },
  bidForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  bidInputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  bidCurrency: { position: 'absolute', left: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--gold-bright)', pointerEvents: 'none' },
  bidInput: { width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px 14px 36px', color: 'var(--text-primary)', fontSize: 18, fontFamily: "'Syne', sans-serif", fontWeight: 700 },
  bidNote: { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' },

  // CTA
  ctaBox: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 },
  ctaMsg: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 },
  ctaButtons: { display: 'flex', gap: 10 },
  ctaBtn: { flex: 1, textAlign: 'center' },

  // Description
  descSection: { display: 'flex', flexDirection: 'column', gap: 12 },
  descHeading: { fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 },
  desc: { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 },

  // Meta
  metaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-elevated)', borderRadius: 12, padding: 16 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 3 },
  metaLabel: { fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  metaVal: { fontSize: 13, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", fontWeight: 600 },

  // Live room entry
  liveRoomBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))',
    border: '1px solid var(--accent)',
    borderRadius: 14, padding: '14px 20px',
    textDecoration: 'none', marginBottom: 24,
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15,
    color: 'var(--text-primary)', transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(124,58,237,0.2)',
  },
  liveRoomDot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#10b981', boxShadow: '0 0 8px #10b981',
    flexShrink: 0, animation: 'pulse 1.5s infinite',
  },
  liveRoomHint: {
    marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)',
    fontWeight: 400,
  },

  // Auto-bid
  autoBidSection: { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' },
  autoBidToggle: { width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', textAlign: 'left' },
  autoBidToggleTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--accent-bright)', flexShrink: 0 },
  autoBidToggleHint: { fontSize: 12, color: 'var(--text-muted)', flex: 1 },
  autoBidChevron: { fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 },
  autoBidBody: { padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border-subtle)' },
  autoBidDesc: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 },
  autoBidForm: { display: 'flex', flexDirection: 'column', gap: 10 },
  autoBidSuccess: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6ee7b7' },
  autoBidError: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5' },
  autoBidActive: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(124,58,237,0.08)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' },
  autoBidActiveLabel: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--accent-bright)', marginBottom: 2 },
  autoBidActiveAmount: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--gold-bright)' },
  cancelAutoBidBtn: { padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', transition: 'all 0.2s' },
}