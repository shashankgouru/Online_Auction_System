import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={st.nav}>
      <div style={st.inner}>

        {/* Logo */}
        <Link to="/" style={st.logo}>
          <span style={st.logoIcon}>⬡</span>
          <span style={st.logoText}>AuctionX</span>
        </Link>

        {/* Nav links */}
        <div style={st.links}>
          <Link to="/" style={{ ...st.link, ...(isActive('/') ? st.linkActive : {}) }}>
            Browse
          </Link>
          {user && !isAdmin && (
            <>
              <Link to="/my-auctions" style={{ ...st.link, ...(isActive('/my-auctions') ? st.linkActive : {}) }}>
                My Auctions
              </Link>
              <Link to="/my-bids" style={{ ...st.link, ...(isActive('/my-bids') ? st.linkActive : {}) }}>
                My Bids
              </Link>
              <Link to="/watchlist" style={{ ...st.link, ...(isActive('/watchlist') ? st.linkActive : {}) }}>
                Watchlist
              </Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin" style={{ ...st.link, ...(isActive('/admin') ? st.linkActive : {}), ...st.adminLink }}>
              ⚙ Admin
            </Link>
          )}
        </div>

        {/* Auth area */}
        <div style={st.authArea}>
          {user ? (
            <div style={st.userMenu}>
              {/* Avatar — links to profile, shows image if set */}
              <Link to="/profile" style={st.avatarLink} title="My Profile">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.username}
                    style={{ ...st.avatar, objectFit: 'cover' }}
                    onError={e => {
                      // If image fails to load, replace with initial letter
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div style={{
                  ...st.avatar,
                  ...(isAdmin ? st.avatarAdmin : {}),
                  display: user.profileImage ? 'none' : 'flex',
                }}>
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <div style={st.userMeta}>
                  <span style={st.userName}>{user.username}</span>
                  {isAdmin && <span style={st.roleTag}>Admin</span>}
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="btn-ghost"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div style={st.authButtons}>
              <Link to="/login" className="btn-ghost" style={{ padding: '8px 18px', fontSize: '13px' }}>
                Sign in
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                Get started
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  )
}

const st = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    borderBottom: '1px solid rgba(124,58,237,0.15)',
    background: 'rgba(8,8,15,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  inner: {
    maxWidth: '1280px', margin: '0 auto', padding: '0 24px',
    height: '64px', display: 'flex', alignItems: 'center', gap: '32px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 },
  logoIcon: { fontSize: '22px', color: '#7c3aed', lineHeight: 1 },
  logoText: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#f1f0ff', letterSpacing: '-0.3px' },
  links: { display: 'flex', gap: '4px', flex: 1 },
  link: {
    fontFamily: "'Syne', sans-serif", fontWeight: 500, fontSize: '14px',
    color: '#9490b8', padding: '6px 14px', borderRadius: '8px',
    transition: 'all 0.2s', textDecoration: 'none',
  },
  linkActive: { color: '#f1f0ff', background: 'rgba(124,58,237,0.12)' },
  adminLink: { color: '#8b5cf6', fontWeight: 700 },
  authArea: { flexShrink: 0 },
  authButtons: { display: 'flex', alignItems: 'center', gap: '10px' },
  userMenu: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatarLink: {
    display: 'flex', alignItems: 'center', gap: '10px',
    textDecoration: 'none', cursor: 'pointer',
  },
  avatar: {
    width: '34px', height: '34px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px',
    color: '#fff', flexShrink: 0,
    border: '2px solid rgba(124,58,237,0.3)',
  },
  avatarAdmin: { background: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  userMeta: { display: 'flex', flexDirection: 'column', gap: '1px' },
  userName: { fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px', color: '#f1f0ff', lineHeight: 1.2 },
  roleTag: {
    fontFamily: "'Syne', sans-serif", fontSize: '10px', fontWeight: 700,
    color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2,
  },
}