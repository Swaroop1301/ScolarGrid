import { fetchAllUsers, warnUser, banUser, changeUserRole, fetchFacultyCodes, generateFacultyCode, deleteFacultyCode } from '../../services/usersService';
import { awardPoints } from '../../services/leaderboardService';
import { fetchAllGroups, addUserToGroup } from '../../services/groupsService';
import { Search, Ban, AlertTriangle, Key, Shield, User, Plus, Trash2, ChevronDown, Award, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function UsersPage() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [groups, setGroups] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [addingToGroup, setAddingToGroup] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, codesData, groupsData] = await Promise.all([
        fetchAllUsers(),
        isSuperAdmin ? fetchFacultyCodes() : Promise.resolve([]),
        fetchAllGroups()
      ]);
      setUsers(usersData);
      if (isSuperAdmin) setCodes(codesData);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isSuperAdmin]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleWarn = async (id) => {
    try {
      await warnUser(id);
      setUsers(users.map(u => u.id === id ? { ...u, warnings: (u.warnings || 0) + 1, status: 'Warned' } : u));
    } catch (err) {
      console.error('Warn error:', err);
      alert('Failed to warn user: ' + err.message);
    }
  };

  const handleToggleBan = async (id) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    const newBanned = u.status !== 'Banned';
    try {
      await banUser(id, newBanned);
      setUsers(users.map(x => x.id === id ? { ...x, is_banned: newBanned, status: newBanned ? 'Banned' : 'Active' } : x));
    } catch (err) {
      console.error('Ban error:', err);
      alert('Failed to update ban status: ' + err.message);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await changeUserRole(id, newRole);
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Role change error:', err);
      alert('Failed to update role: ' + err.message);
    }
  };

  const handleGenerateCode = async () => {
    try {
      const newCode = await generateFacultyCode();
      setCodes([newCode, ...codes]);
    } catch (err) {
      console.error('Generate code error:', err);
      alert('Failed to generate code: ' + err.message);
    }
  };

  const handleDeleteCode = async (id) => {
    try {
      await deleteFacultyCode(id);
      setCodes(codes.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete code error:', err);
      alert('Failed to delete code: ' + err.message);
    }
  };

  const handleUpdatePoints = async (id, currentScore) => {
    const amountStr = prompt('Enter points to add (or negative to deduct):');
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount)) return alert('Invalid amount');
    const reason = prompt('Reason for point adjustment:');
    if (!reason) return;

    try {
      await awardPoints(id, amount, reason);
      setUsers(users.map(u => u.id === id ? { ...u, score: (u.score || 0) + amount } : u));
    } catch (err) {
      console.error('Update points error:', err);
      alert('Failed to update points: ' + err.message);
    }
  };

  const handleAddToGroup = async () => {
    if (!selectedUser || !selectedGroup) return;
    setAddingToGroup(true);
    try {
      await addUserToGroup(selectedGroup, selectedUser.id);
      alert(`Successfully added ${selectedUser.name} to the group!`);
      setShowGroupModal(false);
      setSelectedGroup('');
    } catch (err) {
      console.error('Add to group error:', err);
      alert('Failed to add user to group: ' + (err.response?.data?.error || err.message));
    } finally {
      setAddingToGroup(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-100 dark:bg-dark-surface animate-pulse" />
        <div className="h-12 rounded-2xl bg-gray-100 dark:bg-dark-surface animate-pulse" />
        {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-dark-surface animate-pulse" />)}
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex justify-between items-end">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage accounts, permissions, and faculty codes</p>
        </div>
        {isSuperAdmin && activeTab === 'faculty-codes' && (
          <button onClick={handleGenerateCode} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Generate Code
          </button>
        )}
      </motion.div>

      {isSuperAdmin && (
        <motion.div variants={item} className="flex gap-4 border-b border-gray-200 dark:border-dark-border">
          <button onClick={() => setActiveTab('users')} className={`pb-2 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'users' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            All Users
          </button>
          <button onClick={() => setActiveTab('faculty-codes')} className={`pb-2 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'faculty-codes' ? 'border-gold-500 text-gold-600 dark:text-gold-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            Faculty Codes
          </button>
        </motion.div>
      )}

      {activeTab === 'users' ? (
        <>
          <motion.div variants={item} className="glass-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="input-field pl-10" />
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card overflow-hidden">
            <div className="table-header px-6 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span className="col-span-3">User</span>
              <span className="col-span-2 hidden sm:block">Role</span>
              <span className="col-span-2 hidden sm:block">Tier</span>
              <span className="col-span-1 hidden sm:block text-center">Score</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
            {filtered.map(u => (
              <div key={u.id} className={`table-row px-6 py-3 grid grid-cols-12 gap-4 items-center ${u.status === 'Banned' ? 'opacity-60' : ''}`}>
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-premium flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{u.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                </div>
                <span className="col-span-2 hidden sm:block">
                  {isSuperAdmin ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-xs rounded-lg px-2 py-1 outline-none focus:border-brand-500"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  ) : (
                    <span className="badge-purple text-xs">{u.role}</span>
                  )}
                </span>
                <span className="col-span-2 hidden sm:block"><span className="badge-gold text-xs">{u.tier || 'Bronze'}</span></span>
                <span className="col-span-1 hidden sm:block text-center text-sm font-bold text-gray-700 dark:text-gray-300">{u.score || 0}</span>
                <span className="col-span-2">
                  <span className={`badge text-xs ${u.status === 'Active' ? 'badge-green' : u.status === 'Warned' ? 'badge-gold' : 'badge-red'}`}>{u.status}</span>
                </span>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button onClick={() => { setSelectedUser(u); setShowGroupModal(true); }} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-gray-400 hover:text-emerald-500" title="Add to Group"><Plus className="w-4 h-4" /></button>
                  <button onClick={() => handleUpdatePoints(u.id, u.score)} className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/10 text-gray-400 hover:text-brand-500" title="Award Points"><Award className="w-4 h-4" /></button>
                  <button onClick={() => handleWarn(u.id)} className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 text-gray-400 hover:text-orange-500" title="Warn"><AlertTriangle className="w-4 h-4" /></button>
                  <button onClick={() => handleToggleBan(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500" title={u.status === 'Banned' ? 'Unban' : 'Ban'}><Ban className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </motion.div>
        </>
      ) : (
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="table-header px-6 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span className="col-span-5">Code</span>
            <span className="col-span-3">Status</span>
            <span className="col-span-3">Created At</span>
            <span className="col-span-1 text-right">Actions</span>
          </div>
          {codes.length === 0 && (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No faculty codes generated yet</p>
            </div>
          )}
          {codes.map(c => (
            <div key={c.id} className="table-row px-6 py-4 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-5 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                {c.code}
              </div>
              <div className="col-span-3">
                {c.is_used ? (
                  <span className="badge-red text-xs">Used</span>
                ) : (
                  <span className="badge-green text-xs">Available</span>
                )}
              </div>
              <div className="col-span-3 text-sm text-gray-500">
                {new Date(c.created_at).toLocaleDateString()}
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => handleDeleteCode(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
      {/* Group Assignment Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGroupModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-light-surface dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white">Add to Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-dark-bg rounded-xl">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser?.name}</p>
                <p className="text-xs text-gray-400">{selectedUser?.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Group</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="input-field"
                >
                  <option value="">Choose a group...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowGroupModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleAddToGroup}
                  disabled={addingToGroup || !selectedGroup}
                  className="btn-primary flex-1"
                >
                  {addingToGroup ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
