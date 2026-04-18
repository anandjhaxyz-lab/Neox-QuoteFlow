import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Building2, Plus, Trash2, ExternalLink, Search, Globe, Mail, Phone, Edit2, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Company {
  id: string;
  name: string;
  address: string;
  gstin: string;
  contactEmail: string;
  contactPhone: string;
  ownerEmail?: string;
  ownerId?: string;
  createdAt: any;
  plan?: 'free' | 'basic' | 'pro' | 'enterprise';
  expiryDate?: string | null;
}

interface CompanyManagementProps {
  userRole: 'super_admin' | 'admin' | 'sales';
  onManageCompany?: (id: string) => void;
}

const CompanyManagement: React.FC<CompanyManagementProps> = ({ userRole, onManageCompany }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  
  // New Company Form
  const [newCompany, setNewCompany] = useState({
    name: '',
    address: '',
    gstin: '',
    contactEmail: '',
    contactPhone: '',
    ownerEmail: '',
    plan: 'free' as 'free' | 'basic' | 'pro' | 'enterprise',
    expiryDate: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== 'super_admin') return;

    const q = query(collection(db, 'companies'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompanies(snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, plan: data.plan || 'free' };
      }) as Company[]);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching companies:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userRole]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const companyId = Math.random().toString(36).substr(2, 9).toUpperCase();
      await setDoc(doc(db, 'companies', companyId), {
        name: newCompany.name,
        address: newCompany.address,
        gstin: newCompany.gstin,
        contactEmail: newCompany.contactEmail,
        contactPhone: newCompany.contactPhone,
        ownerEmail: newCompany.ownerEmail.toLowerCase(),
        plan: newCompany.plan,
        expiryDate: newCompany.expiryDate ? new Date(newCompany.expiryDate).toISOString() : null,
        createdAt: serverTimestamp()
      });
      
      const trimmedOwnerEmail = newCompany.ownerEmail.trim().toLowerCase();
      const placeholderId = `invitation_${trimmedOwnerEmail}`;
      
      await setDoc(doc(db, 'users', placeholderId), {
        email: trimmedOwnerEmail,
        displayName: newCompany.name + ' Admin',
        role: 'admin',
        status: 'active',
        companyId: companyId,
        createdAt: new Date().toISOString(),
        isPlaceholder: true
      }, { merge: true });

      // Send invitation email
      try {
        await fetch('/api/send-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmedOwnerEmail,
            companyName: newCompany.name,
            role: 'admin',
            inviteLink: window.location.origin
          })
        });
      } catch (emailErr) {
        console.error('Error sending invitation email:', emailErr);
      }

      setShowAddModal(false);
      setNewCompany({ name: '', address: '', gstin: '', contactEmail: '', contactPhone: '', ownerEmail: '' });
    } catch (err: any) {
      console.error('Error adding company:', err);
      setError(err.message || 'Failed to add company');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'companies', editingCompany.id), {
        name: editingCompany.name || '',
        address: editingCompany.address || '',
        gstin: editingCompany.gstin || '',
        contactEmail: editingCompany.contactEmail || '',
        contactPhone: editingCompany.contactPhone || '',
        ownerEmail: editingCompany.ownerEmail?.toLowerCase() || '',
        plan: editingCompany.plan || 'free',
        expiryDate: editingCompany.expiryDate ? new Date(editingCompany.expiryDate).toISOString() : null
      });
      setShowEditModal(false);
      setEditingCompany(null);
    } catch (err: any) {
      console.error('Error updating company:', err);
      setError(err.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCompany = async (id: string) => {
    setCompanyToDelete(id);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    setError(null);
    setIsDeleting(true);
    try {
      // 1. Find and update all users associated with this company
      const usersQuery = query(collection(db, 'users'), where('companyId', '==', companyToDelete));
      const usersSnapshot = await getDocs(usersQuery);
      const userUpdates = usersSnapshot.docs.map(userDoc => 
        updateDoc(doc(db, 'users', userDoc.id), {
          status: 'suspended',
          companyId: 'NONE',
          updatedAt: new Date().toISOString()
        })
      );
      
      // 2. Find and delete all clients associated with this company
      const clientsQuery = query(collection(db, 'clients'), where('companyId', '==', companyToDelete));
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientDeletes = clientsSnapshot.docs.map(d => deleteDoc(doc(db, 'clients', d.id)));

      // 3. Find and delete all products associated with this company
      const productsQuery = query(collection(db, 'products'), where('companyId', '==', companyToDelete));
      const productsSnapshot = await getDocs(productsQuery);
      const productDeletes = productsSnapshot.docs.map(d => deleteDoc(doc(db, 'products', d.id)));

      // 4. Find and delete all quotations associated with this company
      const quotesQuery = query(collection(db, 'quotations'), where('companyId', '==', companyToDelete));
      const quotesSnapshot = await getDocs(quotesQuery);
      const quoteDeletes = quotesSnapshot.docs.map(d => deleteDoc(doc(db, 'quotations', d.id)));

      // Execute all cleanups
      await Promise.all([...userUpdates, ...clientDeletes, ...productDeletes, ...quoteDeletes]);

      // 5. Finally delete the company document
      await deleteDoc(doc(db, 'companies', companyToDelete));
      
      setCompanyToDelete(null);
    } catch (err: any) {
      console.error('Error during full company cleanup:', err);
      setError('Failed to delete company: ' + (err.message || 'Permission denied'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
          <p className="text-gray-500 mt-1">Manage business owners and their organizations.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-5 w-5" />
          Add New Company
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{company.name}</h3>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">ID: {company.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onManageCompany?.(company.id)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Manage Full Profile"
                >
                  <ExternalLink className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setEditingCompany(company);
                    setShowEditModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteCompany(company.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <span className="truncate">{company.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{company.contactEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{company.contactPhone}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Owner: <span className="font-medium text-gray-600">{company.ownerEmail || (company.ownerId ? `ID: ${company.ownerId}` : 'Not assigned')}</span>
              </div>
              <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                {company.plan || 'Free'}
              </div>
            </div>
            {company.expiryDate && (
              <div className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-wider">
                Expires: {new Date(company.expiryDate).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Add New Business</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Company Name</label>
                <input
                  required
                  type="text"
                  value={newCompany.name}
                  onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Address</label>
                <textarea
                  value={newCompany.address}
                  onChange={e => setNewCompany({...newCompany, address: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={newCompany.gstin}
                    onChange={e => setNewCompany({...newCompany, gstin: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phone</label>
                  <input
                    type="text"
                    value={newCompany.contactPhone}
                    onChange={e => setNewCompany({...newCompany, contactPhone: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Owner Email</label>
                <input
                  required
                  type="email"
                  placeholder="admin@company.com"
                  value={newCompany.ownerEmail}
                  onChange={e => setNewCompany({...newCompany, ownerEmail: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1 italic">This user will become the Admin of this company when they login.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Plan</label>
                  <select
                    value={newCompany.plan}
                    onChange={e => setNewCompany({...newCompany, plan: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="free">Free Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newCompany.expiryDate}
                    onChange={e => setNewCompany({...newCompany, expiryDate: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {saving ? 'Creating...' : 'Create Company & Assign Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Edit Business Details</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateCompany} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Company Name</label>
                <input
                  required
                  type="text"
                  value={editingCompany.name}
                  onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Address</label>
                <textarea
                  value={editingCompany.address}
                  onChange={e => setEditingCompany({...editingCompany, address: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editingCompany.contactEmail || ''}
                    onChange={e => setEditingCompany({...editingCompany, contactEmail: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingCompany.contactPhone || ''}
                    onChange={e => setEditingCompany({...editingCompany, contactPhone: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={editingCompany.gstin || ''}
                    onChange={e => setEditingCompany({...editingCompany, gstin: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Owner Email</label>
                  <input
                    required
                    type="email"
                    value={editingCompany.ownerEmail || ''}
                    onChange={e => setEditingCompany({...editingCompany, ownerEmail: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Plan</label>
                  <select
                    value={editingCompany.plan || 'free'}
                    onChange={e => setEditingCompany({...editingCompany, plan: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="free">Free Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editingCompany.expiryDate ? editingCompany.expiryDate.split('T')[0] : ''}
                    onChange={e => setEditingCompany({...editingCompany, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {saving ? 'Saving...' : 'Update Company Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Company</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this company? This will <strong>permanently delete</strong> all associated clients, products, and quotes, and <strong>suspend</strong> all its users.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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

export default CompanyManagement;
