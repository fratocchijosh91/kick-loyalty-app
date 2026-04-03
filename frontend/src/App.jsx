import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function App() {
  const [currentPage, setCurrentPage] = useState('login')
  const [user, setUser] = useState(null)
  const [rewards, setRewards] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  // Login
  const handleLogin = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: 'DemoStreamer'
      })
      setUser(response.data.user)
      setCurrentPage('dashboard')
      loadData()
    } catch (error) {
      console.error('Login error:', error)
      alert('Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  // Load data
  const loadData = async () => {
    try {
      const [rewardsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/rewards`),
        axios.get(`${API_URL}/stats`)
      ])
      setRewards(rewardsRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  // Create reward
  const createReward = async (rewardData) => {
    try {
      const response = await axios.post(`${API_URL}/rewards`, rewardData)
      setRewards([...rewards, response.data])
      alert('✅ Reward creato!')
    } catch (error) {
      alert('❌ Errore nella creazione')
    }
  }

  // Delete reward
  const deleteReward = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo reward?')) return
    try {
      await axios.delete(`${API_URL}/rewards/${id}`)
      setRewards(rewards.filter(r => r.id !== id && r._id !== id))
      alert('✅ Reward eliminato!')
    } catch (error) {
      alert('❌ Errore nell\'eliminazione')
    }
  }

  // Logout
  const handleLogout = () => {
    setUser(null)
    setCurrentPage('login')
  }

  return (
    <div className="app">
      {/* LOGIN PAGE */}
      {currentPage === 'login' && (
        <div className="login-page">
          <div className="login-container">
            <div className="login-header">
              <h1>🎮 Kick Loyalty</h1>
              <p>Sistema di Rewards per il Tuo Stream</p>
            </div>
            
            <div className="login-box">
              <h2>Accedi alla Dashboard</h2>
              <p className="login-description">
                Gestisci rewards, punti e fidelizza la tua community
              </p>
              
              <button 
                className="btn-kick-login" 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? '⏳ Caricamento...' : '🚀 Login con Kick'}
              </button>
              
              <div className="login-features">
                <div className="feature">
                  <span className="feature-icon">⭐</span>
                  <span>Rewards Personalizzati</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">📊</span>
                  <span>Analytics in Real-time</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">🎁</span>
                  <span>Sistema Punti Automatico</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {currentPage === 'dashboard' && user && (
        <div className="dashboard">
          {/* NAVBAR */}
          <nav className="navbar">
            <div className="navbar-brand">
              <h1>🎮 Kick Loyalty</h1>
            </div>
            <div className="navbar-menu">
              <button 
                className={currentPage === 'dashboard' ? 'active' : ''}
                onClick={() => setCurrentPage('dashboard')}
              >
                📊 Dashboard
              </button>
              <button 
                className={currentPage === 'analytics' ? 'active' : ''}
                onClick={() => setCurrentPage('analytics')}
              >
                📈 Analytics
              </button>
              <button 
                className={currentPage === 'pricing' ? 'active' : ''}
                onClick={() => setCurrentPage('pricing')}
              >
                💎 Pricing
              </button>
            </div>
            <div className="navbar-user">
              <img src={user.avatar} alt={user.username} />
              <span>{user.username}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </nav>

          {/* STATS CARDS */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>{stats.totalViewers.toLocaleString()}</h3>
                  <p>Total Viewers</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-info">
                  <h3>{stats.activeMembers.toLocaleString()}</h3>
                  <p>Active Members</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <h3>{stats.totalPoints.toLocaleString()}</h3>
                  <p>Total Points</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎁</div>
                <div className="stat-info">
                  <h3>{stats.rewardsRedeemed}</h3>
                  <p>Rewards Redeemed</p>
                </div>
              </div>
            </div>
          )}

          {/* REWARDS MANAGER */}
          <div className="rewards-section">
            <div className="section-header">
              <h2>🎁 Gestione Rewards</h2>
              <button 
                className="btn-primary"
                onClick={() => {
                  const name = prompt('Nome reward:')
                  const description = prompt('Descrizione:')
                  const points = prompt('Punti richiesti:')
                  if (name && description && points) {
                    createReward({ name, description, points: parseInt(points), type: 'custom' })
                  }
                }}
              >
                + Nuovo Reward
              </button>
            </div>

            <div className="rewards-grid">
              {rewards.map(reward => (
                <div key={reward.id || reward._id} className="reward-card">
                  <div className="reward-header">
                    <h3>{reward.name}</h3>
                    <span className={`badge ${reward.active ? 'badge-active' : 'badge-inactive'}`}>
                      {reward.active ? '✅ Attivo' : '⏸️ Disattivo'}
                    </span>
                  </div>
                  <p className="reward-description">{reward.description}</p>
                  <div className="reward-footer">
                    <div className="reward-points">
                      <span className="points-value">{reward.points}</span>
                      <span className="points-label">punti</span>
                    </div>
                    <button 
                      className="btn-delete"
                      onClick={() => deleteReward(reward.id || reward._id)}
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS PAGE */}
      {currentPage === 'analytics' && user && (
        <div className="dashboard">
          <nav className="navbar">
            <div className="navbar-brand">
              <h1>🎮 Kick Loyalty</h1>
            </div>
            <div className="navbar-menu">
              <button onClick={() => setCurrentPage('dashboard')}>📊 Dashboard</button>
              <button className="active">📈 Analytics</button>
              <button onClick={() => setCurrentPage('pricing')}>💎 Pricing</button>
            </div>
            <div className="navbar-user">
              <img src={user.avatar} alt={user.username} />
              <span>{user.username}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </nav>

          <div className="analytics-page">
            <h2>📈 Analytics Dashboard</h2>
            <p>Statistiche e metriche del tuo sistema loyalty</p>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>📊 Distribuzione Punti</h3>
                <div className="chart-placeholder">
                  <p>Gen: 3,400 punti</p>
                  <p>Feb: 4,200 punti</p>
                  <p>Mar: 5,100 punti</p>
                  <p>Apr: 6,800 punti</p>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>🏆 Top Rewards</h3>
                <div className="top-rewards">
                  <div className="reward-stat">
                    <span>Welcome Bonus</span>
                    <strong>245 volte</strong>
                  </div>
                  <div className="reward-stat">
                    <span>Shoutout</span>
                    <strong>156 volte</strong>
                  </div>
                  <div className="reward-stat">
                    <span>Custom Emote</span>
                    <strong>89 volte</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRICING PAGE */}
      {currentPage === 'pricing' && user && (
        <div className="dashboard">
          <nav className="navbar">
            <div className="navbar-brand">
              <h1>🎮 Kick Loyalty</h1>
            </div>
            <div className="navbar-menu">
              <button onClick={() => setCurrentPage('dashboard')}>📊 Dashboard</button>
              <button onClick={() => setCurrentPage('analytics')}>📈 Analytics</button>
              <button className="active">💎 Pricing</button>
            </div>
            <div className="navbar-user">
              <img src={user.avatar} alt={user.username} />
              <span>{user.username}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </nav>

          <div className="pricing-page">
            <h2>💎 Scegli il Tuo Piano</h2>
            <p>Trova il piano perfetto per la tua community</p>
            
            <div className="pricing-grid">
              <div className="pricing-card">
                <h3>🌱 Starter</h3>
                <div className="price">
                  <span className="price-value">GRATIS</span>
                </div>
                <ul className="features-list">
                  <li>✅ Fino a 100 viewers</li>
                  <li>✅ 5 rewards personalizzati</li>
                  <li>✅ Analytics base</li>
                  <li>✅ Support email</li>
                </ul>
                <button className="btn-plan">Piano Attuale</button>
              </div>

              <div className="pricing-card pricing-card-featured">
                <div className="badge-popular">🔥 PIÙ POPOLARE</div>
                <h3>🚀 Pro</h3>
                <div className="price">
                  <span className="price-value">€19</span>
                  <span className="price-period">/mese</span>
                </div>
                <ul className="features-list">
                  <li>✅ Viewers illimitati</li>
                  <li>✅ Rewards illimitati</li>
                  <li>✅ Analytics avanzate</li>
                  <li>✅ Integrazioni custom</li>
                  <li>✅ Priority support</li>
                </ul>
                <button className="btn-plan btn-plan-featured">Upgrade a Pro</button>
              </div>

              <div className="pricing-card">
                <h3>⚡ Enterprise</h3>
                <div className="price">
                  <span className="price-value">Custom</span>
                </div>
                <ul className="features-list">
                  <li>✅ Tutto del piano Pro</li>
                  <li>✅ White-label</li>
                  <li>✅ API dedicate</li>
                  <li>✅ Onboarding personale</li>
                  <li>✅ 24/7 support</li>
                </ul>
                <button className="btn-plan">Contattaci</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
