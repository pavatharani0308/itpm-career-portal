import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, FileText, Send } from "lucide-react";
import { usePortal, useAuth } from "../context/PortalContext";
import { getJobDisplayStatus, isJobAcceptingApplications } from "../data/portalStore";
import { downloadJobReportTxt } from "../utils/exportCsv";

export default function JobDetails() {
  const { id } = useParams();
  const jobId = Number(id);
  const { state, addApplicant } = usePortal();
  const { canManageCompany } = useAuth();

  const job = state.jobs.find((j) => j.id === jobId);
  const company = job ? state.companies.find((c) => c.id === job.companyId) : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [cvDataUrl, setCvDataUrl] = useState("");

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

  const disp = getJobDisplayStatus(job);
  const accepting = isJobAcceptingApplications(job);
  const reqs = (job.requirements || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const applicantCount = state.applicants.filter((a) => a.jobId === jobId).length;
  const canEdit = canManageCompany(job.companyId);

  const handleReport = () => {
    downloadJobReportTxt(job, company.name, applicantCount);
  };

  const onCv = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 900_000) {
      alert("File too large for demo (max ~900KB).");
      return;
    }
    setCvFileName(f.name);
    const r = new FileReader();
    r.onload = () => setCvDataUrl(String(r.result || ""));
    r.readAsDataURL(f);
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (!accepting) return;
    if (!name.trim() || !email.trim()) return alert("Name and email required");
    addApplicant({
      jobId,
      name: name.trim(),
      email: email.trim(),
      notes: note,
      cvFileName,
      cvDataUrl,
    });
    setName("");
    setEmail("");
    setNote("");
    setCvFileName("");
    setCvDataUrl("");
    alert("Application submitted. Admin will be notified.");
  };

  const badgeClass =
    disp.variant === "active"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : disp.variant === "draft"
        ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        : disp.variant === "expired"
          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to={`/company/${job.companyId}`}
        className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" />
        {company.name} jobs
      </Link>

      <div className="glass p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{job.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${badgeClass}`}>
                {disp.badge}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">{company.name}</span>
              {" · "}
              {job.location} · {job.type}
            </p>
            <p className="mt-1 text-xs text-slate-500">Deadline: {job.applicationDeadline}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReport}
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900/80"
            >
              <FileText className="h-4 w-4" />
              Job report
            </button>
            {canEdit && (
              <Link
                to={`/admin/job/${jobId}/edit`}
                className="focus-ring inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Admin edit
              </Link>
            )}
          </div>
        </div>

        <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-500">Requirements</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
          {reqs.length ? (
            reqs.map((r, i) => <li key={i}>{r}</li>)
          ) : (
            <li className="list-none text-slate-500">No requirements listed.</li>
          )}
        </ul>

        <div className="mt-8 border-t border-slate-200/80 pt-8 dark:border-slate-700/80">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Apply</h2>
          {accepting ? (
            <form onSubmit={handleApply} className="mt-4 space-y-3">
              <input
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="focus-ring w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-ring w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
              />
              <textarea
                placeholder="Cover note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="focus-ring w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
              />
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">CV (optional, small file for demo)</label>
                <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={onCv} className="mt-1 block w-full text-sm" />
                {cvFileName && <p className="mt-1 text-xs text-slate-500">{cvFileName}</p>}
              </div>
              <button
                type="submit"
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-sliit)] px-4 py-2.5 text-sm font-semibold text-white dark:bg-sky-600"
              >
                <Send className="h-4 w-4" />
                Submit application
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              This job is not accepting applications (draft, closed, or past deadline).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
