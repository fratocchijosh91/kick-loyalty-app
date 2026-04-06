// v7 - Socket.io notifiche real-time
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const Stripe = require('stripe');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;

const KICK_CLIENT_ID = process.env.KICK_CLIENT_ID;
const KICK_CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;
const KICK_REDIRECT_URI = process.env.KICK_REDIRECT_URI || 'https://kick-loyalty-app.vercel.app/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kick-loyalty-app.vercel.app';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Socket.io - gestione connessioni
io.on('connection', (socket) => {
  console.log('🔌 Client connesso:', socket.id);

  // Lo streamer si registra nella sua stanza
  socket.on('join-streamer', (streamerUsername) => {
    socket.join(`streamer:${streamerUsername.toLowerCase()}`);
    console.log(`📺 Streamer ${streamerUsername} connesso alla sua stanza`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnesso:', socket.id);
  });
});

// Rendi io disponibile alle route
app.set('io', io);

// Webhook Stripe deve essere PRIMA di express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId && mongoose.connection.readyState === 1) {
      await User.findByIdAndUpdate(userId, {
        plan: 'pro',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription
      });
      console.log('✅ Piano Pro attivato per utente:', userId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    if (mongoose.connection.readyState === 1) {
      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { plan: 'free', stripeSubscriptionId: null }
      );
    }
  }

  res.json({ received: true });
});

// Middleware
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'your_mongodb_connection_string') {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connesso');
    } catch (error) {
      console.log('⚠️ MongoDB non connesso:', error.message);
    }
  }
};

