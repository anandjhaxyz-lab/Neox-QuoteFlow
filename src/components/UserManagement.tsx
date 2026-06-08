import React, { useState, useEffect } from 'react';
import { localApi } from '../services/localApi';
import { Users, UserCheck, UserMinus, Clock, Calendar, Trash2, Search, Plus, ExternalLink, RefreshCw, X, Share2, ClipboardCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface AppUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'sales';
  status: 'pending' | 'active' | 'suspended' | 'expired';
  expiryDate: string | null;
  companyId: string | null;
  createdAt: string;
  isPlaceholder?: boolean;
}

interface UserManagementProps {
  userRole: 'super_admin' | 'admin' | 'sales';
  companyId: string | null;
  plan?: 'free' | 'basic' | 'pro' | 'enterprise';
  companyName?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ userRole, companyId, plan = 'free', companyName = 'QuoteFlow' }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    displayName: '',
    role: 'sales' as 'admin' | 'sales',
    companyId: ''
  });

  const loadUsers = async () => {
    if (!userRole) return;
    setLoading(true);
    try {
      const data = await localApi.getUsers(companyId || 'SUPER');
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      setErrorMsg('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    localApi.getCurrentUser().then(setCurrentUser);
  }, [userRole, companyId]);

  const openAddModal = () => {
    setNewUser({
      username: '',
      password: 'password123',
      email: '',
      displayName: '',
      role: 'sales',
      companyId: (userRole === 'super_admin' && companyId && companyId !== 'SUPER') ? companyId : (companyId || '')
    });
    setShowAddModal(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setErrorMsg(null);
    try {
      const targetCompanyId = userRole === 'super_admin' ? newUser.companyId : companyId;
      await localApi.signup({
        ...newUser,
        companyId: targetCompanyId,
        status: 'active'
      });
      await loadUsers();
      setShowAddModal(false);
      setSuccessMsg('User added successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<AppUser>) => {
    setErrorMsg(null);
    try {
      await localApi.updateUser(userId, updates);
      await loadUsers();
      setSuccessMsg(`User updated successfully`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      setErrorMsg('Failed to update user');
    }
  };

  const copyInvite = (user: AppUser) => {
    const appUrl = window.location.origin;
    const message = `Hi ${user.displayName || user.username}, \n\nWelcome to QuoteFlow! You can access our quotation system at:\n${appUrl}\n\nYour login details are:\nUsername: ${user.username}\nEmail: ${user.email || 'N/A'}\n\nPlease login and change your password from the 'My Profile' section.\n\nHappy Quotation Making!`;
    
    navigator.clipboard.writeText(message);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteUser = (id: string) => {
    setUserToDelete(id);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setErrorMsg(null);
    setIsDeleting(true);
    try {
      await localApi.deleteUser(userToDelete);
      await loadUsers();
      setSuccessMsg('User deleted successfully');
      setUserToDelete(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      setErrorMsg('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const nameMatch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const usernameMatch = u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return emailMatch || nameMatch || usernameMatch;
  });

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (userRole !== 'super_admin' && !companyId) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Users className="h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">No Company Assigned</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Your account is not yet assigned to a company. Please contact the Super Admin to assign you to a business.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            {userRole === 'super_admin' ? 'Global User Management' : 'My Team Management'}
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            {userRole === 'super_admin' ? 'Manage all local users across the platform.' : 'Manage access for your sales team.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {successMsg && (
            <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-bold border border-green-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <UserCheck className="h-4 w-4" />
              {successMsg}
            </div>
          )}
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            {userRole === 'super_admin' ? 'Add Platform User' : 'Add Team Member'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-bold">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Global Controls & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
        </div>
        
        <div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Active Users</p>
            <h3 className="text-2xl font-black text-gray-900">{users.filter(u => u.status === 'active').length}</h3>
          </div>
          <div className="h-10 w-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Access Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Company Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Created At</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-10 w-10 text-gray-200" />
                      <p className="text-gray-500 font-medium">No users found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner group-hover:bg-blue-100 transition-colors">
                          {(u.displayName || u.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {u.displayName || u.username}
                            {u.isPlaceholder && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded uppercase tracking-tighter">Invite Sent</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 font-medium">{u.email || u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUser(u.id, { role: e.target.value as any })}
                        disabled={u.id === currentUser?.id}
                        className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-600 cursor-pointer disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="sales">Sales Team</option>
                        {userRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("h-1.5 w-1.5 rounded-full", 
                            u.status === 'active' ? "bg-green-500" : 
                            u.status === 'suspended' ? "bg-red-500" : "bg-orange-500"
                          )}></div>
                          <select
                            value={u.status}
                            onChange={(e) => handleUpdateUser(u.id, { status: e.target.value as any })}
                            className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-600 cursor-pointer"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="pending">Pending</option>
                          </select>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 pl-3">
                          {u.companyId || 'NONE'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Calendar className="h-3 w-3" />
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyInvite(u)}
                          className={cn(
                            "p-2 rounded-xl transition-all flex items-center gap-1",
                            copiedId === u.id ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          )}
                          title="Copy Invite Message"
                        >
                          {copiedId === u.id ? <ClipboardCheck className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                          {copiedId === u.id && <span className="text-[10px] font-bold">Copied</span>}
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete User"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
                  <p className="text-xs text-gray-500 font-medium">Create a new local account.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Username</label>
                  <input
                    required
                    type="text"
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    placeholder="john.doe"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                  <input
                    required
                    type="text"
                    value={newUser.displayName}
                    onChange={e => setNewUser({...newUser, displayName: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input
                  required
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
                  >
                    <option value="sales">Sales Team</option>
                    <option value="admin">Admin</option>
                    {userRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Company ID</label>
                  <input
                    required={userRole === 'super_admin'}
                    disabled={userRole !== 'super_admin'}
                    type="text"
                    value={newUser.companyId}
                    onChange={e => setNewUser({...newUser, companyId: e.target.value})}
                    placeholder="ACME-123"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-red-50 text-center">
            <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User Account?</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium">
              Are you sure? This action will permanently remove this user and they will no longer be able to log in.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-2xl transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
