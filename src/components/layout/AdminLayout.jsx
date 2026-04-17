import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, FileText, MessageSquare, AlertCircle,
  BarChart3, LogOut, Sun, Moon, Menu, X, ChevronDown, Bell, Search, GraduationCap, User
} from 'lucide-react';

const getLinks = (isSuperAdmin) => [
  { to: '/management/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/management/groups', icon: MessageSquare, label: 'Chat Groups' },
  { to: '/management/notes', icon: FileText, label: 'Notes' },
  ...(isSuperAdmin ? [{ to: '/management/users', icon: Users, label: 'Users' }] : []),
  { to: '/management/complaints', icon: AlertCircle, label: 'Complaints' },
  { to: '/management/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AdminLayout() {
  const { user, isSuperAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const managementLinks = getLinks(isSuperAdmin);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border transition-all duration-300 flex-shrink-0`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-light-border dark:border-dark-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <h1 className="text-lg font-serif font-bold text-gray-900 dark:text-white">ScholarGrid</h1>
              <p className="text-xs text-brand-500 font-semibold">{isSuperAdmin ? 'Super Admin Panel' : 'Faculty Panel'}</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {managementLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-light-border dark:border-dark-border space-y-1">
          <button onClick={toggleTheme} className="sidebar-link w-full">
            {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            {sidebarOpen && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border z-50 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-5 py-5 border-b border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-serif font-bold text-gray-900 dark:text-white">ScholarGrid</h1>
                    <p className="text-xs text-brand-500 font-semibold">{isSuperAdmin ? 'Super Admin Panel' : 'Faculty Panel'}</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {managementLinks.map(link => (
                  <NavLink key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}>
                    <link.icon className="w-5 h-5" /><span>{link.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="px-3 py-4 border-t border-light-border dark:border-dark-border space-y-1">
                <button onClick={toggleTheme} className="sidebar-link w-full">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button onClick={handleLogout} className="sidebar-link w-full text-red-500">
                  <LogOut className="w-5 h-5" /><span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => { if (window.innerWidth < 1024) setMobileOpen(true); else setSidebarOpen(!sidebarOpen); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-dark-bg rounded-xl px-4 py-2 w-72">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search users, notes, complaints..." className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 w-full" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors relative">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name || 'Admin'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-12 w-56 bg-light-surface dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-glass dark:shadow-glass-dark p-2 z-50"
                  >
                    <div className="px-3 py-2 border-b border-light-border dark:border-dark-border mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-brand-500 font-semibold">{isSuperAdmin ? 'Super Administrator' : 'Faculty Member'}</p>
                    </div>
                    <NavLink to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
                      <User className="w-4 h-4" /> Profile
                    </NavLink>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 w-full">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
