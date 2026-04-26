// controllers/applicationController.js
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const json2csv = require('json2csv').parse;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Export the upload middleware
exports.uploadResume = upload.single('resume');

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate skill match percentage between student and job
 */
function calculateSkillMatch(studentSkills, jobSkills) {
  if (!studentSkills?.length || !jobSkills?.length) return 0;
  
  const studentSkillSet = new Set(studentSkills.map(s => s.toLowerCase().trim()));
  const jobSkillSet = new Set(jobSkills.map(s => s.toLowerCase().trim()));
  
  let matchCount = 0;
  for (const skill of jobSkillSet) {
    if (studentSkillSet.has(skill)) matchCount++;
  }
  
  return Math.round((matchCount / jobSkillSet.size) * 100);
}

/**
 * Generate unique application ID
 */
function generateApplicationId() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `APP-${timestamp}-${randomStr}`;
}

/**
 * Validate status transition based on workflow
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    'Pending': ['In Review', 'Rejected'],
    'In Review': ['Shortlisted', 'Rejected'],
    'Shortlisted': ['Interview', 'Rejected'],
    'Interview': ['Selected', 'Rejected'],
    'Selected': [],
    'Rejected': [],
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// ==================== STUDENT CONTROLLERS ====================

/**
 * @desc    Student applies for a job with detailed information
 * @route   POST /api/applications/jobs/:jobId/apply-with-details
 * @access  Private (Student only)
 */
