import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CompanyProfile', 
    required: true 
  },
  title: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String },
  requirements: { type: String },
  applicationDeadline: { type: String },
  status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
  closedReason: { type: String, default: null }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

export default mongoose.model('Job', jobSchema);