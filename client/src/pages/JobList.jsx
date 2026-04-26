import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, FiMapPin, FiBriefcase, FiCalendar, 
  FiStar, FiArrowRight, FiCheckCircle,
  FiAlertCircle, FiClock, FiAward, FiFilter, FiX,
  FiCode, FiEye
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function JobList() {
  const { user, completionPercentage = 0, profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    location: 'all'
  });
  const [hasApplied, setHasApplied] = useState({});

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.location !== 'all') params.append('location', filters.location);
      
      const response = await API.get(`/jobs?${params}`);
      const jobsData = response.data || [];
      
      // Normalize job IDs - ensure each job has an _id
      const normalizedJobs = jobsData.map(job => ({
        ...job,
        _id: job._id || job.id
      }));
      
      setJobs(normalizedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAppliedStatus = async (jobId) => {
    if (!user || !jobId) return;
    try {
      const response = await API.get(`/applications/check/${jobId}`);
      setHasApplied(prev => ({ ...prev, [jobId]: response.data.hasApplied }));
    } catch (error) {
      setHasApplied(prev => ({ ...prev, [jobId]: false }));
    }
  };

  useEffect(() => {
    if (user && jobs.length > 0) {
      jobs.forEach(job => {
        if (job && job._id) {
          checkAppliedStatus(job._id);
        }
      });
    }
  }, [jobs, user]);

  const canApply = completionPercentage >= 80;

  const handleApply = (job) => {
    // Debug: Log the job object to see its structure
    console.log('Job object:', job);
    console.log('Job ID:', job._id, job.id);
    
    if (!user) {
      toast.error('Please login to apply');
      return;
    }
    if (!canApply) {
      toast.error(`Profile ${completionPercentage}% complete. Need 80% to apply.`);
      return;
    }
    if (hasApplied[job._id]) {
      toast.error('You have already applied for this position');
      return;
    }
    if (!job || (!job._id && !job.id)) {
      toast.error('Invalid job data - missing ID');
      return;
    }
    
    // Ensure we have an _id
    const jobWithId = {
      ...job,
      _id: job._id || job.id
    };
    
    setSelectedJob(jobWithId);
    setShowModal(true);
  };

  const confirmApply = async () => {
    const jobId = selectedJob?._id || selectedJob?.id;
    
    if (!selectedJob || !jobId) {
      toast.error('Invalid job selection. Please try again.');
      setShowModal(false);
      return;
    }
    
    setApplying(true);
    try {
      const applicationData = {
        jobId: jobId,
        name: user?.name,
        email: user?.email,
        phone: profile?.phone || '',
        notes: ''
      };
      
      console.log('Submitting application:', applicationData);
      
      await API.post('/applications', applicationData);
      toast.success('Application submitted successfully!');
      setHasApplied(prev => ({ ...prev, [jobId]: true }));
      setShowModal(false);
    } catch (error) {
      console.error('Error applying:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit application';
      toast.error(errorMessage);
    } finally {
      setApplying(false);
    }
  };

  const handleSearch = () => {
    fetchJobs();
  };

  const clearFilters = () => {
    setFilters({ type: 'all', location: 'all' });
    setSearchTerm('');
    setTimeout(() => fetchJobs(), 0);
  };

  const getJobTypes = () => {
    const types = ['all', ...new Set(jobs.map(job => job.type).filter(Boolean))];
    return types;
  };

  const getLocations = () => {
    const locations = ['all', ...new Set(jobs.map(job => job.location).filter(Boolean))];
    return locations;
  };

  const hasActiveFilters = filters.type !== 'all' || filters.location !== 'all' || searchTerm;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Internships</h1>
          <p className="text-gray-600 mt-2">Discover opportunities that match your skills and career goals</p>
          
          {/* Profile Completion Warning */}
          {user && !canApply && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <FiAlertCircle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Profile {completionPercentage}% complete - Need 80% to apply
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Complete your profile to unlock job applications
                  </p>
                </div>
                <Link to="/edit-profile" className="text-sm text-yellow-800 font-medium hover:underline">
                  Complete Profile →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by job title, company, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getJobTypes().map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </select>
            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getLocations().map(loc => (
                <option key={loc} value={loc}>
                  {loc === 'all' ? 'All Locations' : loc}
                </option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Search
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-1"
              >
                <FiX className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Found {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FiBriefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No jobs found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <motion.div
                key={job._id || job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">{job.companyId?.companyName || 'Company'}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <div className="flex items-center gap-1">
                          <FiStar className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600">{job.companyId?.rating || 'New'}</span>
                        </div>
                      </div>
                    </div>
                    {job.companyId?._id && (
                      <Link 
                        to={`/company/${job.companyId._id}`}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        View Company
                      </Link>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <FiBriefcase className="h-4 w-4" />
                      {job.type || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <FiMapPin className="h-4 w-4" />
                      {job.location || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <FiCalendar className="h-4 w-4" />
                      Deadline: {job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.skills.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                          <FiCode className="h-3 w-3" />
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-xs text-gray-500">+{job.skills.length - 4} more</span>
                      )}
                    </div>
                  )}

                  <p className="text-gray-600 text-sm mt-3 line-clamp-2">
                    {job.requirements?.substring(0, 150)}...
                  </p>

                  <div className="mt-4 flex gap-3">
                    <Link
                      to={`/student/job/${job._id || job.id}`}
                      className="flex-1 text-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                    >
                      <FiEye className="inline mr-1 h-4 w-4" />
                      View Details
                    </Link>
                    <button
                      onClick={() => handleApply(job)}
                      disabled={!user || !canApply || hasApplied[job._id || job.id]}
                      className={`flex-1 py-2 rounded-lg font-medium transition ${
                        !user ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                        hasApplied[job._id || job.id] ? 'bg-green-100 text-green-600 cursor-not-allowed' :
                        canApply ? 'bg-blue-600 text-white hover:bg-blue-700' : 
                        'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {!user ? 'Login to Apply' :
                       hasApplied[job._id || job.id] ? 'Applied ✓' :
                       canApply ? 'Apply Now' : `${completionPercentage}% Complete`}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Application Modal */}
      <AnimatePresence>
        {showModal && selectedJob && (
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              key="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
            >
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Application</h3>
                <p className="text-gray-600 mt-2">
                  Are you sure you want to apply for <strong>{selectedJob.title}</strong>?
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Your application includes:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li key="name">• Name: {user?.name || 'N/A'}</li>
                  <li key="email">• Email: {user?.email || 'N/A'}</li>
                  <li key="phone">• Phone: {profile?.phone || 'Not provided'}</li>
                  <li key="resume">• Resume: {profile?.resume ? 'Uploaded ✓' : 'Not uploaded'}</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApply}
                  disabled={applying}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {applying ? 'Submitting...' : 'Confirm Apply'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}