exports.applyForJobWithDetails = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { jobId } = req.params;
    const studentId = req.user.id;
    
    // Log incoming data for debugging
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    // Parse form data - fields from FormData
    let skills = req.body.skills;
    let introduction = req.body.introduction;
    let phone = req.body.phone;
    let linkedin = req.body.linkedin || '';
    let portfolio = req.body.portfolio || '';
    let github = req.body.github || '';
    let additionalInfo = req.body.additionalInfo || '';
    
    // Parse skills if it's a string
    if (skills) {
      try {
        if (typeof skills === 'string') {
          skills = JSON.parse(skills);
        }
      } catch (e) {
        skills = skills.split(',').map(s => s.trim());
      }
    } else {
      skills = [];
    }
    
    // Validate required fields
    if (!introduction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide an introduction'
      });
    }
    
    if (!skills || skills.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please select at least one skill'
      });
    }
    
    if (!phone) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide your phone number'
      });
    }
    
    if (!req.file) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please upload your resume'
      });
    }

    // 1. Fetch job with deadline validation
    const job = await Job.findById(jobId).session(session);
    if (!job) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    // 2. Validate job deadline
    if (new Date(job.deadline) < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    // 3. Check for duplicate application
    const existingApplication = await Application.findOne({
      student: studentId,
      job: jobId,
    }).session(session);

    if (existingApplication) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this position'
      });
    }

    // 4. Get student details
    const student = await User.findById(studentId).session(session);
    
    // 5. Upload resume locally
    let resumeUrl = '';
    const resumeFile = req.file;
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../uploads/resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const fileName = `${Date.now()}_${studentId}_${resumeFile.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, resumeFile.buffer);
    resumeUrl = `/uploads/resumes/${fileName}`;

    // 6. Calculate skill match percentage using selected skills
    const matchPercentage = calculateSkillMatch(skills, job.requiredSkills || []);

    // 7. Generate unique Application ID
    const applicationId = generateApplicationId();

    // 8. Create application with all details
    const newApplication = new Application({
      applicationId,
      student: studentId,
      job: jobId,
      introduction,
      selectedSkills: skills,
      phone: phone, // Add phone number
      linkedin: linkedin,
      portfolio: portfolio,
      github: github,
      additionalInfo: additionalInfo,
      resumeUrl,
      skillMatchPercentage: matchPercentage,
      isDeadlineValid: true,
      statusHistory: [
        {
          status: 'Pending',
          note: 'Application submitted successfully',
          updatedBy: studentId,
        },
      ],
    });

    await newApplication.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: newApplication,
      message: 'Application submitted successfully',
      skillMatchPercentage: matchPercentage,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in applyForJobWithDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting application',
      error: error.message
    });
  }
};


/**
 * @desc    Get student's own applications
 * @route   GET /api/applications/my-applications
 * @access  Private (Student only)
 */
exports.getMyApplications = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { student: studentId };
    if (status) filter.status = status;
    
    const applications = await Application.find(filter)
      .populate('job', 'title company location deadline requiredSkills')
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Application.countDocuments(filter);
    
    res.json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getMyApplications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your applications',
      error: error.message
    });
  }
};

/**
 * @desc    Get single application details
 * @route   GET /api/applications/:applicationId
 * @access  Private (Student & Company)
 */
exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const application = await Application.findById(applicationId)
      .populate('student', 'name email phone skills profile resume')
      .populate('job', 'title company location description requiredSkills deadline')
      .populate('statusHistory.updatedBy', 'name email');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check authorization: Student can only see their own applications
    if (userRole === 'student' && application.student._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own applications.'
      });
    }
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error in getApplicationDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application details',
      error: error.message
    });
  }
};

// ==================== COMPANY CONTROLLERS ====================

/**
 * @desc    Company views applicants for a specific job with filters
 * @route   GET /api/applications/jobs/:jobId/applicants
 * @access  Private (Company only)
 */
exports.getApplicantsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { 
      status, 
      minMatch, 
      sortBy = 'appliedAt',
      sortOrder = 'desc',
      page = 1, 
      limit = 10,
      search
    } = req.query;
    
    // Verify job belongs to this company
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.company.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This job does not belong to your company.'
      });
    }
    
    // Build filter
    const filter = { job: jobId };
    if (status) filter.status = status;
    if (minMatch) filter.skillMatchPercentage = { $gte: parseInt(minMatch) };
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get applications with pagination
    let applicationsQuery = Application.find(filter)
      .populate('student', 'name email phone skills profile')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Apply search filter if provided
    if (search) {
      const studentsWithSearch = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const studentIds = studentsWithSearch.map(s => s._id);
      filter.student = { $in: studentIds };
      applicationsQuery = Application.find(filter)
        .populate('student', 'name email phone skills profile')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);
    }
    
    const applications = await applicationsQuery;
    const total = await Application.countDocuments(filter);
    
    // Get summary statistics for this job - FIXED ObjectId usage
    const stats = await Application.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(jobId) } }, // Fixed: added 'new'
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          inReview: { $sum: { $cond: [{ $eq: ['$status', 'In Review'] }, 1, 0] } },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
          interview: { $sum: { $cond: [{ $eq: ['$status', 'Interview'] }, 1, 0] } },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
          avgMatch: { $avg: '$skillMatchPercentage' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: applications,
      stats: stats[0] || {
        total: 0,
        pending: 0,
        inReview: 0,
        shortlisted: 0,
        interview: 0,
        selected: 0,
        rejected: 0,
        avgMatch: 0
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getApplicantsForJob:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applicants',
      error: error.message
    });
  }
};

/**
 * @desc    Company updates application status (with workflow validation)
 * @route   PUT /api/applications/:applicationId/status
 * @access  Private (Company only)
 */
exports.updateApplicationStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { applicationId } = req.params;
    const { status, note } = req.body;
    const companyId = req.user.id;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Find application and populate required fields
    const application = await Application.findById(applicationId)
      .populate('job', 'title company')
      .session(session);
    
    if (!application) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify company owns the job
    const job = await Job.findById(application.job._id).session(session);
    if (job.company.toString() !== companyId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update applications for your jobs.'
      });
    }
    
    const oldStatus = application.status;
    
    // Validate status transition
    if (!isValidStatusTransition(oldStatus, status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${oldStatus} to ${status}. Allowed transitions: ${isValidStatusTransition(oldStatus, status)}`,
        currentStatus: oldStatus,
        allowedTransitions: {
          'Pending': ['In Review', 'Rejected'],
          'In Review': ['Shortlisted', 'Rejected'],
          'Shortlisted': ['Interview', 'Rejected'],
          'Interview': ['Selected', 'Rejected'],
          'Selected': [],
          'Rejected': []
        }[oldStatus]
      });
    }
    
    // Update application
    application.status = status;
    application.statusHistory.push({
      status,
      note: note || `Status updated from ${oldStatus} to ${status}`,
      updatedBy: companyId,
    });
    
    await application.save({ session });
    await session.commitTransaction();
    session.endSession();
    
    // Populate for response
    const updatedApplication = await Application.findById(applicationId)
      .populate('student', 'name email')
      .populate('job', 'title');
    
    // TODO: Trigger automatic notification (email/socket)
    // this.sendStatusNotification(updatedApplication, oldStatus, status);
    
    res.json({
      success: true,
      data: updatedApplication,
      message: `Application status updated from ${oldStatus} to ${status}`,
      oldStatus,
      newStatus: status
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in updateApplicationStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
};

/**
 * @desc    Company schedules interview for an applicant
 * @route   POST /api/applications/:applicationId/interview
 * @access  Private (Company only)
 */
exports.scheduleInterview = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { date, time, message, meetingLink } = req.body;
    const companyId = req.user.id;
    
    // Validate required fields
    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Interview date and time are required'
      });
    }
    
    // Validate interview date is in future
    const interviewDateTime = new Date(`${date}T${time}`);
    const currentDateTime = new Date();
    
    if (interviewDateTime <= currentDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Interview date and time must be in the future'
      });
    }
    
    // Find application
    const application = await Application.findById(applicationId)
      .populate('job', 'title company');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify company owns the job
    const job = await Job.findById(application.job._id);
    if (job.company.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only schedule interviews for your jobs.'
      });
    }
    
    // Check if application is eligible for interview
    if (application.status !== 'Shortlisted' && application.status !== 'Interview') {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule interview for application with status: ${application.status}. Application must be Shortlisted first.`
      });
    }
    
    // Update application with interview details
    application.status = 'Interview';
    application.interviewDetails = {
      date: interviewDateTime,
      time,
      message: message || 'Interview scheduled',
      meetingLink: meetingLink || null,
      scheduledBy: companyId,
      scheduledAt: new Date()
    };
    
    // Add to status history
    application.statusHistory.push({
      status: 'Interview',
      note: `Interview scheduled for ${date} at ${time}. ${message ? 'Message: ' + message : ''}`,
      updatedBy: companyId,
    });
    
    await application.save();
    
    // Populate student details for response
    const updatedApplication = await Application.findById(applicationId)
      .populate('student', 'name email phone')
      .populate('job', 'title company');
    
    // TODO: Trigger automatic notification (email/socket) to student
    // this.sendInterviewNotification(updatedApplication, interviewDateTime);
    
    res.json({
      success: true,
      data: updatedApplication,
      message: 'Interview scheduled successfully',
      interviewDetails: {
        date: interviewDateTime,
        time,
        message: message || 'Interview scheduled',
        meetingLink: meetingLink || null
      }
    });
  } catch (error) {
    console.error('Error in scheduleInterview:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling interview',
      error: error.message
    });
  }
};

/**
 * @desc    Company exports applicant list to CSV
 * @route   GET /api/applications/jobs/:jobId/export
 * @access  Private (Company only)
 */
exports.exportApplicantsToCSV = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.query;
    
    // Verify job belongs to this company
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.company.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This job does not belong to your company.'
      });
    }
    
    // Build filter
    const filter = { job: jobId };
    if (status) filter.status = status;
    
    // Fetch applications
    const applications = await Application.find(filter)
      .populate('student', 'name email phone skills profile')
      .populate('job', 'title')
      .sort({ appliedAt: -1 });
    
    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No applications found to export'
      });
    }
    
    // Prepare CSV data
    const csvData = applications.map(app => ({
      'Application ID': app.applicationId,
      'Student Name': app.student.name,
      'Student Email': app.student.email,
      'Student Phone': app.student.phone || 'N/A',
      'Skills': app.student.skills?.join(', ') || 'N/A',
      'Status': app.status,
      'Skill Match %': app.skillMatchPercentage,
      'Applied Date': new Date(app.appliedAt).toLocaleDateString(),
      'Applied Time': new Date(app.appliedAt).toLocaleTimeString(),
      'Interview Date': app.interviewDetails?.date ? new Date(app.interviewDetails.date).toLocaleDateString() : 'N/A',
      'Interview Time': app.interviewDetails?.time || 'N/A',
      'Interview Message': app.interviewDetails?.message || 'N/A',
      'Status History': app.statusHistory.map(h => `${h.status} (${new Date(h.updatedAt).toLocaleDateString()})`).join(' -> ')
    }));
    
    const csv = json2csv(csvData);
    
    // Set response headers for CSV download
    res.header('Content-Type', 'text/csv');
    res.attachment(`applicants_${job.title}_${Date.now()}.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error in exportApplicantsToCSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting applicants to CSV',
      error: error.message
    });
  }
};

