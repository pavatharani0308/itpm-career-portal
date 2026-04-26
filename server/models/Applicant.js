import mongoose from 'mongoose';

const applicantSchema = new mongoose.Schema({
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'inReview', 'shortlisted', 'interview', 'selected', 'rejected'], 
    default: 'pending' 
  },
  notes: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
  resume: { type: String, default: '' },
  profileSnapshot: {
    skills: [String],
    bio: String,
    location: String,
    education: String,
    website: String,
    linkedin: String,
    github: String
  },
  skillMatchPercentage: { type: Number, default: 0 },
  interviewDetails: {
    date: Date,
    time: String,
    mode: { type: String, enum: ['online', 'in-person', 'phone'], default: 'online' },
    meetingLink: String,
    message: String
  }
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

// Indexes for better query performance
applicantSchema.index({ jobId: 1, status: 1 });
applicantSchema.index({ userId: 1 });
applicantSchema.index({ appliedAt: -1 });
applicantSchema.index({ email: 1 });

export default mongoose.model('Applicant', applicantSchema);