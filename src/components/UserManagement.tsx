import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, where, setDoc, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Users, UserCheck, UserMinus, Clock, Calendar, Trash2, Search, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface AppUser {
  id: string;
  email: string;
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
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'sales' as 'admin' | 'sales',
    companyId: ''
  });

  useEffect(() => {
    console.log('UserManagement useEffect:', { userRole, companyId });
    if (!userRole) {
      setLoading(false);
      return;
    }
    
    let q;
    if (companyId === 'SUPER') {
      q = query(collection(db, 'users'));
    } else if (companyId) {
      // For admins, show only their own company members (security rules block global query)
      q = query(collection(db, 'users'), where('companyId', '==', companyId));
    } else {
      console.warn('UserManagement: No companyId for non-super_admin');
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('UserManagement snapshot received:', snapshot.size, 'users');
      const debugEmails = snapshot.docs.map(d => ({ 
        id: d.id, 
        email: d.data().email, 
        displayName: d.data().displayName,
        status: d.data().status 
      }));
      console.log('Users in snapshot details:', debugEmails);
      
      let allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppUser[];
      
      // If not super admin, filter manually to include users in this company OR pending users with matching email
      if (companyId !== 'SUPER') {
        allUsers = allUsers.filter(u => u.companyId === companyId || u.status === 'pending');
      }

      // Filter out duplicates (prefer real users over invitations if both exist)
      const uniqueUsersMap = new Map<string, AppUser>();
      allUsers.forEach(u => {
        // Safety: If email is missing, use ID as fallback for uniqueness
        const emailLower = (u.email || u.id).toLowerCase();
        const existing = uniqueUsersMap.get(emailLower);
        if (!existing || (existing.isPlaceholder && !u.isPlaceholder)) {
          uniqueUsersMap.set(emailLower, u);
        }
      });
      
      const finalUsers = Array.from(uniqueUsersMap.values());
      console.log('Final unique users list:', finalUsers.map(u => u.email || u.id));
      setUsers(finalUsers);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users in UserManagement:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [userRole, companyId, showAllCompanies]);

  const [lastInvitedLink, setLastInvitedLink] = useState<string | null>(null);

  const openAddModal = () => {
    setNewUser({
      email: '',
      displayName: '',
      role: 'sales',
      companyId: (userRole === 'super_admin' && companyId && companyId !== 'SUPER') ? companyId : ''
    });
    setLastInvitedLink(null);
    setShowAddModal(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userRole !== 'super_admin' && (!companyId || companyId === 'NONE')) {
      setErrorMsg('Error: You must be assigned to a company before you can add team members. Please contact the Super Admin.');
      return;
    }

    // Check plan limits
    const userLimit = plan === 'free' ? 1 : plan === 'basic' ? 3 : plan === 'pro' ? 10 : Infinity;
    if (userRole !== 'super_admin' && users.length >= userLimit) {
      setErrorMsg(`User limit reached for ${plan.toUpperCase()} plan (${userLimit} users). Please upgrade to add more.`);
      return;
    }

    setAdding(true);
    try {
      const targetCompanyId = userRole === 'super_admin' ? newUser.companyId : companyId;
      
      const trimmedEmail = newUser.email.trim().toLowerCase();
      const placeholderId = `invitation_${trimmedEmail}`;
      
      await setDoc(doc(db, 'users', placeholderId), {
        email: trimmedEmail,
        displayName: newUser.displayName.trim(),
        role: newUser.role,
        status: 'active',
        companyId: targetCompanyId,
        createdAt: new Date().toISOString(),
        isPlaceholder: true
      });

      // Send invitation email with unique company link
      const inviteLink = `${window.location.origin}?mode=signup&compId=${targetCompanyId}`;
      setLastInvitedLink(inviteLink);
      
      try {
        const response = await fetch('/api/send-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmedEmail,
            companyName: companyName,
            role: newUser.role,
            inviteLink: inviteLink
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error('Invitation API error:', errData);
          setSuccessMsg(`User added! Copy the invite link to send it manually.`);
        }
      } catch (emailErr) {
        console.error('Network error sending invitation email:', emailErr);
        setSuccessMsg('User added! Copy the invite link below to send it manually.');
      }

      setShowAddModal(false);
      setNewUser({ email: '', displayName: '', role: 'sales', companyId: '' });
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user. Please check permissions.');
    } finally {
      setAdding(false);
    }
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateUser = async (userId: string, updates: Partial<AppUser>) => {
    setErrorMsg(null);
    try {
      // If Super Admin is changing companyId, move the entire team if the user is an admin
      if (userRole === 'super_admin' && updates.companyId !== undefined) {
        const userToUpdate = users.find(u => u.id === userId);
        const oldCompId = userToUpdate?.companyId;

        if (oldCompId && oldCompId !== 'NONE' && oldCompId !== updates.companyId && userToUpdate?.role === 'admin') {
          if (window.confirm(`Moving this Admin to a new Company ID (${updates.companyId}). Do you want to move their entire team of ${users.filter(u => u.companyId === oldCompId).length} users as well?`)) {
            const teamQuery = query(collection(db, 'users'), where('companyId', '==', oldCompId));
            const teamSnapshot = await getDocs(teamQuery);
            const batch = writeBatch(db);
            
            teamSnapshot.docs.forEach((uDoc) => {
              if (uDoc.id !== userId) { // Main user updated separately or below
                batch.update(uDoc.ref, { companyId: updates.companyId });
              }
            });
            await batch.commit();
          }
        }
      }

      await updateDoc(doc(db, 'users', userId), updates);
      setSuccessMsg(`User ${updates.companyId ? 'moved' : 'updated'} successfully`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error('Error updating user:', error);
      const errInfo = {
        error: error.message || String(error),
        operationType: 'update',
        path: `users/${userId}`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          role: userRole,
          companyId: companyId
        }
      };
      console.error('Firestore Error Info:', JSON.stringify(errInfo));
      setErrorMsg('Failed to update user: ' + (error.message || 'Permission denied'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setErrorMsg(null);
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setSuccessMsg('User deleted successfully');
      setUserToDelete(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setErrorMsg('Failed to delete user: ' + (error.message || 'Permission denied'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const nameMatch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return emailMatch || nameMatch;
  });

  const [manualEmail, setManualEmail] = useState('');
  const [activatingManual, setActivatingManual] = useState(false);

  const handleManualActivate = async () => {
    if (!manualEmail.trim()) return;
    setActivatingManual(true);
    setErrorMsg(null);
    try {
      const trimmedEmail = manualEmail.trim().toLowerCase();
      const q = query(collection(db, 'users'), where('email', '==', trimmedEmail));
      const querySnapshot = await getDocs(q);
      
      let userDocRef;
      let isCreatingPlaceholder = false;

      if (!querySnapshot.empty) {
        // User exists, update their record
        userDocRef = doc(db, 'users', querySnapshot.docs[0].id);
      } else {
        // User doesn't exist, check for invitation doc or create one
        const invitationId = `invitation_${trimmedEmail}`;
        userDocRef = doc(db, 'users', invitationId);
        isCreatingPlaceholder = true;
      }

      await setDoc(userDocRef, {
        email: trimmedEmail,
        status: 'active',
        companyId: companyId === 'SUPER' ? 'NONE' : companyId,
        role: 'admin', // Default to admin for force activation
        updatedAt: new Date().toISOString(),
        ...(isCreatingPlaceholder ? {
          displayName: trimmedEmail.split('@')[0],
          createdAt: new Date().toISOString(),
          isPlaceholder: true
        } : {})
      }, { merge: true });

      setSuccessMsg(isCreatingPlaceholder ? `Invitation created for ${trimmedEmail}` : `User ${trimmedEmail} activated successfully!`);
      setManualEmail('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Manual activation error:', err);
      setErrorMsg('Activation failed: ' + (err.message || 'Permission denied'));
    } finally {
      setActivatingManual(false);
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {userRole === 'super_admin' ? 'Global User Management' : 'My Team Management'}
          </h1>
          <p className="text-gray-500 mt-1">
            {userRole === 'super_admin' ? 'Manage all users across all companies.' : 'Manage access for your sales team.'}
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
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus className="h-5 w-5" />
            {userRole === 'super_admin' ? 'Add New User' : 'Add Team Member'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <Plus className="h-5 w-5 rotate-45" />
          </button>
        </div>
      )}

      {/* Invite Link Section for Admins */}
      {userRole === 'admin' && companyId && companyId !== 'NONE' && (
        <div className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white mb-8 border-b-4 border-blue-800">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/40 shadow-inner">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold leading-none">Team Invite Link</h3>
                <p className="text-blue-100 text-sm font-medium opacity-90">
                  Share this link with your team members to join <span className="font-bold underline">{companyName}</span>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 lg:min-w-[400px] bg-blue-900/30 backdrop-blur-sm border border-blue-400/40 rounded-xl px-4 py-3 text-sm font-mono text-white truncate shadow-inner">
                {`${window.location.origin}?mode=signup&compId=${companyId}`}
              </div>
              <button
                onClick={() => {
                  const link = `${window.location.origin}?mode=signup&compId=${companyId}`;
                  navigator.clipboard.writeText(link);
                  setSuccessMsg('Team link copied!');
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="bg-white text-blue-600 px-5 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-xl active:scale-95 flex items-center gap-2 shrink-0"
              >
                <ExternalLink className="h-5 w-5" />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {userRole === 'super_admin' && (
        <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Manual User Activation (Super Admin Only)</label>
            <input
              type="email"
              placeholder="Enter user email to force activate..."
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 items-end">
            <button
              onClick={handleManualActivate}
              disabled={activatingManual || !manualEmail}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {activatingManual ? 'Activating...' : 'Force Activate User'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-gray-400 hover:text-blue-600 transition-all"
              title="Refresh List"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
              {userRole === 'super_admin' && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Company ID</th>}
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Expiry</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      {u.displayName ? u.displayName[0].toUpperCase() : (u.email ? u.email[0].toUpperCase() : '?')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{u.displayName}</p>
                        {(u as any).isPlaceholder && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-purple-100">
                            Invited
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1">UID: {u.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    disabled={u.email === auth.currentUser?.email}
                    onChange={(e) => handleUpdateUser(u.id, { role: e.target.value as any })}
                    className="text-sm border-none bg-transparent focus:ring-0 font-medium text-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {userRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    <option value="admin">Admin</option>
                    <option value="sales">Sales</option>
                  </select>
                </td>
                {userRole === 'super_admin' && (
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      defaultValue={u.companyId || ''}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateUser(u.id, { companyId: e.currentTarget.value });
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== (u.companyId || '')) {
                          handleUpdateUser(u.id, { companyId: e.target.value });
                        }
                      }}
                      placeholder="Assign Company ID"
                      className="text-xs font-mono bg-gray-50 border border-gray-100 rounded px-2 py-1 w-24 focus:ring-1 focus:ring-blue-500 outline-none transition-all focus:bg-white focus:border-blue-200"
                    />
                  </td>
                )}
                <td className="px-6 py-4">
                  {u.isPlaceholder ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100 w-fit">
                        Invitation Sent
                      </span>
                      <button 
                        onClick={() => {
                          const link = `${window.location.origin}?mode=signup&compId=${u.companyId}`;
                          navigator.clipboard.writeText(link);
                          setSuccessMsg('Join link copied!');
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="text-[10px] text-purple-500 hover:text-purple-700 font-medium underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Copy Join Link
                      </button>
                    </div>
                  ) : (
                    <select
                      value={u.status}
                      disabled={u.email === auth.currentUser?.email}
                      onChange={(e) => handleUpdateUser(u.id, { status: e.target.value as any })}
                      className={cn(
                        "text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                        u.status === 'active' ? "bg-green-50 text-green-600" :
                        u.status === 'pending' ? "bg-yellow-50 text-yellow-600" :
                        u.status === 'suspended' ? "bg-red-50 text-red-600" :
                        "bg-gray-50 text-gray-600"
                      )}
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                    </select>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={u.expiryDate ? u.expiryDate.split('T')[0] : ''}
                      onChange={(e) => handleUpdateUser(u.id, { expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="text-xs border-none bg-transparent focus:ring-0 text-gray-600 cursor-pointer"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {u.email !== auth.currentUser?.email && (
                      <>
                        {(u as any).isPlaceholder && (
                          <button
                            onClick={() => {
                              const inviteLink = `${window.location.origin}?mode=signup&compId=${u.companyId}`;
                              navigator.clipboard.writeText(inviteLink);
                              setSuccessMsg('Invite link copied to clipboard!');
                              setTimeout(() => setSuccessMsg(null), 3000);
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Copy Invite Link"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </button>
                        )}
                        {u.status === 'pending' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to reset ${u.displayName || u.email} to company setup?`)) {
                                handleUpdateUser(u.id, { status: 'active', companyId: 'NONE', role: 'admin' });
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                            title="Reset to Company Setup"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reset
                          </button>
                        )}
                        {u.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateUser(u.id, { status: 'active' })}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-green-700 transition-all shadow-sm"
                          >
                            <UserCheck className="h-3 w-3" />
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateUser(u.id, { status: u.status === 'active' ? 'suspended' : 'active' })}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            u.status === 'active' ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                          )}
                          title={u.status === 'active' ? "Suspend User" : "Activate User"}
                        >
                          {u.status === 'active' ? <UserMinus className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                        </button>
                        {(userRole === 'super_admin' || (userRole === 'admin' && u.companyId === companyId)) && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">
                {userRole === 'super_admin' ? 'Add New User' : 'Add Team Member'}
              </h2>
              <button onClick={() => {
                setShowAddModal(false);
                setLastInvitedLink(null);
              }} className="text-gray-400 hover:text-gray-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={newUser.displayName}
                  onChange={e => setNewUser({...newUser, displayName: e.target.value})}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="sales">Sales</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {userRole === 'super_admin' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Company ID</label>
                    <input
                      required
                      type="text"
                      value={newUser.companyId}
                      onChange={e => setNewUser({...newUser, companyId: e.target.value})}
                      placeholder="COMP123"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {adding ? 'Adding...' : 'Add User'}
                </button>
              </div>
              {lastInvitedLink && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100 animate-in zoom-in-95">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">Invitation Created!</p>
                  <p className="text-xs text-gray-600 mb-3">Email might take a moment. You can also copy this link and send it manually:</p>
                  <div className="flex items-center gap-2">
                    <input 
                      readOnly 
                      value={lastInvitedLink}
                      className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs font-mono text-purple-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lastInvitedLink);
                        setSuccessMsg('Link copied!');
                        setTimeout(() => setSuccessMsg(null), 2000);
                      }}
                      className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-gray-400 text-center italic">
                The user will be automatically assigned when they login with this email.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                {isDeleting && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

