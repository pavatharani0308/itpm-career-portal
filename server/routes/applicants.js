import express from 'express';
import mongoose from 'mongoose';
import Applicant from '../models/Applicant.js';
import Notification from '../models/Notification.js';
import Job from '../models/Job.js';
import Profile from '../models/Profile.js';
import auth from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

const router = express.Router();

// Get all applicants (admin only)
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { status, jobId, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (jobId) query.jobId = jobId;
    
    const applicants = await Applicant.find(query)
      .populate('jobId', 'title companyId type location')
      .populate('userId', 'name email')
      .sort({ appliedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Applicant.countDocuments(query);
    
    res.json({
      applicants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my applications (for students)
router.get('/my-applications', auth, roleCheck('user'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user._id };
    
    if (status) query.status = status;
    
    const applications = await Applicant.find(query)
      .populate('jobId', 'title type location applicationDeadline companyId')
      .populate({
        path: 'jobId',
        populate: { path: 'companyId', select: 'companyName industry' }
      })
      .sort({ appliedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Applicant.countDocuments(query);
    
    // Get statistics
    const stats = await Applicant.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statsMap = {
      total: await Applicant.countDocuments({ userId: req.user._id }),
      pending: 0,
      inReview: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      rejected: 0
    };
    
    stats.forEach(s => {
      if (statsMap.hasOwnProperty(s._id)) statsMap[s._id] = s.count;
    });
    
    res.json({
      applications,
      stats: statsMap,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching my applications:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get applicants for a specific company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    // First, find all jobs for this company
    const jobs = await Job.find({ companyId: companyId }).select('_id');
    const jobIds = jobs.map(job => job._id);
    
    const query = { jobId: { $in: jobIds } };
    if (status) query.status = status;
    
    const applicants = await Applicant.find(query)
      .populate('jobId', 'title type location')
      .populate('userId', 'name email')
      .sort({ appliedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Applicant.countDocuments(query);
    
    // Get statistics
    const stats = await Applicant.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statsMap = {
      total: await Applicant.countDocuments({ jobId: { $in: jobIds } }),
      pending: 0,
      inReview: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      rejected: 0
    };
    
    stats.forEach(s => {
      if (statsMap.hasOwnProperty(s._id)) statsMap[s._id] = s.count;
    });
    
    res.json({
      applicants,
      stats: statsMap,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching company applicants:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get application statistics for a company (NEW ENDPOINT)
router.get('/company/:companyId/stats', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Find all jobs for this company
    const jobs = await Job.find({ companyId: companyId });
    const jobIds = jobs.map(job => job._id);
    
    if (jobIds.length === 0) {
      return res.json({
        summary: {
          totalApplications: 0,
          pending: 0,
          inReview: 0,
          shortlisted: 0,
          interview: 0,
          selected: 0,
          rejected: 0,
          totalJobs: jobs.length,
          activeJobs: jobs.filter(j => j.status === 'published').length,
          draftJobs: jobs.filter(j => j.status === 'draft').length,
          avgSkillMatch: 0
        },
        topJobs: [],
        recentApplications: [],
        timeline: [],
        conversionRate: 0
      });
    }
    
    // Get all applicants for these jobs
    const applicants = await Applicant.find({ jobId: { $in: jobIds } });
    
    // Calculate statistics
    const stats = {
      totalApplications: applicants.length,
      pending: applicants.filter(a => a.status === 'pending').length,
      inReview: applicants.filter(a => a.status === 'inReview').length,
      shortlisted: applicants.filter(a => a.status === 'shortlisted').length,
      interview: applicants.filter(a => a.status === 'interview').length,
      selected: applicants.filter(a => a.status === 'selected').length,
      rejected: applicants.filter(a => a.status === 'rejected').length,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'published').length,
      draftJobs: jobs.filter(j => j.status === 'draft').length,
      avgSkillMatch: applicants.length > 0 
        ? Math.round(applicants.reduce((sum, a) => sum + (a.skillMatchPercentage || 0), 0) / applicants.length)
        : 0
    };
    
    // Get top jobs by application count
    const topJobs = jobs.map(job => ({
      jobId: job._id,
      jobTitle: job.title,
      applicationCount: applicants.filter(a => String(a.jobId) === String(job._id)).length
    })).sort((a, b) => b.applicationCount - a.applicationCount).slice(0, 5);
    
    // Get recent applications
    const recentApplications = applicants
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(0, 10)
      .map(app => ({
        _id: app._id,
        name: app.name,
        email: app.email,
        status: app.status,
        appliedAt: app.appliedAt,
        skillMatchPercentage: app.skillMatchPercentage,
        jobTitle: jobs.find(j => String(j._id) === String(app.jobId))?.title || 'Unknown Job'
      }));
    
    // Timeline data for chart (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    const timeline = last30Days.map(date => ({
      _id: date,
      count: applicants.filter(a => a.appliedAt.toISOString().split('T')[0] === date).length
    }));
    
    res.json({
      summary: stats,
      topJobs,
      recentApplications,
      timeline,
      conversionRate: stats.interview > 0 
        ? Math.round((stats.selected / stats.interview) * 100)
        : 0
    });
  } catch (err) {
    console.error('Error fetching application stats:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get applicants for a specific job
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { jobId };
    if (status) query.status = status;
    
    const applicants = await Applicant.find(query)
      .populate('userId', 'name email')
      .sort({ appliedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Applicant.countDocuments(query);
    
    res.json({
      applicants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single applicant
router.get('/:id', auth, async (req, res) => {
  try {
    const applicant = await Applicant.findById(req.params.id)
      .populate('jobId', 'title companyId location type applicationDeadline requirements')
      .populate('userId', 'name email');
    
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });
    
    res.json(applicant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if user has already applied for a job
router.get('/check/:jobId', auth, async (req, res) => {
  try {
    const existing = await Applicant.findOne({
      jobId: req.params.jobId,
      userId: req.user._id
    });
    res.json({ hasApplied: !!existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create applicant (student applying)
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, notes } = req.body;
    
    // Check if already applied
    const existingApplication = await Applicant.findOne({
      jobId,
      userId: req.user._id
    });
    
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this position' });
    }
    
    // Get job details
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.status !== 'published') {
      return res.status(400).json({ message: 'This job is no longer accepting applications' });
    }
    
    // Get user profile
    const profile = await Profile.findOne({ userId: req.user._id });
    
    // Calculate skill match percentage
    let skillMatchPercentage = 0;
    if (profile?.skills?.length > 0 && job.skills?.length > 0) {
      const userSkills = profile.skills.map(s => s.toLowerCase());
      const jobSkills = job.skills.map(s => s.toLowerCase());
      const matchedSkills = userSkills.filter(skill => 
        jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
      );
      skillMatchPercentage = Math.round((matchedSkills.length / jobSkills.length) * 100);
    }
    
    const applicant = new Applicant({
      jobId,
      userId: req.user._id,
      name: req.user.fullName || req.user.name,
      email: req.user.email,
      phone: profile?.phone || '',
      notes: notes || '',
      resume: profile?.resume || '',
      profileSnapshot: {
        skills: profile?.skills || [],
        bio: profile?.bio || '',
        location: profile?.location || '',
        education: profile?.education || '',
        website: profile?.website || '',
        linkedin: profile?.linkedin || '',
        github: profile?.github || ''
      },
      skillMatchPercentage
    });
    
    await applicant.save();
    
    // Create notification for company
    const notification = new Notification({
      kind: 'apply',
      title: 'New Application',
      body: `${req.user.fullName || req.user.name} applied for "${job.title}"`,
      meta: { 
        jobId: job._id, 
        applicantId: applicant._id,
        companyId: job.companyId
      }
    });
    await notification.save();
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicant
    });
  } catch (err) {
    console.error('Error creating application:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update applicant status
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, interviewDetails, notes } = req.body;
    const applicant = await Applicant.findById(req.params.id);
    
    if (!applicant) {
      return res.status(404).json({ message: 'Applicant not found' });
    }
    
    const updates = {};
    if (status) updates.status = status;
    if (interviewDetails) updates.interviewDetails = interviewDetails;
    if (notes !== undefined) updates.notes = notes;
    
    const updatedApplicant = await Applicant.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    
    // Create notification for status change
    if (status && status !== applicant.status) {
      const job = await Job.findById(applicant.jobId);
      const notification = new Notification({
        kind: 'status_update',
        title: `Application ${status}`,
        body: `Your application for "${job?.title}" has been ${status}`,
        userId: applicant.userId,
        meta: {
          applicantId: applicant._id,
          jobId: applicant.jobId,
          oldStatus: applicant.status,
          newStatus: status
        }
      });
      await notification.save();
    }
    
    res.json({
      success: true,
      message: 'Application updated successfully',
      applicant: updatedApplicant
    });
  } catch (err) {
    console.error('Error updating applicant:', err);
    res.status(400).json({ message: err.message });
  }
});

// Delete applicant
router.delete('/:id', auth, async (req, res) => {
  try {
    const applicant = await Applicant.findByIdAndDelete(req.params.id);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });
    
    res.json({ message: 'Application deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;