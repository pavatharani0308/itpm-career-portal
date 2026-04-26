import { useNavigate, Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, AlertCircle, Briefcase, MapPin, Calendar, Clock, Save, Send, Building2, X, Plus } from "lucide-react";
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function AddJob() {
  const nav = useNavigate();
  
  const [form, setForm] = useState({
    title: "",
    type: "Internship",
    deadline: "",
    location: "",
    requirements: "",
  });

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch company profile
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const response = await API.get('/company/profile');
        const profile = response.data;
        setCompanyProfile(profile);
        
        const companyId = profile._id || profile.id;
        if (companyId) {
          localStorage.setItem('companyId', companyId);
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
        toast.error('Failed to load company profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanyProfile();
  }, []);

  // Validation errors
  const errors = useMemo(() => {
    const e = {};
    if (!form.title.trim()) e.title = "Job title is required";
    if (!form.deadline) e.deadline = "Deadline is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (skills.length === 0) e.skills = "At least one skill is required";
    return e;
  }, [form, skills]);

  const isCompanyApproved = companyProfile?.status === 'approved';
  const isCompanyPending = companyProfile?.status === 'pending';
  const isCompanyRejected = companyProfile?.status === 'rejected';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isCompanyApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-amber-200">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Cannot Post Jobs</h2>
            <p className="text-gray-600 mb-4">
              {isCompanyPending && "Your company profile is pending admin approval. You'll be able to post jobs once approved."}
              {isCompanyRejected && "Your company profile was rejected. Please update your profile and resubmit for approval."}
              {!companyProfile && "Please complete your company profile first."}
            </p>
            {companyProfile?.rejectionReason && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                Reason: {companyProfile.rejectionReason}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Link
                to="/company/profile"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                <Building2 className="h-4 w-4" />
                {companyProfile ? "Update Profile" : "Create Profile"}
              </Link>
              <Link
                to="/company"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
              >
                Go Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const validateField = (fieldName, value) => {
    if (fieldName === 'title' && !value.trim()) return "Job title is required";
    if (fieldName === 'deadline' && !value) return "Deadline is required";
    if (fieldName === 'location' && !value.trim()) return "Location is required";
    return null;
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleChange = (fieldName, value) => {
    setForm(prev => ({ ...prev, [fieldName]: value }));
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      if (!error) {
        setTouched(prev => ({ ...prev, [fieldName]: false }));
      }
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const submit = (status) => async (e) => {
    e.preventDefault();
    
    setTouched({ title: true, deadline: true, location: true });

    if (Object.keys(errors).length > 0) {
      toast.error('Please fill in all required fields and add at least one skill');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(status === 'draft' ? 'Saving job as draft...' : 'Publishing job...');
    
    try {
      const companyId = companyProfile._id || companyProfile.id;
      
      // Format requirements with skills
      const formattedRequirements = `
**Required Skills:**
${skills.map(skill => `• ${skill}`).join('\n')}

**Job Description:**
${form.requirements.trim() || 'No specific requirements provided'}
      `.trim();
      
      const jobData = {
        companyId: companyId,
        title: form.title.trim(),
        type: form.type,
        applicationDeadline: form.deadline,
        location: form.location.trim(),
        requirements: formattedRequirements,
        status: status,
        skills: skills // Store skills separately if your schema supports it
      };
      
      await API.post('/jobs', jobData);
      
      toast.dismiss(loadingToast);
      toast.success(
        status === 'draft' 
          ? 'Job saved as draft successfully!' 
          : 'Job published successfully!',
        { duration: 3000 }
      );
      
      nav('/company');
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error creating job:', error);
      toast.error(error.response?.data?.message || 'Failed to create job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/company"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          {companyProfile && (
            <div className="flex items-center gap-3 p-4 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Posting job for</p>
                <p className="font-semibold text-lg text-slate-900 dark:text-white">{companyProfile.companyName}</p>
                <p className="text-xs text-green-600 dark:text-green-400">✓ Profile approved</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Post New Job</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Fill in the details below to create a new job posting
            </p>
          </div>

          <form className="p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Job Title */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Briefcase className="h-4 w-4" />
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full rounded-xl border bg-white dark:bg-slate-900 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${
                  touched.title && errors.title 
                    ? "border-red-400 focus:ring-red-400" 
                    : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                }`}
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={() => handleBlur('title')}
                placeholder="e.g., Senior Software Engineer"
                disabled={isSubmitting}
              />
              {touched.title && errors.title && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Job Type & Deadline */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="h-4 w-4" />
                  Job Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="Internship">Internship</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="h-4 w-4" />
                  Application Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full rounded-xl border bg-white dark:bg-slate-900 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    touched.deadline && errors.deadline 
                      ? "border-red-400 focus:ring-red-400" 
                      : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                  }`}
                  value={form.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  onBlur={() => handleBlur('deadline')}
                  disabled={isSubmitting}
                />
                {touched.deadline && errors.deadline && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {errors.deadline}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <MapPin className="h-4 w-4" />
                Location <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full rounded-xl border bg-white dark:bg-slate-900 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${
                  touched.location && errors.location 
                    ? "border-red-400 focus:ring-red-400" 
                    : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                }`}
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                onBlur={() => handleBlur('location')}
                placeholder="e.g., Colombo, Sri Lanka or Remote"
                disabled={isSubmitting}
              />
              {touched.location && errors.location && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.location}
                </p>
              )}
            </div>

            {/* Skills Section - Similar to Edit Profile */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Required Skills <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a skill and press Enter or click Add"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              
              {/* Skills Tags */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-500 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {touched.skills && errors.skills && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.skills}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add key skills required for this position (e.g., React, Python, Project Management)
              </p>
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Additional Requirements & Responsibilities
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                value={form.requirements}
                onChange={(e) => handleChange('requirements', e.target.value)}
                placeholder="• 3+ years of experience&#10;• Strong communication skills&#10;• Bachelor's degree in related field"
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tip: Use bullet points (•) to list requirements clearly
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => nav('/company')}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit("draft")}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={submit("published")}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Publishing..." : "Publish Job"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Tip:</strong> Jobs saved as draft won't be visible to applicants. 
            Only published jobs will appear on the job portal. You can edit or publish drafts later.
          </p>
        </div>

        {/* Preview Section */}
        {skills.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Title:</span>
                <span className="text-gray-900 dark:text-white font-medium">{form.title || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="text-gray-900 dark:text-white">{form.type || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="text-gray-900 dark:text-white">{form.location || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline:</span>
                <span className="text-gray-900 dark:text-white">{form.deadline || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Skills:</span>
                <span className="text-gray-900 dark:text-white">{skills.length > 0 ? skills.join(', ') : '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}