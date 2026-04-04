// v4 - Kick OAuth reale
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const KICK_CLIENT_ID = process.env.KICK_CLIENT_ID;
const KICK_CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;
const KICK_REDIRECT_URI = process.env.KICK_REDIRECT_URI || 'https://kick-loyalty-app.vercel.app/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kick-loyalty-app.vercel.app';

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

// ==================== ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// STEP 1 - Genera URL OAuth Kick
app.get('/api/auth/kick/url', (req, res) => {
  const scopes = ['user:read', 'channel:read'].join(' ');
  const authUrl = `https://kick.com/oauth2/authorize?` +
    `client_id=${KICK_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(KICK_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}`;
  res.json({ url: authUrl });
});

// STEP 2 - Callback OAuth
app.post('/api/auth/kick/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code mancante' });

  try {
    const tokenResponse = await axios.post('https://kick.com/oauth2/token', {
      grant_type: 'authorization_code',
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
      redirect_uri: KICK_REDIRECT_URI,
      code: code
    }, { headers: { 'Content-Type': 'application/json' } });

    const { access_token, refresh_token } = tokenResponse.data;

    const userResponse = await axios.get('https://kick.com/api/v1/user', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const kickUser = userResponse.data;

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOneAndUpdate(
        { kickUsername: kickUser.username.toLowerCase() },
        {
          kickUsername: kickUser.username.toLowerCase(),
          kickDisplayName: kickUser.username,
          kickAvatarUrl: kickUser.profile_pic || null,
          kickChannelId: kickUser.id?.toString() || null,
          kickAccessToken: access_token,
          kickRefreshToken: refresh_token,
          lastLogin: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      user = { _id: 'mock_' + kickUser.username, kickUsername: kickUser.username.toLowerCase(), kickDisplayName: kickUser.username };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.kickUsername,
        displayName: user.kickDisplayName,
        avatarUrl: user.kickAvatarUrl,
        channelId: user.kickChannelId
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
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
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
      user = { _id: 'mock_' + username, kickUsername: username.toLowerCase(), kickDisplayName: username };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.kickUsername,
        displayName: user.kickDisplayName || username,
        avatarUrl: user.kickAvatarUrl
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il login' });
  }
});

// Rewards - GET
app.get('/api/rewards', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const rewards = await Reward.find(req.query.userId ? { userId: req.query.userId } : {}).sort({ createdAt: -1 });
      res.json(rewards);
    } else {
      res.json(mockRewards);
    }
  } catch (error) { res.json(mockRewards); }
});

// Rewards - POST
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

// Rewards - DELETE
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

// Stats
app.get('/api/stats', (req, res) => {
  res.json({ totalViewers: 1247, activeMembers: 342, totalPoints: 45678, rewardsRedeemed: 89 });
});

connectDB();
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 API disponibili su http://localhost:${PORT}/api/`);
});
