import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  depth: { type: Number, required: true, min: 0, max: 500 }, // cm
  severity: { type: String, required: true, enum: ['low', 'medium', 'high', 'critical'] },
  
  // Ownership and Auditing
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  statusUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Calculated Priority
  calculatedScore: { type: Number, default: 0 },
  calculatedLabel: { type: String, default: 'low' },
  calculatedExplanation: { type: [String], default: [] },
  isStale: { type: Boolean, default: false },
  
  roadBlocked: { type: Boolean, default: false },
  criticalFacility: { type: Boolean, default: false },
  
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
