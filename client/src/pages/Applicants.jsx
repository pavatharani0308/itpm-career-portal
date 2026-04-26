import { useMemo, useState } from "react";
import {
  Search,
  Download,
  Mail,
  FileText,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { usePortal, useAuth } from "../context/PortalContext";
import { downloadCsv } from "../utils/exportCsv";

const STATUS_OPTIONS = ["all", "pending", "shortlisted", "rejected", "interview"];

export default function Applicants() {
  const { state, updateApplicant } = usePortal();
  const { isSuperAdmin, companyAdminCompanyId } = useAuth();
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const jobIdsInScope = useMemo(() => {
    const jobs = isSuperAdmin
      ? state.jobs
      : state.jobs.filter((j) => j.companyId === companyAdminCompanyId);
    return new Set(jobs.map((j) => j.id));
  }, [state.jobs, isSuperAdmin, companyAdminCompanyId]);

  const rows = useMemo(() => {
    let list = state.applicants.filter((a) => jobIdsInScope.has(a.jobId));
    if (jobFilter !== "all") list = list.filter((a) => a.jobId === Number(jobFilter));
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.appliedAt).getTime();
      const db = new Date(b.appliedAt).getTime();
      if (sort === "date_asc") return da - db;
      if (sort === "date_desc") return db - da;
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [state.applicants, jobIdsInScope, jobFilter, statusFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const slice = rows.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const jobsInScope = useMemo(() => {
    return state.jobs.filter((j) => jobIdsInScope.has(j.id));
  }, [state.jobs, jobIdsInScope]);

  const exportApplicants = () => {
    const data = rows.map((a) => {
      const job = state.jobs.find((j) => j.id === a.jobId);
      const co = state.companies.find((c) => c.id === job?.companyId);
      return {
        name: a.name,
        email: a.email,
        status: a.status,
        job: job?.title || "",
        company: co?.name || "",
        appliedAt: a.appliedAt,
        notes: (a.notes || "").replace(/\n/g, " "),
      };
    });
    downloadCsv("applicants_export.csv", data);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Applicants</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Filter, review, shortlist, and export — opens in Excel as CSV.
          </p>
        </div>
        <button
          type="button"
          onClick={exportApplicants}
          className="focus-ring inline-flex items-center gap-2 self-start rounded-xl bg-[color:var(--color-sliit)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[color:var(--color-sliit-hover)] dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="glass flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="focus-ring w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 pl-10 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900/80"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={jobFilter}
            onChange={(e) => {
              setJobFilter(e.target.value);
              setPage(1);
            }}
            className="focus-ring rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/80"
          >
            <option value="all">All jobs</option>
            {jobsInScope.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="focus-ring rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/80"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="focus-ring rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/80"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {slice.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 px-6 py-16 text-center">
          <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No applicants match</p>
          <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
            Try clearing filters or post more published jobs to collect applications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slice.map((a) => {
            const job = state.jobs.find((j) => j.id === a.jobId);
            const co = state.companies.find((c) => c.id === job?.companyId);
            return (
              <div
                key={a.id}
                className="glass-subtle group flex flex-col gap-4 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg md:flex-row md:items-stretch"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{a.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        a.status === "pending"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          : a.status === "shortlisted"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : a.status === "interview"
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{a.email}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {job?.title} · {co?.name} · Applied{" "}
                    {new Date(a.appliedAt).toLocaleString()}
                  </p>
                  <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Notes
                    <textarea
                      value={a.notes}
                      onChange={(e) => updateApplicant(a.id, { notes: e.target.value })}
                      rows={2}
                      className="focus-ring mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900/80"
                    />
                  </label>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-2 md:w-48">
                  <select
                    value={a.status}
                    onChange={(e) => updateApplicant(a.id, { status: e.target.value })}
                    className="focus-ring rounded-lg border border-slate-200 bg-white/90 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/80"
                  >
                    <option value="pending">Pending</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <a
                    href={`mailto:${encodeURIComponent(a.email)}?subject=${encodeURIComponent(
                      `Regarding your application — ${job?.title || "Role"}`
                    )}&body=${encodeURIComponent(`Hi ${a.name},\n\n`)}`}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/90 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                  <button
                    type="button"
                    disabled={!a.cvDataUrl}
                    onClick={() => {
                      if (!a.cvDataUrl) return;
                      const aEl = document.createElement("a");
                      aEl.href = a.cvDataUrl;
                      aEl.download = a.cvFileName || "cv.pdf";
                      aEl.click();
                    }}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/90 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200"
                  >
                    <Download className="h-4 w-4" />
                    {a.cvDataUrl ? "Download CV" : "No CV file"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rows.length > pageSize && (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <button
            type="button"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600"
          >
            Prev
          </button>
          <span>
            Page {pageSafe} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