// Schema User
const userSchema = new mongoose.Schema({
  kickUsername: { type: String, required: true, unique: true },
  kickDisplayName: { type: String },
  kickAvatarUrl: { type: String },
  kickChannelId: { type: String },
  kickAccessToken: { type: String },
  kickRefreshToken: { type: String },
  plan: { type: String, default: 'free' },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Schema ViewerPoints - punti degli spettatori per ogni streamer
const viewerPointsSchema = new mongoose.Schema({
  viewerUsername: { type: String, required: true },
  streamerUsername: { type: String, required: true },
  points: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
viewerPointsSchema.index({ viewerUsername: 1, streamerUsername: 1 }, { unique: true });
const ViewerPoints = mongoose.models.ViewerPoints || mongoose.model('ViewerPoints', viewerPointsSchema);

// Schema Reward
const rewardSchema = new mongoose.Schema({
  name: String,
  description: String,
  points: Number,
  type: String,
  active: Boolean,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  redeemedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Reward = mongoose.models.Reward || mongoose.model('Reward', rewardSchema);

let mockRewards = [
  { id: '1', name: 'Welcome Bonus', description: '100 punti di benvenuto', points: 100, type: 'bonus', active: true },
  { id: '2', name: 'Viewer Shoutout', description: 'Menzione durante lo stream', points: 500, type: 'shoutout', active: true },
  { id: '3', name: 'Custom Emote', description: 'Emote personalizzata', points: 1000, type: 'emote', active: true }
];

global.oauthSessions = {};

// ==================== ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// STEP 1 - Genera URL OAuth Kick con PKCE
app.get('/api/auth/kick/url', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  global.oauthSessions[state] = codeVerifier;
  setTimeout(() => { delete global.oauthSessions[state]; }, 10 * 60 * 1000);

  const scopes = ['user:read', 'channel:read'].join(' ');
  const authUrl = `https://id.kick.com/oauth/authorize?` +
    `response_type=code` +
    `&client_id=${KICK_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(KICK_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256` +
    `&state=${state}`;

  res.json({ url: authUrl, state });
});

// STEP 2 - Callback OAuth
app.post('/api/auth/kick/callback', async (req, res) => {
  const { code, state } = req.body;
  if (!code) return res.status(400).json({ error: 'Code mancante' });

  const codeVerifier = global.oauthSessions[state];
  if (!codeVerifier) console.warn('codeVerifier non trovato per state:', state);

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', KICK_CLIENT_ID);
    params.append('client_secret', KICK_CLIENT_SECRET);
    params.append('redirect_uri', KICK_REDIRECT_URI);
    params.append('code', code);
    if (codeVerifier) params.append('code_verifier', codeVerifier);

    const tokenResponse = await axios.post('https://id.kick.com/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token } = tokenResponse.data;
    if (state) delete global.oauthSessions[state];

    const userResponse = await axios.get('https://api.kick.com/public/v1/users', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const userData = userResponse.data?.data?.[0] || userResponse.data?.data || userResponse.data;
    const username = userData?.username || userData?.name || userData?.email || 'user_' + Date.now();
    const displayName = userData?.name || userData?.username || username;
    const avatarUrl = userData?.profile_picture || userData?.avatar || null;
    const channelId = userData?.user_id?.toString() || userData?.id?.toString() || null;

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOneAndUpdate(
        { kickUsername: username.toLowerCase() },
        {
          kickUsername: username.toLowerCase(),
          kickDisplayName: displayName,
          kickAvatarUrl: avatarUrl,
          kickChannelId: channelId,
          kickAccessToken: access_token,
          kickRefreshToken: refresh_token || null,
          lastLogin: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      user = { _id: 'mock_' + username, kickUsername: username.toLowerCase(), kickDisplayName: displayName, plan: 'free' };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.kickUsername,
        displayName: user.kickDisplayName,
        avatarUrl: user.kickAvatarUrl,
        channelId: user.kickChannelId,
        plan: user.plan || 'free'
      }
    });
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Errore OAuth Kick', details: error.response?.data });
  }
});

// Login con username (fallback)
app.post('/api/auth/login', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username richiesto' });

  try {
    let kickData = null;
    try {
      const kickResponse = await axios.get(`https://kick.com/api/v1/channels/${username}`, {
        timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      kickData = kickResponse.data;
    } catch (e) { console.log('Kick API non disponibile'); }

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOneAndUpdate(
        { kickUsername: username.toLowerCase() },
        {
          kickUsername: username.toLowerCase(),
          kickDisplayName: kickData?.user?.username || username,
          kickAvatarUrl: kickData?.user?.profile_pic || null,
          lastLogin: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      user = { _id: 'mock_' + username, kickUsername: username.toLowerCase(), kickDisplayName: username, plan: 'free' };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.kickUsername,
        displayName: user.kickDisplayName || username,
        avatarUrl: user.kickAvatarUrl,
        plan: user.plan || 'free'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il login' });
  }
});

// ==================== STRIPE ====================

app.post('/api/stripe/create-checkout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId richiesto' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${FRONTEND_URL}?upgrade=success`,
      cancel_url: `${FRONTEND_URL}?upgrade=cancelled`,
      metadata: { userId }
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stripe/cancel', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user?.stripeSubscriptionId) return res.status(400).json({ error: 'Nessun abbonamento attivo' });
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REWARDS ====================

app.get('/api/rewards', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const rewards = await Reward.find(req.query.userId ? { userId: req.query.userId } : {}).sort({ createdAt: -1 });
      res.json(rewards);
    } else { res.json(mockRewards); }
  } catch (error) { res.json(mockRewards); }
});

app.post('/api/rewards', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const reward = new Reward(req.body);
      await reward.save();
      res.json(reward);
    } else {
      const newReward = { ...req.body, id: Date.now().toString() };
      mockRewards.push(newReward);
      res.json(newReward);
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/rewards/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(reward);
    } else {
      const idx = mockRewards.findIndex(r => r.id === req.params.id);
      if (idx !== -1) mockRewards[idx] = { ...mockRewards[idx], ...req.body };
      res.json(mockRewards[idx]);
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/rewards/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Reward.findByIdAndDelete(req.params.id);
    } else {
      mockRewards = mockRewards.filter(r => r.id !== req.params.id);
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== REDEEM (con notifica real-time) ====================

app.post('/api/rewards/:id/redeem', async (req, res) => {
  const { viewerUsername, streamerUsername } = req.body;
  const io = req.app.get('io');

  try {
    let reward;
    if (mongoose.connection.readyState === 1) {
      reward = await Reward.findById(req.params.id);
    } else {
      reward = mockRewards.find(r => r.id === req.params.id);
    }

    if (!reward) return res.status(404).json({ error: 'Reward non trovato' });

    // Controlla punti spettatore se richiesti
    if (reward.points > 0 && viewerUsername && streamerUsername && mongoose.connection.readyState === 1) {
      const vp = await ViewerPoints.findOne({
        viewerUsername: viewerUsername.toLowerCase(),
        streamerUsername: streamerUsername.toLowerCase()
      });
      const currentPoints = vp?.points || 0;
      if (currentPoints < reward.points) {
        return res.status(400).json({ error: `Punti insufficienti! Hai ${currentPoints} pt, servono ${reward.points} pt` });
      }
      // Scala i punti
      await ViewerPoints.findOneAndUpdate(
        { viewerUsername: viewerUsername.toLowerCase(), streamerUsername: streamerUsername.toLowerCase() },
        { $inc: { points: -reward.points } }
      );
    }

    // Incrementa contatore riscatti
    if (mongoose.connection.readyState === 1) {
      reward = await Reward.findByIdAndUpdate(req.params.id, { $inc: { redeemedCount: 1 } }, { new: true });
    }

    // Invia notifica real-time allo streamer
    if (io && streamerUsername) {
      const notification = {
        type: 'redeem',
        viewerUsername,
        rewardName: reward.name,
        rewardPoints: reward.points,
        timestamp: new Date()
      };
      io.to(`streamer:${streamerUsername.toLowerCase()}`).emit('reward-redeemed', notification);
      console.log(`🔔 Notifica inviata allo streamer ${streamerUsername}:`, notification);
    }

    res.json({ success: true, reward });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATS & ANALYTICS ====================

app.get('/api/stats', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const [totalUsers, totalRewards, pointsAgg, redeemedAgg] = await Promise.all([
        User.countDocuments(),
        Reward.countDocuments({ active: true }),
        User.aggregate([{ $group: { _id: null, total: { $sum: '$totalPoints' } } }]),
        Reward.aggregate([{ $group: { _id: null, total: { $sum: '$redeemedCount' } } }])
      ]);
      res.json({
        totalViewers: totalUsers,
        activeMembers: totalUsers,
        totalPoints: pointsAgg[0]?.total || 0,
        rewardsRedeemed: redeemedAgg[0]?.total || 0
      });
    } else {
      res.json({ totalViewers: 0, activeMembers: 0, totalPoints: 0, rewardsRedeemed: 0 });
    }
  } catch (error) {
    res.json({ totalViewers: 0, activeMembers: 0, totalPoints: 0, rewardsRedeemed: 0 });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const [topRewards, recentUsers, totalRewards] = await Promise.all([
        Reward.find().sort({ redeemedCount: -1 }).limit(5),
        User.find().sort({ createdAt: -1 }).limit(10),
        Reward.countDocuments()
      ]);

      const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      const now = new Date();
      const pointsByMonth = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const count = await User.countDocuments({ createdAt: { $gte: d, $lt: end } });
        pointsByMonth.push({ month: months[d.getMonth()], points: count * 100 });
      }

      res.json({
        topRewards: topRewards.map(r => ({ name: r.name, count: r.redeemedCount || 0 })),
        pointsByMonth,
        totalRewards,
        recentUsers: recentUsers.length
      });
    } else {
      res.json({ topRewards: [], pointsByMonth: [], totalRewards: 0, recentUsers: 0 });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== KICK WEBHOOK ====================

// Kick manda eventi qui quando qualcuno guarda, segue, si iscrive
app.post('/api/kick/webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    console.log('📥 Kick Webhook ricevuto:', event?.type || 'unknown');

    // Evento: spettatore guarda la live (chat message = è online)
    if (event?.type === 'chat_message' || event?.type === 'stream.chat.message') {
      const viewerUsername = event?.data?.sender?.username || event?.data?.chatter?.username;
      const streamerUsername = event?.data?.broadcaster?.username || event?.data?.channel?.slug;
      
      if (viewerUsername && streamerUsername && mongoose.connection.readyState === 1) {
        // Assegna 1 punto per messaggio in chat (max 10 punti ogni 10 minuti)
        await ViewerPoints.findOneAndUpdate(
          { viewerUsername: viewerUsername.toLowerCase(), streamerUsername: streamerUsername.toLowerCase() },
          { 
            $inc: { points: 1, totalEarned: 1 },
            lastSeen: new Date()
          },
          { upsert: true, new: true }
        );
        console.log(`⭐ +1 punto a ${viewerUsername} per ${streamerUsername}`);
      }
    }

    // Evento: nuovo follower
    if (event?.type === 'channel.follow' || event?.type === 'follow') {
      const viewerUsername = event?.data?.follower?.username;
      const streamerUsername = event?.data?.channel?.slug || event?.data?.broadcaster?.username;
      
      if (viewerUsername && streamerUsername && mongoose.connection.readyState === 1) {
        await ViewerPoints.findOneAndUpdate(
          { viewerUsername: viewerUsername.toLowerCase(), streamerUsername: streamerUsername.toLowerCase() },
          { $inc: { points: 50, totalEarned: 50 }, lastSeen: new Date() },
          { upsert: true, new: true }
        );
        console.log(`🎉 +50 punti a ${viewerUsername} per follow a ${streamerUsername}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Kick webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== VIEWER POINTS ====================

// Ottieni punti di uno spettatore per uno streamer
app.get('/api/viewer-points/:viewerUsername/:streamerUsername', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const vp = await ViewerPoints.findOne({
        viewerUsername: req.params.viewerUsername.toLowerCase(),
        streamerUsername: req.params.streamerUsername.toLowerCase()
      });
      res.json({ points: vp?.points || 0, totalEarned: vp?.totalEarned || 0 });
    } else {
      res.json({ points: 0, totalEarned: 0 });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assegna punti manualmente (streamer lo fa dalla dashboard)
app.post('/api/viewer-points/assign', async (req, res) => {
  const { viewerUsername, streamerUsername, points } = req.body;
  if (!viewerUsername || !streamerUsername || !points) {
    return res.status(400).json({ error: 'Dati mancanti' });
  }
  try {
    if (mongoose.connection.readyState === 1) {
      const vp = await ViewerPoints.findOneAndUpdate(
        { viewerUsername: viewerUsername.toLowerCase(), streamerUsername: streamerUsername.toLowerCase() },
        { $inc: { points: parseInt(points), totalEarned: parseInt(points) }, lastSeen: new Date() },
        { upsert: true, new: true }
      );
      res.json({ success: true, points: vp.points });
    } else {
      res.json({ success: true, points: parseInt(points) });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leaderboard spettatori per uno streamer
app.get('/api/viewer-points/leaderboard/:streamerUsername', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const leaderboard = await ViewerPoints.find({
        streamerUsername: req.params.streamerUsername.toLowerCase()
      }).sort({ points: -1 }).limit(10);
      res.json(leaderboard);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy per Anthropic AI (evita CORS dal browser)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }
    const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!anthropicKey) {
      return res.status(500).json({ error: 'Anthropic API key non configurata sul server' });
    }
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: system || 'Sei l\'assistente AI di KickLoyalty, piattaforma rewards per streamer su Kick. Aiuta gli streamer a crescere, suggerisci idee per rewards, strategie di engagement e come usare al meglio il sistema. Rispondi in italiano, in modo conciso e pratico.',
      messages
    }, {
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('AI proxy error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

connectDB();
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 API disponibili su http://localhost:${PORT}/api/`);
  console.log(`🔌 Socket.io attivo`);
});
