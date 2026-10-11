import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { Report } from './models/Report.js';
import { calculatePriority } from './lib/scoring.js';
import authRoutes, { requireAuth, requireResponder, getJwtSecret } from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// FAIL-SAFE: Enforce that mandatory security environment variables are configured
try {
  getJwtSecret();
} catch (err) {
  console.error('FATAL CONFIGURATION ERROR:', err.message);
  console.error('Please configure a valid JWT_SECRET in server/.env before starting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5001;

// SECURITY: Configurable CORS allowlist with credentials
const allowedOrigins = process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : ['http://localhost:5173'];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Auth Routes
app.use('/api/auth', authRoutes);

// HEALTH
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({ 
    status: isDbConnected ? 'ok' : 'error',
    databaseConnected: isDbConnected,
    storageMode: 'MongoDB', 
    timestamp: new Date().toISOString() 
  });
});

// STATS - Public
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const resolved = await Report.countDocuments({ status: 'Resolved' });
    const active = total - resolved;
    const highPriority = await Report.countDocuments({ 
      status: { $ne: 'Resolved' }, 
      calculatedScore: { $gte: 50 } 
    });

    res.json({ total, active, highPriority, resolved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET REPORTS - Public (Citizens can view public incident information)
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    const updatedReports = reports.map(doc => {
       const obj = doc.toJSON();
       const p = calculatePriority({
         criticalFacility: doc.criticalFacility,
         roadBlocked: doc.roadBlocked,
         severity: doc.severity,
         depth: doc.depth,
         timestamp: new Date(doc.createdAt).getTime()
       });
       obj._priority = p;
       return obj;
    });
    res.json(updatedReports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET MY REPORTS - Protected via requireAuth (Strictly derived from req.user.userId)
app.get('/api/reports/me', requireAuth, async (req, res) => {
  try {
    const reports = await Report.find({ authorId: req.user.userId }).sort({ createdAt: -1 });
    const updatedReports = reports.map(doc => {
       const obj = doc.toJSON();
       const p = calculatePriority({
         criticalFacility: doc.criticalFacility,
         roadBlocked: doc.roadBlocked,
         severity: doc.severity,
         depth: doc.depth,
         timestamp: new Date(doc.createdAt).getTime()
       });
       obj._priority = p;
       return obj;
    });
    res.json(updatedReports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your reports' });
  }
});

// CREATE REPORT - Protected (Citizens must be authenticated to report)
app.post('/api/reports', requireAuth, async (req, res) => {
  try {
    const { title, description, lat, lng, depth, severity, roadBlocked, criticalFacility } = req.body;
    
    // Strict validation
    if (!title || typeof title !== 'string' || title.length > 200) return res.status(400).json({ error: 'Invalid title' });
    if (!description || typeof description !== 'string' || description.length > 1000) return res.status(400).json({ error: 'Invalid description' });
    if (typeof lat !== 'number' || lat < -90 || lat > 90) return res.status(400).json({ error: 'Invalid latitude' });
    if (typeof lng !== 'number' || lng < -180 || lng > 180) return res.status(400).json({ error: 'Invalid longitude' });
    if (typeof depth !== 'number' || depth < 0 || depth > 500) return res.status(400).json({ error: 'Invalid depth (must be 0-500cm)' });
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) return res.status(400).json({ error: 'Invalid severity' });
    
    // Force system fields securely
    const reportData = {
      title, description, lat, lng, depth, severity, 
      roadBlocked: !!roadBlocked, 
      criticalFacility: !!criticalFacility,
      authorId: req.user.userId,
      verified: false,
      status: 'Pending Crew',
      statusHistory: [{ status: 'Pending Crew', note: 'Incident reported by citizen', updatedBy: req.user.userId }]
    };

    const priority = calculatePriority({
      criticalFacility: reportData.criticalFacility,
      roadBlocked: reportData.roadBlocked,
      severity: reportData.severity,
      depth: reportData.depth,
      timestamp: Date.now()
    });

    reportData.calculatedScore = priority.score;
    reportData.calculatedLabel = priority.label;
    reportData.calculatedExplanation = priority.explanation;
    reportData.isStale = priority.isStale;

    const report = new Report(reportData);
    await report.save();
    
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create report' });
  }
});

// UPDATE STATUS/VERIFICATION - Protected via requireAuth + requireResponder
app.patch('/api/reports/:id/status', requireAuth, requireResponder, async (req, res) => {
  try {
    const { status, verified } = req.body;
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (status !== undefined) {
      if (!['Pending Crew', 'Investigating', 'Resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status transition' });
      }
      report.status = status;
      report.statusUpdatedBy = req.user.userId;
      report.statusHistory.push({ status, note: 'Status updated by municipal responder', updatedBy: req.user.userId });
    }
    
    if (verified !== undefined) {
      report.verified = !!verified;
      report.verifiedBy = req.user.userId;
    }

    await report.save();
    
    const obj = report.toJSON();
    const p = calculatePriority({
       criticalFacility: report.criticalFacility,
       roadBlocked: report.roadBlocked,
       severity: report.severity,
       depth: report.depth,
       timestamp: new Date(report.createdAt).getTime()
    });
    obj._priority = p;
    
    res.json(obj);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update report' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
