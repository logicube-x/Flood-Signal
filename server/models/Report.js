import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  actionType: { 
    type: String, 
    enum: ['CREATED', 'VERIFIED', 'UNVERIFIED', 'STATUS_CHANGE', 'ASSIGNED', 'REASSIGNED', 'DISPATCH_NOTE'],
    default: 'STATUS_CHANGE'
  },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, maxlength: 1000 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String },
  updatedByRole: { type: String, enum: ['citizen', 'responder', 'admin'] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: { type: String }
});

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  depth: { type: Number, required: true, min: 0, max: 500 }, // cm
  severity: { type: String, required: true, enum: ['low', 'medium', 'moderate', 'high', 'critical'] },
  
  // Ownership and Auditing
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedByName: { type: String },
  statusUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  statusUpdatedByName: { type: String },

  // Responder Assignment
  assignedResponderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedResponderName: { type: String },
  assignedAt: { type: Date },
  
  // Calculated Priority
  calculatedScore: { type: Number, default: 0 },
  calculatedLabel: { type: String, default: 'Low' },
  calculatedExplanation: { type: [String], default: [] },
  isStale: { type: Boolean, default: false },
  
  roadBlocked: { type: Boolean, default: false },
  criticalFacility: { type: Boolean, default: false },

  // Photo Evidence (Stored via StorageDriver, metadata stored in MongoDB)
  photos: [{
    key: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Duplicate Tracking
  potentialDuplicateOf: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }],
  isFlaggedDuplicate: { type: Boolean, default: false },
  
  // System State
  verified: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending Crew', 'Investigating', 'Resolved'], default: 'Pending Crew' },
  
  statusHistory: [statusHistorySchema]
}, { timestamps: true });

// Transform output to match frontend expectations
reportSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    // Map backend priority structure to frontend expectation
    ret._priority = {
      score: ret.calculatedScore,
      label: ret.calculatedLabel,
      explanation: ret.calculatedExplanation,
      isStale: ret.isStale
    };
    ret.time = new Date(ret.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + new Date(ret.createdAt).toLocaleDateString();
    ret.timestamp = new Date(ret.createdAt).getTime();
    delete ret._id;
    delete ret.__v;
    delete ret.calculatedScore;
    delete ret.calculatedLabel;
    delete ret.calculatedExplanation;
    return ret;
  }
});

export const Report = mongoose.model('Report', reportSchema);
