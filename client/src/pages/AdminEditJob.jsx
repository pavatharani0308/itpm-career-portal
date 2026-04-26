import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { usePortal, useAuth } from "../context/PortalContext";
import { downloadJobReportTxt } from "../utils/exportCsv";

export default function AdminEditJob() {
  const { id } = useParams();
  const jobId = Number(id);
  const nav = useNavigate();
  const { state, updateJob } = usePortal();
  const { canManageCompany } = useAuth();

  const job = state.jobs.find((j) => j.id === jobId);
  const company = job ? state.companies.find((c) => c.id === job.companyId) : null;

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Internship");
  const [deadline, setDeadline] = useState("");
  const [requirements, setRequirements] = useState("");
  const [status, setStatus] = useState("published");

  useEffect(() => {
    if (!job) return;
    setTitle(job.title);
    setLocation(job.location || "");
    setType(job.type);
    setDeadline(job.applicationDeadline || "");
    setRequirements(job.requirements || "");
    setStatus(job.status);
  }, [job]);

  if (!job || !company) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Job not found.
        <Link to="/admin/companies" className="mt-4 block font-semibold text-[color:var(--color-sliit)] dark:text-sky-400">
          Return to companies
        </Link>
      </div>
    );
  }

  if (!canManageCompany(job.companyId)) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-sm text-slate-600 dark:text-slate-400">
        You can&apos;t edit this job.
        <Link to={`/company/${job.companyId}`} className="mt-4 block font-semibold text-[color:var(--color-sliit)] dark:text-sky-400">
          Back
        </Link>
      </div>
    );
  }

  const applicantCount = state.applicants.filter((a) => a.jobId === jobId).length;

  const handleSave = (e) => {
    e.preventDefault();
    let closedReason = job.closedReason;
    if (status === "draft" || status === "published") {
      closedReason = null;
    } else if (status === "closed" && job.status !== "closed") {
      closedReason = null;
    }
    updateJob(jobId, {
      title: title.trim(),
      location: location.trim(),
      type,
      applicationDeadline: deadline,
      requirements,
      status,
      closedReason,
    });
    nav(`/company/${job.companyId}`);
  };

  const handleReport = () => {
    downloadJobReportTxt(
      { ...job, title, location, type, applicationDeadline: deadline, requirements, status },
      company.name,
      applicantCount
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to={`/job/${jobId}`}
        className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Job details
      </Link>

      <div className="glass p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Edit job</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {company.name} · ID {jobId}
            </p>
          </div>
          <button
            type="button"
            onClick={handleReport}
            className="focus-ring inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900/80"
          >
            <FileText className="h-4 w-4" />
            Download job report
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Company</label>
            <input
              value={company.name}
              disabled
              className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/80"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
              >
                <option>Internship</option>
                <option>Full Time</option>
                <option>Part Time</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Deadline</label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Workflow status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Requirements</label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={6}
              className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Link
              to={`/job/${jobId}`}
              className="focus-ring rounded-xl border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-600"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleReport}
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium dark:border-slate-600"
            >
              <Download className="h-4 w-4" />
              Report .txt
            </button>
            <button
              type="submit"
              className="focus-ring rounded-xl bg-[color:var(--color-sliit)] px-4 py-2.5 text-sm font-semibold text-white dark:bg-sky-600"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
