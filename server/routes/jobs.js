import express from 'express';
import Job from '../models/Job.js';
import Applicant from '../models/Applicant.js';
import CompanyProfile from '../models/CompanyProfile.js';
import auth from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

const router = express.Router();

// Get all published jobs with filters (public)
router.get('/', async (req, res) => {
  try {
    const { type, location, search, skills } = req.query;
    const query = { status: 'published' };
    
    if (type && type !== 'all') query.type = type;
    if (location && location !== 'all') query.location = location;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { requirements: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (skills) {
      const skillsArray = skills.split(',');
      query.skills = { $in: skillsArray };
    }
    
    const jobs = await Job.find(query)
      .populate('companyId', 'companyName industry location logoUrl rating')
      .sort({ createdAt: -1 });
    
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get company's own jobs (authenticated)
router.get('/my-jobs', auth, roleCheck('company'), async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
    
    if (!companyProfile) {
      return res.status(404).json({ 
        message: 'Company profile not found. Please complete your company profile first.',
        code: 'PROFILE_NOT_FOUND'
      });
    }
    
    if (companyProfile.status !== 'approved') {
      return res.status(403).json({ 
        message: `Your company profile is ${companyProfile.status}. Please wait for admin approval.`,
        code: 'PROFILE_NOT_APPROVED',
        status: companyProfile.status
      });
    }
    
    const jobs = await Job.find({ companyId: companyProfile._id })
      .sort({ createdAt: -1 });
    
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching my jobs:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get jobs for a specific company (public)
router.get('/company/:companyId', async (req, res) => {
  try {
    const jobs = await Job.find({ 
      companyId: req.params.companyId,
      status: 'published'
    }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single job with full details
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('companyId', 'companyName industry location description email phone website logoUrl rating');
    
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if user has already applied
router.get('/:id/has-applied', auth, async (req, res) => {
  try {
    const existing = await Applicant.findOne({
      jobId: req.params.id,
      userId: req.user._id
    });
    res.json({ hasApplied: !!existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create job (authenticated company)
router.post('/', auth, roleCheck('company'), async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
    
    if (!companyProfile) {
      return res.status(404).json({ 
        message: 'Company profile not found. Please complete your profile first.' 
      });
    }
    
    if (companyProfile.status !== 'approved') {
      return res.status(403).json({ 
        message: 'Your company profile is not approved yet. Please wait for admin approval.' 
      });
    }
    
    const job = new Job({
      ...req.body,
      companyId: companyProfile._id
    });
    
    const newJob = await job.save();
    res.status(201).json(newJob);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update job (authenticated company)
router.put('/:id', auth, roleCheck('company'), async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
    
    if (!companyProfile) {
      return res.status(404).json({ message: 'Company profile not found' });
    }
    
    const job = await Job.findOne({ 
      _id: req.params.id, 
      companyId: companyProfile._id 
    });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found or you do not have permission' });
    }
    
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.json(updatedJob);
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(400).json({ message: err.message });
  }
});

// Delete job (authenticated company)
router.delete('/:id', auth, roleCheck('company'), async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
    
    if (!companyProfile) {
      return res.status(404).json({ message: 'Company profile not found' });
    }
    
    const job = await Job.findOne({ 
      _id: req.params.id, 
      companyId: companyProfile._id 
    });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found or you do not have permission' });
    }
    
    await Job.findByIdAndDelete(req.params.id);
    await Applicant.deleteMany({ jobId: req.params.id });
    
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk delete jobs
router.post('/bulk-delete', auth, roleCheck('company'), async (req, res) => {
  try {
    const { ids } = req.body;
    const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
    
    if (!companyProfile) {
      return res.status(404).json({ message: 'Company profile not found' });
    }
    
    const jobs = await Job.find({ 
      _id: { $in: ids }, 
      companyId: companyProfile._id 
    });
    
    if (jobs.length !== ids.length) {
      return res.status(403).json({ message: 'Some jobs do not belong to your company' });
    }
    
    await Job.deleteMany({ _id: { $in: ids } });
    await Applicant.deleteMany({ jobId: { $in: ids } });
    
    res.json({ message: 'Jobs deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk publish jobs
router.post('/bulk-publish', auth, roleCheck('company'), async (req, res) => {
  try {
    const { ids } = req.body;
    const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
    
    if (!companyProfile) {
      return res.status(404).json({ message: 'Company profile not found' });
    }
    
    const jobs = await Job.find({ 
      _id: { $in: ids }, 
      companyId: companyProfile._id 
    });
    
    if (jobs.length !== ids.length) {
      return res.status(403).json({ message: 'Some jobs do not belong to your company' });
    }
    
    await Job.updateMany(
      { _id: { $in: ids }, status: 'draft' },
      { $set: { status: 'published', closedReason: null } }
    );
    
    res.json({ message: 'Jobs published successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;