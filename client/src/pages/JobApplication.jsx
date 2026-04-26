import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import {
  ArrowLeft,
  Mail,
  User,
  FileText,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Upload,
} from "lucide-react";

export default function JobApplication() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { getJobById, getCompanyById, addApplicant } = usePortal();

  const job = getJobById(jobId);
  const company = job ? getCompanyById(job.companyId) : null;

  const [form, setForm] = useState({
    name: "",
    email: "",
    notes: "",
    cvFileName: "",
    cvDataUrl: "",
  });

  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    else if (/[0-9]/.test(form.name)) e.name = "Name should not contain numbers";

    if (!form.email.trim()) e.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format";

    if (!form.cvDataUrl) e.cv = "CV file is required (PDF or image preferred)";
    return e;
  }, [form]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        cvFileName: file.name,
        cvDataUrl: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, cv: true });

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    // Simulate slight delay for professional feel
    setTimeout(() => {
      addApplicant({
        jobId: Number(jobId),
        name: form.name.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
        cvFileName: form.cvFileName,
        cvDataUrl: form.cvDataUrl,
      });
      setIsSuccess(true);
      setIsSubmitting(false);
    }, 1200);
  };

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-2xl font-bold dark:text-white">Job opening not found</h2>
        <Link to="/" className="text-sky-500 font-bold hover:underline">Return to job portal</Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-950/20">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Application Received!</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Thank you, <span className="font-bold text-slate-900 dark:text-white">{form.name}</span>. Your application for <span className="font-bold text-slate-900 dark:text-white">{job.title}</span> at <span className="font-bold text-slate-900 dark:text-white">{company?.name}</span> has been successfully submitted.
          </p>
        </div>
        <div className="glass p-6 text-sm text-slate-500 text-left space-y-3 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-500 shrink-0" />
            <p>Our recruitment team will review your profile. You will receive an update at <strong>{form.email}</strong> if you are shortlisted for the role.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="rounded-2xl bg-slate-900 px-8 py-3 text-white font-bold transition hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400"
        >
          View more opportunities
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Job Info */}
        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <div className="h-20 w-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden dark:bg-slate-800 dark:border-slate-700">
              {company?.logoUrl ? (
                <img src={company.logoUrl} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-slate-300" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">{job.title}</h1>
              <div className="mt-2 text-lg font-semibold text-sky-600 dark:text-sky-400">
                {company?.name}
              </div>
            </div>
          </div>

          <div className="glass p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</div>
                  <div className="font-semibold">{job.location}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</div>
                  <div className="font-semibold">{job.type}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-white/10">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Requirements</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="lg:col-span-2">
          <div className="glass p-8 shadow-2xl relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 -mr-16 -mt-16 rounded-full blur-2xl" />

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Personal Information</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Kamal Perera"
                    value={form.name}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className={`w-full rounded-xl border bg-white/50 px-4 py-3 outline-none transition dark:bg-slate-900/50 ${
                      touched.name && errors.name
                        ? "border-rose-400 ring-4 ring-rose-400/10"
                        : "border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10"
                    }`}
                  />
                  {touched.name && errors.name && (
                    <p className="text-xs font-bold text-rose-500 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="kamal@example.com"
                    value={form.email}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={`w-full rounded-xl border bg-white/50 px-4 py-3 outline-none transition dark:bg-slate-900/50 ${
                      touched.email && errors.email
                        ? "border-rose-400 ring-4 ring-rose-400/10"
                        : "border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10"
                    }`}
                  />
                  {touched.email && errors.email && (
                    <p className="text-xs font-bold text-rose-500 mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us why you are a good fit for this role..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-900/50"
                />
              </div>

              {/* CV Upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-slate-400" />
                  Resume / CV
                </label>
                <div
                  className={`relative cursor-pointer group rounded-2xl border-2 border-dashed p-8 transition-all flex flex-col items-center justify-center text-center ${
                    form.cvDataUrl
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-500/5"
                      : touched.cv && errors.cv
                      ? "border-rose-400 bg-rose-50 dark:bg-rose-500/5"
                      : "border-slate-300 hover:border-sky-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={onFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {form.cvDataUrl ? (
                    <div className="space-y-2">
                      <div className="h-12 w-12 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">{form.cvFileName}</p>
                      <span className="text-xs text-slate-500">File uploaded correctly. Click to replace.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-10 w-10 mx-auto text-slate-400 group-hover:text-sky-500 transition-colors" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Click to upload your CV</p>
                        <p className="text-xs text-slate-500 mt-1">PDF, image or doc files (max 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>
                {touched.cv && errors.cv && (
                  <p className="text-xs font-bold text-rose-500 mt-1">{errors.cv}</p>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full relative h-[56px] flex items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-lg transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 dark:bg-sky-500 dark:hover:bg-sky-400"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
