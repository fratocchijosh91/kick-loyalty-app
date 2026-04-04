import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function App() {
  const [currentPage, setCurrentPage] = useState('login')
  const [user, setUser] = useState(null)
  const [rewards, setRewards] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [kickUsername, setKickUsername] = useState('')
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const [widgetCopied, setWidgetCopied] = useState(false)
  const [viewerUrlCopied, setViewerUrlCopied] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [viewerUsername, setViewerUsername] = useState('')
  const [viewerStreamer, setViewerStreamer] = useState('')
  const [viewerData, setViewerData] = useState(null)
  const [viewerRewards, setViewerRewards] = useState([])
  const [viewerLoading, setViewerLoading] = useState(false)
  const [redeemMessage, setRedeemMessage] = useState('')

  // MODIFICA REWARD
  const [editingReward, setEditingReward] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', points: '', active: true })

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const upgrade = urlParams.get('upgrade')
    const viewerParam = urlParams.get('viewer')
    const streamerParam = urlParams.get('streamer')

    if (viewerParam) {
      setCurrentPage('viewer')
      if (streamerParam) setViewerStreamer(streamerParam)
      return
    }

    if (upgrade === 'success') {
      setUpgradeMessage('🎉 Piano Pro attivato! Benvenuto nel club!')
      window.history.replaceState({}, document.title, '/')
    } else if (upgrade === 'cancelled') {
      setUpgradeMessage('❌ Upgrade annullato.')
      window.history.replaceState({}, document.title, '/')
    }

    if (code) {
      setLoading(true)
      axios.post(`${API_URL}/auth/kick/callback`, { code, state })
        .then(response => {
          setUser(response.data.user)
          setCurrentPage('dashboard')
          loadData()
          window.history.replaceState({}, document.title, '/')
        })
        .catch(error => {
          console.error('OAuth callback error:', error)
          alert('Errore login OAuth: ' + (error.response?.data?.details?.message || error.message))
        })
        .finally(() => setLoading(false))
    }
  }, [])

  const handleLogin = async () => {
    if (!kickUsername.trim()) {
      try {
        setLoading(true)
        const response = await axios.get(`${API_URL}/auth/kick/url`)
        window.location.href = response.data.url
      } catch (error) {
        alert('Errore connessione server')
      } finally {
        setLoading(false)
      }
      return
    }
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username: kickUsername.trim() })
      setUser(response.data.user)
      setCurrentPage('dashboard')
      loadData()
    } catch (error) {
      alert('Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!user?.id) return alert('Devi essere loggato!')
    setUpgradeLoading(true)
    try {
      const response = await axios.post(`${API_URL}/stripe/create-checkout`, { userId: user.id })
      window.location.href = response.data.url
    } catch (error) {
      alert('Errore durante il checkout: ' + error.message)
    } finally {
      setUpgradeLoading(false)
    }
  }

  const loadData = async () => {
    try {
      const [rewardsRes, statsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/rewards`),
        axios.get(`${API_URL}/stats`),
        axios.get(`${API_URL}/analytics`)
      ])
      setRewards(rewardsRes.data)
      setStats(statsRes.data)
      setAnalytics(analyticsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const createReward = async (rewardData) => {
    try {
      const response = await axios.post(`${API_URL}/rewards`, rewardData)
      setRewards([...rewards, response.data])
      alert('✅ Reward creato!')
    } catch (error) {
      alert('❌ Errore nella creazione')
    }
  }

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

  const openEditModal = (reward) => {
    setEditingReward(reward)
    setEditForm({
      name: reward.name || '',
      description: reward.description || '',
      points: reward.points || '',
      active: reward.active !== undefined ? reward.active : true
    })
  }

  const closeEditModal = () => {
    setEditingReward(null)
    setEditForm({ name: '', description: '', points: '', active: true })
  }

  const saveEditReward = async () => {
    if (!editForm.name || !editForm.points) {
      alert('Nome e punti sono obbligatori!')
      return
    }
    const id = editingReward.id || editingReward._id
    try {
      const response = await axios.put(`${API_URL}/rewards/${id}`, {
        ...editForm,
        points: parseInt(editForm.points)
      })
      setRewards(rewards.map(r => (r.id === id || r._id === id) ? response.data : r))
      closeEditModal()
      alert('✅ Reward aggiornato!')
    } catch (error) {
      alert('❌ Errore nell\'aggiornamento')
    }
  }

  const handleLogout = () => {
    setUser(null)
    setCurrentPage('login')
  }

  const handleViewerLogin = async () => {
    if (!viewerUsername.trim() || !viewerStreamer.trim()) {
      alert('Inserisci il tuo username e quello dello streamer!')
      return
    }
    setViewerLoading(true)
    try {
      const [userRes, rewardsRes] = await Promise.all([
        axios.post(`${API_URL}/auth/login`, { username: viewerUsername.trim() }),
        axios.get(`${API_URL}/rewards?streamer=${viewerStreamer.trim()}`)
      ])
      setViewerData(userRes.data.user)
      setViewerRewards(rewardsRes.data)
    } catch (error) {
      alert('Errore durante il login spettatore')
    } finally {
      setViewerLoading(false)
    }
  }

  const handleRedeem = async (reward) => {
    const points = viewerData?.points || 0
    if (points < reward.points) {
      setRedeemMessage(`❌ Punti insufficienti! Hai ${points} pt, servono ${reward.points} pt`)
      setTimeout(() => setRedeemMessage(''), 3000)
      return
    }
    setRedeemMessage('⏳ Riscatto in corso...')
    try {
      await axios.post(`${API_URL}/rewards/${reward.id || reward._id}/redeem`, { viewerUsername: viewerData.username })
      setViewerData(prev => ({ ...prev, points: (prev.points || 0) - reward.points }))
      setRedeemMessage(`🎉 Hai riscattato "${reward.name}"!`)
    } catch (error) {
      setRedeemMessage('❌ Errore nel riscatto')
    }
    setTimeout(() => setRedeemMessage(''), 4000)
  }

  const isPro = user?.plan === 'pro'
  const widgetUrl = user ? `${window.location.origin}/widget?user=${user.username || user.displayName}` : ''
  const viewerPageUrl = user ? `${window.location.origin}?viewer=1&streamer=${user.username || user.displayName}` : ''

  const copyWidgetUrl = () => { navigator.clipboard.writeText(widgetUrl); setWidgetCopied(true); setTimeout(() => setWidgetCopied(false), 2000) }
  const copyViewerUrl = () => { navigator.clipboard.writeText(viewerPageUrl); setViewerUrlCopied(true); setTimeout(() => setViewerUrlCopied(false), 2000) }

  const Navbar = () => (
    <nav className="navbar">
      <div className="navbar-brand"><h1>🎮 Kick Loyalty</h1></div>
      <div className="navbar-menu">
        <button className={currentPage === 'dashboard' ? 'active' : ''} onClick={() => setCurrentPage('dashboard')}>📊 Dashboard</button>
        <button className={currentPage === 'analytics' ? 'active' : ''} onClick={() => setCurrentPage('analytics')}>📈 Analytics</button>
        <button className={currentPage === 'pricing' ? 'active' : ''} onClick={() => setCurrentPage('pricing')}>💎 Pricing</button>
      </div>
      <div className="navbar-user">
        {user?.avatarUrl && <img src={user.avatarUrl} alt={user.displayName} />}
        <span>{user?.displayName || user?.username}</span>
        {isPro && <span style={{ background: '#53FC58', color: '#000', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>PRO</span>}
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  )

  const inputStyle = {
    width: '100%', padding: '12px 16px', marginBottom: '12px',
    borderRadius: '8px', border: '2px solid #333', background: '#1a1a1a',
    color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box'
  }

  const modalInputStyle = {
    width: '100%', padding: '10px 14px', marginBottom: '12px',
    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: '#0a0a0a',
    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div className="app">
      {upgradeMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: upgradeMessage.includes('🎉') ? '#53FC58' : '#ff4444', color: upgradeMessage.includes('🎉') ? '#000' : '#fff', padding: '14px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }}>
          {upgradeMessage}
          <button onClick={() => setUpgradeMessage('')} style={{ marginLeft: '16px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* MODAL MODIFICA REWARD */}
      {editingReward && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid rgba(83,252,88,0.3)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>✏️ Modifica Reward</h2>
              <button onClick={closeEditModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome Reward</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Es. Shoutout in live"
              style={modalInputStyle}
            />

            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrizione</label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Es. Ti menziono durante lo stream"
              style={modalInputStyle}
            />

            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Punti Richiesti</label>
            <input
              type="number"
              value={editForm.points}
              onChange={(e) => setEditForm({ ...editForm, points: e.target.value })}
              placeholder="Es. 500"
              style={modalInputStyle}
            />

            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Stato</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button
                onClick={() => setEditForm({ ...editForm, active: true })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: editForm.active ? '2px solid #53FC58' : '1px solid rgba(255,255,255,0.1)', background: editForm.active ? 'rgba(83,252,88,0.1)' : 'transparent', color: editForm.active ? '#53FC58' : 'rgba(255,255,255,0.5)', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
              >
                ✅ Attivo
              </button>
              <button
                onClick={() => setEditForm({ ...editForm, active: false })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: !editForm.active ? '2px solid #ff9800' : '1px solid rgba(255,255,255,0.1)', background: !editForm.active ? 'rgba(255,152,0,0.1)' : 'transparent', color: !editForm.active ? '#ff9800' : 'rgba(255,255,255,0.5)', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
              >
                ⏸️ Disattivo
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={closeEditModal}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
              >
                Annulla
              </button>
              <button
                onClick={saveEditReward}
                style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#53FC58', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
              >
                💾 Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN */}
      {currentPage === 'login' && (
        <div className="login-page">
          <div className="login-container">
            <div className="login-header">
              <h1>🎮 Kick Loyalty</h1>
              <p>Sistema di Rewards per il Tuo Stream</p>
            </div>
            <div className="login-box">
              <h2>Accedi alla Dashboard</h2>
              <p className="login-description">Gestisci rewards, punti e fidelizza la tua community</p>
 <button className="btn-kick-login" onClick={handleLogin} disabled={loading}>
  {loading ? '⏳ Caricamento...' : '🟢 Login con Kick'}
</button>
<div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>oppure accedi manualmente</span>
  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
</div>
<input type="text" placeholder="Inserisci username Kick..." value={kickUsername} onChange={(e) => setKickUsername(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} style={{ ...inputStyle, background: '#111', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }} />
{kickUsername && (
  <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontSize: '14px', marginBottom: '12px' }}>
    🚀 Entra con username
  </button>
)}
<div style={{ marginTop: '8px', textAlign: 'center' }}>
  <button onClick={() => setCurrentPage('viewer')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' }}>
    👀 Sei uno spettatore? Clicca qui
  </button>
</div>
              <div className="login-features">
                <div className="feature"><span className="feature-icon">⭐</span><span>Rewards Personalizzati</span></div>
                <div className="feature"><span className="feature-icon">📊</span><span>Analytics in Real-time</span></div>
                <div className="feature"><span className="feature-icon">🎁</span><span>Sistema Punti Automatico</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEWER PAGE */}
      {currentPage === 'viewer' && (
        <div className="login-page">
          <div className="login-container">
            <div className="login-header">
              <h1>🎮 Kick Loyalty</h1>
              <p>Pagina Spettatori</p>
            </div>
            {!viewerData ? (
              <div className="login-box">
                <h2>👀 Accedi come Spettatore</h2>
                <p className="login-description">Visualizza i tuoi punti e riscatta i rewards</p>
                <input type="text" placeholder="Il tuo username Kick" value={viewerUsername} onChange={(e) => setViewerUsername(e.target.value)} style={inputStyle} />
                <input type="text" placeholder="Username dello streamer" value={viewerStreamer} onChange={(e) => setViewerStreamer(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleViewerLogin()} style={inputStyle} />
                <button className="btn-kick-login" onClick={handleViewerLogin} disabled={viewerLoading}>
                  {viewerLoading ? '⏳ Caricamento...' : '🚀 Entra'}
                </button>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button onClick={() => setCurrentPage('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}>
                    ← Sei uno streamer? Vai al login
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '600px' }}>
                <div style={{ background: '#111', border: '1px solid rgba(83,252,88,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#53FC58' }}>⭐ {viewerData.points || 0} punti</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Ciao {viewerData.displayName || viewerData.username}! 👋</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>Stream di: {viewerStreamer}</div>
                </div>
                {redeemMessage && (
                  <div style={{ background: redeemMessage.includes('🎉') ? 'rgba(83,252,88,0.15)' : 'rgba(255,68,68,0.15)', border: `1px solid ${redeemMessage.includes('🎉') ? '#53FC58' : '#ff4444'}`, borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: 600, color: redeemMessage.includes('🎉') ? '#53FC58' : '#ff4444' }}>
                    {redeemMessage}
                  </div>
                )}
                <h3 style={{ color: '#fff', marginBottom: '16px' }}>🎁 Rewards Disponibili</h3>
                {viewerRewards.filter(r => r.active).length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px' }}>Nessun reward disponibile per questo streamer</div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {viewerRewards.filter(r => r.active).map(reward => (
                      <div key={reward.id || reward._id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{reward.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{reward.description}</div>
                        </div>
                        <button onClick={() => handleRedeem(reward)} style={{ background: (viewerData.points || 0) >= reward.points ? '#53FC58' : 'rgba(255,255,255,0.1)', color: (viewerData.points || 0) >= reward.points ? '#000' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '100px' }}>
                          {reward.points} pt
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => { setViewerData(null); setViewerRewards([]) }} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}>← Logout</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {currentPage === 'dashboard' && user && (
        <div className="dashboard">
          <Navbar />
          {!isPro && (
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '1px solid rgba(83,252,88,0.3)', borderRadius: '12px', margin: '20px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: '#53FC58', fontSize: '16px' }}>🚀 Passa a KickLoyalty Pro</strong>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '4px' }}>Rewards illimitati, analytics avanzate, priority support — €19/mese</p>
              </div>
              <button onClick={handleUpgrade} disabled={upgradeLoading} style={{ background: '#53FC58', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {upgradeLoading ? '⏳...' : '💎 Upgrade a Pro'}
              </button>
            </div>
          )}

          {stats && (
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-info"><h3>{stats.totalViewers.toLocaleString()}</h3><p>Total Viewers</p></div></div>
              <div className="stat-card"><div className="stat-icon">⭐</div><div className="stat-info"><h3>{stats.activeMembers.toLocaleString()}</h3><p>Active Members</p></div></div>
              <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-info"><h3>{stats.totalPoints.toLocaleString()}</h3><p>Total Points</p></div></div>
              <div className="stat-card"><div className="stat-icon">🎁</div><div className="stat-info"><h3>{stats.rewardsRedeemed}</h3><p>Rewards Redeemed</p></div></div>
            </div>
          )}

          {/* WIDGET OBS */}
          <div style={{ margin: '20px', background: 'linear-gradient(135deg, #0e0e0e, #1a1a1a)', border: '1px solid rgba(83,252,88,0.3)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>🎮</span>
              <h2 style={{ color: '#53FC58', margin: 0, fontSize: '18px' }}>Widget OBS</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '16px' }}>Aggiungi come <strong style={{ color: '#fff' }}>Browser Source</strong> in OBS per mostrare le notifiche rewards in live.</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="text" readOnly value={widgetUrl} style={{ flex: 1, minWidth: '200px', padding: '10px 14px', background: '#0a0a0a', border: '1px solid rgba(83,252,88,0.2)', borderRadius: '8px', color: '#53FC58', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }} />
              <button onClick={copyWidgetUrl} style={{ background: widgetCopied ? '#2a2a2a' : '#53FC58', color: widgetCopied ? '#53FC58' : '#000', border: widgetCopied ? '1px solid #53FC58' : 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {widgetCopied ? '✅ Copiato!' : '📋 Copia URL'}
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '10px' }}>💡 In OBS: Fonti → + → Browser → incolla l'URL → dimensioni consigliate 400x300px</p>
          </div>

          {/* LINK SPETTATORI */}
          <div style={{ margin: '0 20px 20px', background: 'linear-gradient(135deg, #0e0e0e, #1a1a1a)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>👀</span>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>Link Spettatori</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '16px' }}>Condividi questo link in chat — i tuoi spettatori vedono i loro punti e riscattano i rewards.</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="text" readOnly value={viewerPageUrl} style={{ flex: 1, minWidth: '200px', padding: '10px 14px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }} />
              <button onClick={copyViewerUrl} style={{ background: viewerUrlCopied ? '#2a2a2a' : '#fff', color: viewerUrlCopied ? '#fff' : '#000', border: viewerUrlCopied ? '1px solid #fff' : 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {viewerUrlCopied ? '✅ Copiato!' : '📋 Copia Link'}
              </button>
            </div>
          </div>

          {/* GESTIONE REWARDS */}
          <div className="rewards-section">
            <div className="section-header">
              <h2>🎁 Gestione Rewards</h2>
              <button className="btn-primary" onClick={() => {
                const name = prompt('Nome reward:')
                const description = prompt('Descrizione:')
                const points = prompt('Punti richiesti:')
                if (name && description && points) createReward({ name, description, points: parseInt(points), type: 'custom', active: true })
              }}>+ Nuovo Reward</button>
            </div>
            <div className="rewards-grid">
              {rewards.map(reward => (
                <div key={reward.id || reward._id} className="reward-card">
                  <div className="reward-header">
                    <h3>{reward.name}</h3>
                    <span className={`badge ${reward.active ? 'badge-active' : 'badge-inactive'}`}>{reward.active ? '✅ Attivo' : '⏸️ Disattivo'}</span>
                  </div>
                  <p className="reward-description">{reward.description}</p>
                  <div className="reward-footer">
                    <div className="reward-points"><span className="points-value">{reward.points}</span><span className="points-label">punti</span></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(reward)}
                        style={{ background: 'rgba(83,252,88,0.1)', color: '#53FC58', border: '1px solid rgba(83,252,88,0.3)', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                      >
                        ✏️ Modifica
                      </button>
                      <button className="btn-delete" onClick={() => deleteReward(reward.id || reward._id)}>🗑️ Elimina</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {currentPage === 'analytics' && user && (
        <div className="dashboard">
          <Navbar />
          <div className="analytics-page">
            <h2>📈 Analytics Dashboard</h2>
            <p>Statistiche e metriche reali del tuo sistema loyalty</p>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>📊 Nuovi Utenti per Mese</h3>
                <div className="chart-placeholder">
                  {analytics?.pointsByMonth?.length > 0 ? analytics.pointsByMonth.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{m.month}</span>
                      <span style={{ color: '#53FC58', fontWeight: 700 }}>{m.points} pt</span>
                    </div>
                  )) : <p style={{ color: 'rgba(255,255,255,0.4)' }}>Nessun dato disponibile</p>}
                </div>
              </div>
              <div className="analytics-card">
                <h3>🏆 Top Rewards</h3>
                <div className="top-rewards">
                  {analytics?.topRewards?.length > 0 ? analytics.topRewards.map((r, i) => (
                    <div key={i} className="reward-stat"><span>{r.name}</span><strong style={{ color: '#53FC58' }}>{r.count} volte</strong></div>
                  )) : rewards.length > 0 ? rewards.slice(0, 5).map((r, i) => (
                    <div key={i} className="reward-stat"><span>{r.name}</span><strong style={{ color: '#53FC58' }}>{r.points} pt</strong></div>
                  )) : <p style={{ color: 'rgba(255,255,255,0.4)' }}>Nessun reward ancora</p>}
                </div>
              </div>
              <div className="analytics-card">
                <h3>👥 Utenti Totali</h3>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '48px', fontWeight: 700, color: '#53FC58' }}>{stats?.totalViewers || 0}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>streamer registrati</div>
                </div>
              </div>
              <div className="analytics-card">
                <h3>🎁 Rewards Attivi</h3>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '48px', fontWeight: 700, color: '#53FC58' }}>{rewards.filter(r => r.active).length}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>rewards configurati</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRICING */}
      {currentPage === 'pricing' && user && (
        <div className="dashboard">
          <Navbar />
          <div className="pricing-page">
            <h2>💎 Scegli il Tuo Piano</h2>
            <p>Trova il piano perfetto per la tua community</p>
            <div className="pricing-grid">
              <div className="pricing-card">
                <h3>🌱 Starter</h3>
                <div className="price"><span className="price-value">GRATIS</span></div>
                <ul className="features-list">
                  <li>✅ Fino a 100 viewers</li>
                  <li>✅ 5 rewards personalizzati</li>
                  <li>✅ Analytics base</li>
                  <li>✅ Support email</li>
                </ul>
                <button className="btn-plan" disabled={!isPro}>{!isPro ? '✅ Piano Attuale' : 'Downgrade'}</button>
              </div>
              <div className="pricing-card pricing-card-featured">
                <div className="badge-popular">🔥 PIÙ POPOLARE</div>
                <h3>🚀 Pro</h3>
                <div className="price"><span className="price-value">€19</span><span className="price-period">/mese</span></div>
                <ul className="features-list">
                  <li>✅ Viewers illimitati</li>
                  <li>✅ Rewards illimitati</li>
                  <li>✅ Analytics avanzate</li>
                  <li>✅ Integrazioni custom</li>
                  <li>✅ Priority support</li>
                </ul>
                <button className="btn-plan btn-plan-featured" onClick={!isPro ? handleUpgrade : undefined} disabled={upgradeLoading || isPro}>
                  {isPro ? '✅ Piano Attuale' : upgradeLoading ? '⏳...' : '💳 Upgrade a Pro'}
                </button>
              </div>
              <div className="pricing-card">
                <h3>⚡ Enterprise</h3>
                <div className="price"><span className="price-value">Custom</span></div>
                <ul className="features-list">
                  <li>✅ Tutto del piano Pro</li>
                  <li>✅ White-label</li>
                  <li>✅ API dedicate</li>
                  <li>✅ Onboarding personale</li>
                  <li>✅ 24/7 support</li>
                </ul>
                <button className="btn-plan" onClick={() => window.open('mailto:info@kickloyalty.com')}>Contattaci</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