/**
 * @desc    Company gets application analytics dashboard
 * @route   GET /api/applications/jobs/:jobId/analytics
 * @access  Private (Company only)
 */
exports.getApplicationAnalytics = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { timeframe = 'all' } = req.query;
    
    console.log('Fetching analytics for job:', jobId, 'timeframe:', timeframe);
    
    // Verify job belongs to this company
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.company.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This job does not belong to your company.'
      });
    }
    
    // Date filter based on timeframe
    let dateFilter = {};
    const now = new Date();
    
    if (timeframe === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { appliedAt: { $gte: weekAgo } };
    } else if (timeframe === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { appliedAt: { $gte: monthAgo } };
    }
    
    // Main analytics aggregation
    const analytics = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          inReview: { $sum: { $cond: [{ $eq: ['$status', 'In Review'] }, 1, 0] } },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
          interview: { $sum: { $cond: [{ $eq: ['$status', 'Interview'] }, 1, 0] } },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
          avgSkillMatch: { $avg: '$skillMatchPercentage' }
        }
      }
    ]);
    
    // Timeline data for charts
    const timelineData = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$appliedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Status distribution for pie chart
    const statusDistribution = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Skill match distribution
    const skillMatchDistribution = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $bucket: {
          groupBy: '$skillMatchPercentage',
          boundaries: [0, 25, 50, 75, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Interview conversion rate
    const interviewStats = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter,
          status: { $in: ['Interview', 'Selected', 'Rejected'] }
        } 
      },
      {
        $group: {
          _id: null,
          totalInterviewed: { 
            $sum: { $cond: [{ $eq: ['$status', 'Interview'] }, 1, 0] }
          },
          totalSelected: { 
            $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] }
          },
          totalRejected: { 
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const conversionRate = interviewStats[0]?.totalInterviewed > 0 
      ? ((interviewStats[0].totalSelected / interviewStats[0].totalInterviewed) * 100).toFixed(2)
      : 0;
    
    // Get recent activity (last 5 status changes)
    const recentActivity = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      { $unwind: '$statusHistory' },
      { $sort: { 'statusHistory.updatedAt': -1 } },
      { $limit: 5 },
      {
        $project: {
          description: { 
            $concat: [
              'Status changed to ',
              '$statusHistory.status',
              ' for applicant'
            ]
          },
          date: '$statusHistory.updatedAt'
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        summary: analytics[0] || {
          total: 0,
          pending: 0,
          inReview: 0,
          shortlisted: 0,
          interview: 0,
          selected: 0,
          rejected: 0,
          avgSkillMatch: 0
        },
        conversionRate: parseFloat(conversionRate),
        timeline: timelineData,
        statusDistribution,
        skillMatchDistribution,
        interviewStats: interviewStats[0] || {
          totalInterviewed: 0,
          totalSelected: 0,
          totalRejected: 0
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error in getApplicationAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Company gets application analytics dashboard
 * @route   GET /api/applications/jobs/:jobId/analytics
 * @access  Private (Company only)
 */
exports.getApplicationAnalytics = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { timeframe = 'all' } = req.query;
    
    console.log('Fetching analytics for job:', jobId, 'timeframe:', timeframe);
    
    // Verify job belongs to this company
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.company.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This job does not belong to your company.'
      });
    }
    
    // Date filter based on timeframe
    let dateFilter = {};
    const now = new Date();
    
    if (timeframe === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { appliedAt: { $gte: weekAgo } };
    } else if (timeframe === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { appliedAt: { $gte: monthAgo } };
    }
    
    // Main analytics aggregation
    const analytics = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          inReview: { $sum: { $cond: [{ $eq: ['$status', 'In Review'] }, 1, 0] } },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
          interview: { $sum: { $cond: [{ $eq: ['$status', 'Interview'] }, 1, 0] } },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
          avgSkillMatch: { $avg: '$skillMatchPercentage' }
        }
      }
    ]);
    
    // Timeline data for charts
    const timelineData = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$appliedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Status distribution for pie chart
    const statusDistribution = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Skill match distribution
    const skillMatchDistribution = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      {
        $bucket: {
          groupBy: '$skillMatchPercentage',
          boundaries: [0, 25, 50, 75, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Interview conversion rate
    const interviewStats = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter,
          status: { $in: ['Interview', 'Selected', 'Rejected'] }
        } 
      },
      {
        $group: {
          _id: null,
          totalInterviewed: { 
            $sum: { $cond: [{ $eq: ['$status', 'Interview'] }, 1, 0] }
          },
          totalSelected: { 
            $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] }
          },
          totalRejected: { 
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const conversionRate = interviewStats[0]?.totalInterviewed > 0 
      ? ((interviewStats[0].totalSelected / interviewStats[0].totalInterviewed) * 100).toFixed(2)
      : 0;
    
    // Get recent activity (last 5 status changes)
    const recentActivity = await Application.aggregate([
      { 
        $match: { 
          job: new mongoose.Types.ObjectId(jobId),
          ...dateFilter
        } 
      },
      { $unwind: '$statusHistory' },
      { $sort: { 'statusHistory.updatedAt': -1 } },
      { $limit: 5 },
      {
        $project: {
          description: { 
            $concat: [
              'Status changed to ',
              '$statusHistory.status',
              ' for applicant'
            ]
          },
          date: '$statusHistory.updatedAt'
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        summary: analytics[0] || {
          total: 0,
          pending: 0,
          inReview: 0,
          shortlisted: 0,
          interview: 0,
          selected: 0,
          rejected: 0,
          avgSkillMatch: 0
        },
        conversionRate: parseFloat(conversionRate),
        timeline: timelineData,
        statusDistribution,
        skillMatchDistribution,
        interviewStats: interviewStats[0] || {
          totalInterviewed: 0,
          totalSelected: 0,
          totalRejected: 0
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error in getApplicationAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Company gets bulk application statistics across all jobs
 * @route   GET /api/applications/company/statistics
 * @access  Private (Company only)
 */
exports.getCompanyStatistics = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    // Get all jobs for this company
    const jobs = await Job.find({ company: companyId }).select('_id title');
    const jobIds = jobs.map(job => job._id);
    
    if (jobIds.length === 0) {
      return res.json({
        success: true,
        data: {
          totalApplications: 0,
          totalJobs: 0,
          averagePerJob: 0,
          statusBreakdown: {},
          recentActivity: []
        }
      });
    }
    
    // Get overall statistics - FIXED ObjectId usage
    const overallStats = await Application.aggregate([
      { $match: { job: { $in: jobIds.map(id => new mongoose.Types.ObjectId(id)) } } }, // Fixed: added 'new'
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          inReview: { $sum: { $cond: [{ $eq: ['$status', 'In Review'] }, 1, 0] } },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
          interview: { $sum: { $cond: [{ $eq: ['$status', 'Interview'] }, 1, 0] } },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } }
        }
      }
    ]);
    
    // Get applications per job - FIXED ObjectId usage
    const applicationsPerJob = await Application.aggregate([
      { $match: { job: { $in: jobIds.map(id => new mongoose.Types.ObjectId(id)) } } }, // Fixed: added 'new'
      {
        $group: {
          _id: '$job',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate job titles
    const jobStats = await Promise.all(
      applicationsPerJob.map(async (stat) => {
        const job = jobs.find(j => j._id.toString() === stat._id.toString());
        return {
          jobId: stat._id,
          jobTitle: job ? job.title : 'Unknown',
          applicationCount: stat.count
        };
      })
    );
    
    // Get recent applications (last 10)
    const recentApplications = await Application.find({ job: { $in: jobIds } })
      .populate('student', 'name email')
      .populate('job', 'title')
      .sort({ appliedAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: {
        summary: overallStats[0] || {
          totalApplications: 0,
          pending: 0,
          inReview: 0,
          shortlisted: 0,
          interview: 0,
          selected: 0,
          rejected: 0
        },
        totalJobs: jobs.length,
        averagePerJob: jobIds.length > 0 
          ? (overallStats[0]?.totalApplications / jobIds.length).toFixed(2)
          : 0,
        topJobs: jobStats,
        recentApplications
      }
    });
  } catch (error) {
    console.error('Error in getCompanyStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Company updates interview details
 * @route   PUT /api/applications/:applicationId/interview
 * @access  Private (Company only)
 */
exports.updateInterviewDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { date, time, message, meetingLink } = req.body;
    const companyId = req.user.id;
    
    const application = await Application.findById(applicationId)
      .populate('job', 'title company');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify company owns the job
    const job = await Job.findById(application.job._id);
    if (job.company.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if interview is scheduled
    if (!application.interviewDetails || !application.interviewDetails.date) {
      return res.status(400).json({
        success: false,
        message: 'No interview scheduled for this application'
      });
    }
    
    // Update interview details
    if (date) application.interviewDetails.date = new Date(`${date}T${application.interviewDetails.time || '10:00'}`);
    if (time) application.interviewDetails.time = time;
    if (message) application.interviewDetails.message = message;
    if (meetingLink) application.interviewDetails.meetingLink = meetingLink;
    application.interviewDetails.updatedAt = new Date();
    
    // Add to status history
    application.statusHistory.push({
      status: application.status,
      note: `Interview details updated. ${message ? 'New message: ' + message : ''}`,
      updatedBy: companyId,
    });
    
    await application.save();
    
    res.json({
      success: true,
      data: application,
      message: 'Interview details updated successfully'
    });
  } catch (error) {
    console.error('Error in updateInterviewDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating interview details',
      error: error.message
    });
  }
};