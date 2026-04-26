const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    unique: true,
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'In Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'],
    default: 'Pending',
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  skillMatchPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  introduction: {
    type: String,
    required: true,
  },
  selectedSkills: {
    type: [String],
    default: [],
  },
  phone: {  
    type: String,
    required: true,
  },
  linkedin: String,
  portfolio: String,
  github: String,
  additionalInfo: String,
  resumeUrl: String,
  resumePublicId: String,
  // Interview Details
  interviewDetails: {
    date: Date,
    time: String,
    message: String,
    meetingLink: String,
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    scheduledAt: Date,
  },
  // Status Update History
  statusHistory: [
    {
      status: String,
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      note: String,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  ],
  isDeadlineValid: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true
});

applicationSchema.index({ student: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);