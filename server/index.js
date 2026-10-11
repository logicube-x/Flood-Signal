import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { Report } from './models/Report.js';
import { User } from './models/User.js';
import { calculatePriority } from './lib/scoring.js';
import { getStorageDriver } from './lib/storage.js';
import { validateImageBuffer, MAX_PHOTO_COUNT } from './lib/fileValidation.js';
import { findPotentialDuplicates } from './lib/duplicateDetection.js';
import { fetchEnvironmentalTelemetry, validateCoordinates } from './lib/telemetry.js';
import authRoutes, { requireAuth, requireResponder, getJwtSecret } from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// FAIL-SAFE: Enforce that mandatory security environment variables are configured
try {
  getJwtSecret();
  getStorageDriver();
} catch (err) {
  console.error('FATAL CONFIGURATION ERROR:', err.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5001;

// SECURITY: Configurable CORS allowlist with credentials
const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173'];

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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

// Body parser: 15MB to comfortably allow up to 3 photos validated in memory
app.use(express.json({ limit: '15mb' }));
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

// STATS - Public (Standardized, synchronized across Overview, Landing, and Response)
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const resolved = await Report.countDocuments({ status: 'Resolved' });
    const pending = await Report.countDocuments({ status: 'Pending Crew' });
    const investigating = await Report.countDocuments({ status: 'Investigating' });
    const active = total - resolved;

    // Severity / Risk distributions for active reports
    const critical = await Report.countDocuments({ 
      status: { $ne: 'Resolved' }, 
      calculatedScore: { $gte: 75 } 
    });
    const high = await Report.countDocuments({ 
      status: { $ne: 'Resolved' }, 
      calculatedScore: { $gte: 50, $lt: 75 } 
    });
    const moderate = await Report.countDocuments({ 
      status: { $ne: 'Resolved' }, 
      calculatedScore: { $gte: 25, $lt: 50 } 
    });
    const low = await Report.countDocuments({ 
      status: { $ne: 'Resolved' }, 
      calculatedScore: { $lt: 25 } 
    });
    const verified = await Report.countDocuments({ verified: true });

    res.json({ 
      total, 
      active, 
      pending, 
      investigating, 
      resolved, 
      critical, 
      high, 
      moderate, 
      low, 
      verified 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// TELEMETRY - Public (Rainfall and Water-Level Environmental Context)
app.get('/api/telemetry/rainfall', async (req, res) => {
  try {
    // Default to Vadodara coordinates if query params are not provided
    const lat = req.query.lat !== undefined ? req.query.lat : 22.3072;
    const lng = req.query.lng !== undefined ? req.query.lng : 73.1812;

    const validation = validateCoordinates(lat, lng);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const telemetry = await fetchEnvironmentalTelemetry(validation.lat, validation.lng);
    res.json(telemetry);
  } catch (error) {
    console.error('Error fetching telemetry:', error.message);
    res.status(500).json({ error: 'Failed to retrieve environmental telemetry' });
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
    if (!['low', 'medium', 'moderate', 'high', 'critical'].includes(severity)) return res.status(400).json({ error: 'Invalid severity' });
    
    // Process Photo Evidence (if supplied)
    const rawPhotos = req.body.photos;
    const processedPhotos = [];
    const storageDriver = getStorageDriver();

    if (Array.isArray(rawPhotos)) {
      if (rawPhotos.length > MAX_PHOTO_COUNT) {
        return res.status(400).json({ error: `Maximum ${MAX_PHOTO_COUNT} photos allowed per report` });
      }

      for (let i = 0; i < rawPhotos.length; i++) {
        const item = rawPhotos[i];
        if (!item || !item.dataBase64) {
          return res.status(400).json({ error: `Photo #${i + 1} payload is invalid` });
        }

        // Parse base64 data
        let cleanBase64 = item.dataBase64;
        if (cleanBase64.includes('base64,')) {
          cleanBase64 = cleanBase64.split('base64,')[1];
        }

        const buffer = Buffer.from(cleanBase64, 'base64');
        const validation = validateImageBuffer(buffer);
        if (!validation.valid) {
          return res.status(400).json({ error: `Photo #${i + 1} validation failed: ${validation.error}` });
        }

        // Save via StorageDriver
        const savedMeta = await storageDriver.save({
          buffer,
          originalName: item.name || `photo_${i + 1}${validation.ext}`,
          mimeType: validation.mimeType
        });

        processedPhotos.push({
          key: savedMeta.key,
          originalName: (item.name || `photo_${i + 1}${validation.ext}`).substring(0, 100),
          mimeType: validation.mimeType,
          size: savedMeta.size,
          uploadedAt: new Date()
        });
      }
    }

    // Server-side Duplicate Correlation
    const recentReports = await Report.find({ status: { $ne: 'Resolved' } }).select('lat lng status verified createdAt title');
    const duplicates = findPotentialDuplicates(recentReports, { lat, lng });
    const duplicateIds = duplicates.map(d => d.id).filter(id => mongoose.Types.ObjectId.isValid(id));

    // Resolve author name for server-generated audit trail
    const authorUser = await User.findById(req.user.userId);
    const authorName = authorUser?.name || 'Citizen';

    // Force system fields securely
    const reportData = {
      title, description, lat, lng, depth, severity, 
      roadBlocked: !!roadBlocked, 
      criticalFacility: !!criticalFacility,
      authorId: req.user.userId,
      verified: false,
      status: 'Pending Crew',
      photos: processedPhotos,
      potentialDuplicateOf: duplicateIds,
      isFlaggedDuplicate: duplicateIds.length > 0,
      statusHistory: [{ 
        status: 'Pending Crew', 
        actionType: 'CREATED',
        note: duplicateIds.length > 0 
          ? `Incident reported by citizen (flagged ${duplicateIds.length} nearby potential duplicate reports for review)`
          : 'Incident reported by citizen', 
        updatedBy: req.user.userId,
        updatedByName: authorName,
        updatedByRole: 'citizen'
      }]
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
    res.status(400).json({ error: error.message || 'Failed to create report' });
  }
});

// CHECK DUPLICATES - Protected via requireAuth
// Scans for active reports near candidate coordinates within configurable time window
app.post('/api/reports/check-duplicates', requireAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid numerical latitude and longitude are required' });
    }

    const activeReports = await Report.find({ status: { $ne: 'Resolved' } })
      .select('title status verified lat lng depth severity createdAt');

    const duplicates = findPotentialDuplicates(activeReports, { lat, lng });
    res.json({ potentialDuplicates: duplicates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check potential duplicates' });
  }
});

// GET PHOTO EVIDENCE - Protected via requireAuth
// Streams the authorized photo file without exposing backend filesystem paths
app.get('/api/reports/:id/photos/:photoKey', requireAuth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const photoMeta = (report.photos || []).find(p => p.key === req.params.photoKey);
    if (!photoMeta) {
      return res.status(404).json({ error: 'Photo not found for this report' });
    }

    const storageDriver = getStorageDriver();
    const readStream = await storageDriver.getReadStream(photoMeta.key);

    res.setHeader('Content-Type', photoMeta.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    readStream.pipe(res);
  } catch (error) {
    res.status(404).json({ error: 'Failed to retrieve photo evidence' });
  }
});

// GET RESPONDERS - Protected via requireAuth + requireResponder
// Lists available municipal responders for task assignment
app.get('/api/responders', requireAuth, requireResponder, async (req, res) => {
  try {
    const responders = await User.find({ role: { $in: ['responder', 'admin'] } })
      .select('name email role')
      .sort({ name: 1 });
    res.json(responders.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve responders' });
  }
});

// UPDATE STATUS/VERIFICATION/ASSIGNMENT/NOTES - Protected via requireAuth + requireResponder
app.patch('/api/reports/:id/status', requireAuth, requireResponder, async (req, res) => {
  try {
    const { status, verified, assignedResponderId, dispatchNote } = req.body;
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const actor = await User.findById(req.user.userId);
    const actorName = actor?.name || 'Municipal Responder';
    const actorRole = actor?.role || 'responder';

    // 1. Status Transition
    if (status !== undefined) {
      if (!['Pending Crew', 'Investigating', 'Resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status transition' });
      }
      const prevStatus = report.status;
      report.status = status;
      report.statusUpdatedBy = req.user.userId;
      report.statusUpdatedByName = actorName;
      report.statusHistory.push({
        status,
        actionType: 'STATUS_CHANGE',
        note: `Status changed from "${prevStatus}" to "${status}"`,
        updatedBy: req.user.userId,
        updatedByName: actorName,
        updatedByRole: actorRole
      });
    }
    
    // 2. Verification
    if (verified !== undefined) {
      const boolVerified = !!verified;
      if (report.verified !== boolVerified) {
        report.verified = boolVerified;
        report.verifiedBy = boolVerified ? req.user.userId : null;
        report.verifiedByName = boolVerified ? actorName : null;
        report.statusHistory.push({
          status: report.status,
          actionType: boolVerified ? 'VERIFIED' : 'UNVERIFIED',
          note: boolVerified ? 'Incident officially verified by municipal responder' : 'Official verification removed',
          updatedBy: req.user.userId,
          updatedByName: actorName,
          updatedByRole: actorRole
        });
      }
    }

    // 3. Responder Assignment
    if (assignedResponderId !== undefined) {
      if (assignedResponderId === null || assignedResponderId === '') {
        // Unassign
        const prevAssignee = report.assignedResponderName || 'crew';
        report.assignedResponderId = null;
        report.assignedResponderName = null;
        report.assignedAt = null;
        report.statusHistory.push({
          status: report.status,
          actionType: 'REASSIGNED',
          note: `Incident unassigned (previously assigned to ${prevAssignee})`,
          updatedBy: req.user.userId,
          updatedByName: actorName,
          updatedByRole: actorRole
        });
      } else {
        // Validate assignee is an existing user with responder/admin role
        if (!mongoose.Types.ObjectId.isValid(assignedResponderId)) {
          return res.status(400).json({ error: 'Invalid responder ID format' });
        }
        const assignee = await User.findById(assignedResponderId);
        if (!assignee || (assignee.role !== 'responder' && assignee.role !== 'admin')) {
          return res.status(400).json({ error: 'Assigned user does not have responder privileges' });
        }

        const isReassignment = !!report.assignedResponderId && report.assignedResponderId.toString() !== assignee._id.toString();
        report.assignedResponderId = assignee._id;
        report.assignedResponderName = assignee.name;
        report.assignedAt = new Date();

        report.statusHistory.push({
          status: report.status,
          actionType: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
          note: isReassignment 
            ? `Reassigned to ${assignee.name} (${assignee.role})`
            : `Assigned to ${assignee.name} (${assignee.role})`,
          updatedBy: req.user.userId,
          updatedByName: actorName,
          updatedByRole: actorRole,
          assignedTo: assignee._id,
          assignedToName: assignee.name
        });
      }
    }

    // 4. Dispatch / Response Note
    if (dispatchNote !== undefined) {
      if (typeof dispatchNote !== 'string' || dispatchNote.trim().length === 0) {
        return res.status(400).json({ error: 'Dispatch note cannot be empty' });
      }
      if (dispatchNote.trim().length > 1000) {
        return res.status(400).json({ error: 'Dispatch note cannot exceed 1000 characters' });
      }

      report.statusHistory.push({
        status: report.status,
        actionType: 'DISPATCH_NOTE',
        note: dispatchNote.trim(),
        updatedBy: req.user.userId,
        updatedByName: actorName,
        updatedByRole: actorRole
      });
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
    res.status(400).json({ error: error.message || 'Failed to update report' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (0.0.0.0)`);
});
