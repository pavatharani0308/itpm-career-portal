import { useMemo, useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Link } from "react-router-dom";
import { Search, MapPin, Building2, Briefcase, ExternalLink, Filter } from "lucide-react";

export default function ClientJobPortal() {
  const { state } = usePortal();
  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter] = useState("all");
  const [compFilter, setCompFilter] = useState("all");

  const publishedJobs = useMemo(() => {
    return state.jobs.filter((j) => j.status === "published");
  }, [state.jobs]);

  const filteredJobs = useMemo(() => {
    return publishedJobs.filter((j) => {
      const q = search.toLowerCase();
      const comp = state.companies.find((c) => c.id === j.companyId);
      const matchesSearch =
        j.title.toLowerCase().includes(q) ||
        (comp?.name || "").toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q);
      const matchesLoc = locFilter === "all" || j.location === locFilter;
      const matchesComp = compFilter === "all" || j.companyId === Number(compFilter);
      return matchesSearch && matchesLoc && matchesComp;
    });
  }, [publishedJobs, search, locFilter, compFilter, state.companies]);

  const locations = useMemo(() => {
    const set = new Set(publishedJobs.map((j) => j.location).filter(Boolean));
    return Array.from(set).sort();
  }, [publishedJobs]);

  const activeCompanies = useMemo(() => {
    const compIds = new Set(publishedJobs.map((j) => j.companyId));
    return state.companies.filter((c) => compIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [publishedJobs, state.companies]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-12 pb-24">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
          Find Your <span className="text-sky-500">Dream Career</span> Today
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400">
          Discover incredible opportunities from leading organizations in Sri Lanka.
          Join the next generation of professionals.
        </p>

        {/* Search Bar */}
        <div className="glass mt-12 p-2 sm:p-4 rounded-3xl flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto shadow-2xl transition-all hover:shadow-sky-500/10 dark:hover:shadow-sky-500/5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search job title, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 px-12 py-3 text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => setSearch(search)}
            className="rounded-2xl bg-slate-900 py-3 px-8 text-white font-bold transition hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Search
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="glass p-6 sticky top-28 space-y-8">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400">LOCATION</label>
              <select
                value={locFilter}
                onChange={(e) => setLocFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800/50"
              >
                <option value="all">All Locations</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400">COMPANY</label>
              <select
                value={compFilter}
                onChange={(e) => setCompFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800/50"
              >
                <option value="all">All Companies</option>
                {activeCompanies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Jobs List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {filteredJobs.length} {filteredJobs.length === 1 ? "Opportunity" : "Opportunities"} Available
            </h2>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="glass p-12 text-center space-y-4">
              <Briefcase className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-slate-500">No jobs match your criteria.</p>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const comp = state.companies.find((c) => c.id === job.companyId);
              return (
                <div
                  key={job.id}
                  className="glass group p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 transition-all hover:scale-[1.01] hover:bg-white/90 dark:hover:bg-slate-800/80"
                >
                  <div className="h-16 w-16 shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                    {comp?.logoUrl ? (
                      <img src={comp.logoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="h-8 w-8 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                      {job.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <Building2 className="h-4 w-4" />
                        {comp?.name || "Unknown Company"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" />
                        {job.type}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/apply/${job.id}`}
                    className="mt-4 sm:mt-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400"
                  >
                    Apply Now
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
