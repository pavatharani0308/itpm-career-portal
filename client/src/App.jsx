import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PortalProvider } from './context/PortalContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';

import LandingPage from './pages/LandingPage';
import CompanyDashboard from './pages/company/CompanyDashboard';
import CompanyProfilePage from './pages/company/CompanyProfile';
import CompanyDocuments from './pages/company/CompanyDocuments';
import AdminDashboard from './pages/admin/AdminDashboard';
import PendingApprovals from './pages/admin/PendingApprovals';
import CompanyReview from './pages/admin/CompanyReview';
import ManageCompanies from './pages/admin/ManageCompanies';
import ManageUsers from './pages/admin/ManageUsers';
import CompanyDirectory from './pages/user/CompanyDirectory';
import CompanyDetails from './pages/user/CompanyDetails';
import ChatPage from './pages/user/ChatPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CompanyAnalytics from './components/CompanyAnalytics';
import JobSeekDashboard from './components/StudentDashboard';

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Feed from './pages/Feed';

import ClientJobPortal from './pages/ClientJobPortal';
import JobApplication from './pages/JobApplication';
import CompanyJobs from './pages/CompanyJobs';
import NewJob from './pages/NewJob';
import JobDetails from './pages/JobDetails';
import AdminEditJob from './pages/AdminEditJob';
import Applicants from './pages/Applicants';
import Notifications from './pages/Notifications';
import CompanyJobManage from './pages/CompanyjobManage';
import AddJob from './pages/AddJob';
import CompanyJobDetails from './pages/CompanyJobDetails';
import JobList from './pages/JobList';

/* ---------------- Layout Component for Social Feed ---------------- */
function SocialLayout({ darkMode, toggleDark }) {
  return (
    <>
      <Navbar darkMode={darkMode} toggleDark={toggleDark} />
      <main className="flex-1">
        <Outlet />
      </main>
    </>
  );
}

/* ---------------- Main App Component ---------------- */
export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const toggleDark = () => setDarkMode((prev) => !prev);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <PortalProvider>
          <AuthProvider>
            <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300 flex flex-col">
              <Navbar />
              <Routes>
                {/* ---------------- Public Routes ---------------- */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Job Portal Public Routes */}
                <Route path="/job-portal" element={<ClientLayout />}>
                  <Route index element={<ClientJobPortal />} />
                  <Route path="apply/:jobId" element={<JobApplication />} />
                </Route>

                {/* Company Directory (Public) */}
                <Route path="/directory" element={<CompanyDirectory />} />
                <Route path="/company/:id" element={<CompanyDetails />} />
                <Route path="/jobseekerdashboard" element={<JobSeekDashboard />} />
                <Route path="/student/jobs" element={
                  <ProtectedRoute roles={['user']}>
                    <JobList />
                  </ProtectedRoute>
                } />

                {/* ---------------- Social Feed Layout with Navbar ---------------- */}
                <Route element={<SocialLayout darkMode={darkMode} toggleDark={toggleDark} />}>
                  
                  {/* Protected Routes for Social Feed */}
                  <Route path="/profile" element={
                    <ProtectedRoute roles={['company', 'user', 'admin']}>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute roles={['company', 'user', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/edit-profile" element={
                    <ProtectedRoute roles={['company', 'user', 'admin']}>
                      <EditProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/feed" element={
                    <ProtectedRoute roles={['company', 'user', 'admin']}>
                      <Feed />
                    </ProtectedRoute>
                  } />

                  {/* Company Routes from Student Career App */}
                  <Route path="/companydashboard" element={
                    <ProtectedRoute roles={['company']}>
                      <CompanyDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/company/profile" element={
                    <ProtectedRoute roles={['company']}>
                      <CompanyProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/company/documents" element={
                    <ProtectedRoute roles={['company']}>
                      <CompanyDocuments />
                    </ProtectedRoute>
                  } />
                  <Route path="/company" element={
                    <ProtectedRoute roles={['company']}>
                      <CompanyAnalytics />
                    </ProtectedRoute>
                  } />
                  <Route path="/company/new-job" element={
                    <ProtectedRoute roles={['company']}>
                      <AddJob />
                    </ProtectedRoute>
                  } />
                  <Route path="/company/jobs" element={
                    <ProtectedRoute roles={['company']}>
                      <CompanyJobManage />
                    </ProtectedRoute>
                  } />
                  <Route path="/company/job/:id" element={
                    <ProtectedRoute roles={['company']}>
                      <CompanyJobDetails />
                    </ProtectedRoute>
                  } />

                  {/* Admin Routes from Student Career App */}
                  <Route path="/admin" element={
                    <ProtectedRoute roles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/approvals" element={
                    <ProtectedRoute roles={['admin']}>
                      <PendingApprovals />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/companies" element={
                    <ProtectedRoute roles={['admin']}>
                      <ManageCompanies />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/companies/:id" element={
                    <ProtectedRoute roles={['admin']}>
                      <CompanyReview />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute roles={['admin']}>
                      <ManageUsers />
                    </ProtectedRoute>
                  } />
                  

                  {/* Job Portal Admin Routes - Fixed routing structure */}
                  <Route element={<ProtectedRoute roles={['company', 'admin']} />}>
                    {/* Company Jobs routes */}
                    <Route path="/admin/company/:id" element={<CompanyJobs />} />
                    <Route path="/admin/company/:id/new" element={<NewJob />} />
                    
                    {/* Job routes */}
                    <Route path="/admin/job/:id" element={<JobDetails />} />
                    <Route path="/admin/job/:id/edit" element={<AdminEditJob />} />
                    
                    {/* Other admin routes */}
                    <Route path="/admin/applicants" element={<Applicants />} />
                    <Route path="/admin/notifications" element={<Notifications />} />
                  </Route>

                  {/* Chat Routes (All authenticated users) */}
                  <Route path="/chat" element={
                    <ProtectedRoute roles={['user', 'company', 'admin']}>
                      <ChatPage />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* ---------------- 404 Page ---------------- */}
                <Route path="*" element={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg mb-6">
                      Page not found
                    </p>
                    <a href="/" className="text-indigo-600 font-medium hover:underline">
                      Go to Home
                    </a>
                  </div>
                } />
              </Routes>

              {/* ---------------- Toaster Configuration ---------------- */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: darkMode ? "var(--color-surface-card)" : "#fff",
                    color: darkMode ? "var(--color-text-primary)" : "#0f172a",
                    border: `1px solid ${darkMode ? "var(--color-border)" : "#e2e8f0"}`,
                    borderRadius: "12px",
                    fontSize: "14px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  },
                  success: {
                    iconTheme: { primary: "#10b981", secondary: "#fff" },
                    duration: 3000,
                  },
                  error: {
                    iconTheme: { primary: "#ef4444", secondary: "#fff" },
                    duration: 4000,
                  },
                }}
              />
            </div>
          </AuthProvider>
        </PortalProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}