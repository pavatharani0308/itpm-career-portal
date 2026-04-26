import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiEye, FiPlus, FiArrowLeft, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function CompanyJobManage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await API.get('/jobs/my-jobs');
      console.log('Fetched jobs:', response.data); // Debug log
      
      // Ensure each job has a valid ID
      const validJobs = (response.data || []).map(job => ({
        ...job,
        id: job._id || job.id // Normalize the ID
      }));
      
      setJobs(validJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!jobId) {
      toast.error('Invalid job ID');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await API.delete(`/jobs/${jobId}`);
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    if (!jobId) {
      toast.error('Invalid job ID');
      return;
    }
    try {
      await API.put(`/jobs/${jobId}`, { status: newStatus });
      toast.success(`Job ${newStatus === 'published' ? 'published' : 'updated'}`);
      fetchJobs();
    } catch (error) {
      toast.error('Failed to update job status');
    }
  };

  const handleEdit = (job) => {
    setEditingJob({ ...job });
    setShowEditModal(true);
  };

  const handleUpdateJob = async () => {
    if (!editingJob.title.trim()) {
      toast.error('Job title is required');
      return;
    }
    if (!editingJob.applicationDeadline) {
      toast.error('Deadline is required');
      return;
    }
    if (!editingJob.location.trim()) {
      toast.error('Location is required');
      return;
    }

    try {
      const jobId = editingJob._id || editingJob.id;
      await API.put(`/jobs/${jobId}`, {
        title: editingJob.title,
        type: editingJob.type,
        location: editingJob.location,
        applicationDeadline: editingJob.applicationDeadline,
        requirements: editingJob.requirements,
        status: editingJob.status
      });
      
      toast.success('Job updated successfully');
      setShowEditModal(false);
      setEditingJob(null);
      fetchJobs();
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error(error.response?.data?.message || 'Failed to update job');
    }
  };

  const handleViewJob = (job) => {
    const jobId = job._id || job.id;
    console.log('Viewing job with ID:', jobId); // Debug log
    console.log('Full job object:', job); // Debug log
    
    if (jobId) {
      navigate(`/company/job/${jobId}`);
    } else {
      toast.error('Invalid job ID. Job data:', JSON.stringify(job));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Edit Modal */}
      {showEditModal && editingJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Job</h2>
              <p className="text-sm text-gray-500 mt-1">Update your job posting details</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingJob.title}
                  onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                  <select
                    value={editingJob.type}
                    onChange={(e) => setEditingJob({ ...editingJob, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Internship">Internship</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingJob.location}
                    onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editingJob.applicationDeadline?.split('T')[0] || editingJob.applicationDeadline}
                  onChange={(e) => setEditingJob({ ...editingJob, applicationDeadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea
                  value={editingJob.requirements || ''}
                  onChange={(e) => setEditingJob({ ...editingJob, requirements: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="• React experience&#10;• Node.js knowledge&#10;• Good communication skills"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingJob.status}
                  onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingJob(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateJob}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/company" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2">
            <FiArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Manage Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your job postings, edit details, and track applications</p>
        </div>
        <Link
          to="/company/new-job"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <FiPlus className="h-4 w-4" />
          Post New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiBriefcase className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-4">No jobs posted yet</p>
          <Link to="/company/new-job" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <FiPlus className="h-4 w-4" />
            Create your first job posting
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {jobs.map((job) => {
                  const jobKey = job._id || job.id;
                  console.log('Rendering job with key:', jobKey); // Debug log
                  
                  return (
                    <tr key={jobKey} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{job.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{job.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{job.location}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={job.status}
                          onChange={(e) => handleStatusChange(jobKey, e.target.value)}
                          className={`text-sm rounded-full px-3 py-1 font-semibold cursor-pointer ${
                            job.status === 'published' 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : job.status === 'draft'
                              ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleViewJob(job)}
                          className="text-blue-600 hover:text-blue-800 transition"
                          title="View Details"
                        >
                          <FiEye className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => handleEdit(job)}
                          className="text-green-600 hover:text-green-800 transition ml-2"
                          title="Edit Job"
                        >
                          <FiEdit2 className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(jobKey)}
                          className="text-red-600 hover:text-red-800 transition ml-2"
                          title="Delete Job"
                        >
                          <FiTrash2 className="h-5 w-5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}