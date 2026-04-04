// v6 - Kick OAuth 2.1 + Stripe pagamenti
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const Stripe = require('stripe');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const KICK_CLIENT_ID = process.env.KICK_CLIENT_ID;
const KICK_CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;
const KICK_REDIRECT_URI = process.env.KICK_REDIRECT_URI || 'https://kick-loyalty-app.vercel.app/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kick-loyalty-app.vercel.app';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

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

// Schema Reward
const rewardSchema = new mongoose.Schema({
  name: String,
  description: String,
  points: Number,
  type: String,
  active: Boolean,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

// Crea sessione checkout per piano Pro
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

// Cancella abbonamento
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

app.get('/api/stats', (req, res) => {
  res.json({ totalViewers: 1247, activeMembers: 342, totalPoints: 45678, rewardsRedeemed: 89 });
});

connectDB();
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 API disponibili su http://localhost:${PORT}/api/`);
});

