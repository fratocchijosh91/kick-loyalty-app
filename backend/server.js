const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());

// MongoDB Connection (opzionale per ora)
const connectDB = async () => {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'your_mongodb_connection_string') {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connesso');
    } catch (error) {
      console.log('⚠️  MongoDB non connesso (opzionale):', error.message);
    }
  } else {
    console.log('ℹ️  MongoDB non configurato - usando mock data');
  }
};

// Schema Reward (opzionale)
const rewardSchema = new mongoose.Schema({
  name: String,
  description: String,
  points: Number,
  type: String,
  active: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const Reward = mongoose.models.Reward || mongoose.model('Reward', rewardSchema);

// Mock data per testing
let mockRewards = [
  { id: '1', name: 'Welcome Bonus', description: '100 punti di benvenuto', points: 100, type: 'bonus', active: true },
  { id: '2', name: 'Viewer Shoutout', description: 'Menzione durante lo stream', points: 500, type: 'shoutout', active: true },
  { id: '3', name: 'Custom Emote', description: 'Emote personalizzata', points: 1000, type: 'emote', active: true }
];

let mockStats = {
  totalViewers: 1247,
  activeMembers: 342,
  totalPoints: 45678,
  rewardsRedeemed: 89
};

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// Auth - Login Mock
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  
  res.json({
    success: true,
    user: {
      id: '123',
      username: username || 'DemoStreamer',
      email: 'demo@kick.com',
      avatar: 'https://ui-avatars.com/api/?name=Demo+Streamer&background=00FF00&color=000'
    },
    token: 'mock_token_' + Date.now()
  });
});

// Kick OAuth callback (mock)
app.get('/api/auth/kick/callback', (req, res) => {
  res.redirect(process.env.FRONTEND_URL + '/?login=success');
});

// Get all rewards
app.get('/api/rewards', async (req, res) => {
  try {
    // Prova a usare MongoDB se connesso
    if (mongoose.connection.readyState === 1) {
      const rewards = await Reward.find();
      if (rewards.length > 0) {
        return res.json(rewards);
      }
    }
    // Altrimenti usa mock data
    res.json(mockRewards);
  } catch (error) {
    res.json(mockRewards);
  }
});

// Create reward
app.post('/api/rewards', async (req, res) => {
  try {
    const { name, description, points, type } = req.body;
    
    if (mongoose.connection.readyState === 1) {
      const reward = new Reward({ name, description, points, type, active: true });
      await reward.save();
      return res.json(reward);
    }
    
    // Mock
    const newReward = {
      id: String(mockRewards.length + 1),
      name,
      description,
      points,
      type,
      active: true
    };
    mockRewards.push(newReward);
    res.json(newReward);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update reward
app.put('/api/rewards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (mongoose.connection.readyState === 1) {
      const reward = await Reward.findByIdAndUpdate(id, updates, { new: true });
      return res.json(reward);
    }
    
    // Mock
    const index = mockRewards.findIndex(r => r.id === id);
    if (index !== -1) {
      mockRewards[index] = { ...mockRewards[index], ...updates };
      res.json(mockRewards[index]);
    } else {
      res.status(404).json({ error: 'Reward non trovato' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete reward
app.delete('/api/rewards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (mongoose.connection.readyState === 1) {
      await Reward.findByIdAndDelete(id);
      return res.json({ success: true });
    }
    
    // Mock
    mockRewards = mockRewards.filter(r => r.id !== id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stats
app.get('/api/stats', (req, res) => {
  res.json(mockStats);
});

// Get analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    pointsDistribution: [
      { month: 'Gen', points: 3400 },
      { month: 'Feb', points: 4200 },
      { month: 'Mar', points: 5100 },
      { month: 'Apr', points: 6800 }
    ],
    topRewards: [
      { name: 'Welcome Bonus', redeemed: 245 },
      { name: 'Shoutout', redeemed: 156 },
      { name: 'Custom Emote', redeemed: 89 }
    ]
  });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API disponibili su http://localhost:${PORT}/api/`);
  });
});
