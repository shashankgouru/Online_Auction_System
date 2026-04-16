import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AuctionDetailPage from './pages/AuctionDetailPage'
import MyBidsPage from './pages/MyBidsPage'
import MyAuctionsPage from './pages/MyAuctionsPage'
import WatchlistPage from './pages/WatchlistPage'
import AdminPage from './pages/AdminPage'
import CreateAuctionPage from './pages/CreateAuctionPage'
import ProfilePage from './pages/ProfilePage'
import LiveAuctionPage from './pages/LiveAuctionPage'

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/"               element={<HomePage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/register"       element={<RegisterPage />} />
        <Route path="/auctions/:id"   element={<AuctionDetailPage />} />
        <Route path="/live/:id"       element={<LiveAuctionPage />} />
        <Route path="/my-auctions"    element={<ProtectedRoute><MyAuctionsPage /></ProtectedRoute>} />
        <Route path="/my-bids"        element={<ProtectedRoute><MyBidsPage /></ProtectedRoute>} />
        <Route path="/watchlist"      element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
        <Route path="/create-auction" element={<ProtectedRoute><CreateAuctionPage /></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin"          element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Routes>
    </AuthProvider>
  )
}