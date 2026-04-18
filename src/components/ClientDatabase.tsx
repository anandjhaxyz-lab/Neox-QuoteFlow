import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Plus, Search, Users, Edit2, Trash2, Mail, Phone, MapPin, Building2, User, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Client {
  id: string;
  name: string;
  companyName: string;
  address: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin: string;
  contactPerson: string;
  state: string;
  phone: string;
  email: string;
  createdBy?: string;
}

interface ClientDatabaseProps {
  userRole: 'admin' | 'sales' | 'super_admin';
  companyId: string | null;
}

const ClientDatabase: React.FC<ClientDatabaseProps> = ({ userRole, companyId }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    companyName: '',
    address: '',
    billingAddress: '',
    shippingAddress: '',
    gstin: '',
    contactPerson: '',
    state: '',
    phone: '',
    email: ''
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if ((userRole === 'admin' || userRole === 'super_admin') && (companyId || userRole === 'super_admin')) {
      let q = query(collection(db, 'users'));
      if (userRole === 'admin') {
        q = query(collection(db, 'users'), where('companyId', '==', companyId));
      }
      
      const unsubscribeUsers = onSnapshot(q, (snapshot) => {
        const uMap: Record<string, string> = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          uMap[doc.id] = data.displayName || data.email || 'Unknown User';
        });
        setUsersMap(uMap);
      });
      return () => unsubscribeUsers();
    }
  }, [userRole, companyId]);

  useEffect(() => {
    if (!companyId && userRole !== 'super_admin') return;

    let q;
    if (companyId === 'SUPER') {
      q = query(collection(db, 'clients'));
    } else {
      q = query(collection(db, 'clients'), where('companyId', '==', companyId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let clientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      
      console.log(`Fetched ${clientList.length} clients for company: ${companyId}`);
      // Sort in memory for all roles to avoid index/missing field issues
      clientList = clientList.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
      
      setClients(clientList);
      setLoading(false);
      setFetchError(null);
    }, (error) => {
      console.error('Error fetching clients:', error);
      setFetchError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), {
          ...formData,
          address: formData.billingAddress || formData.address // Keep address for backward compatibility
        });
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          address: formData.billingAddress || formData.address,
          companyId,
          createdBy: auth.currentUser?.uid || ''
        });
      }
      setIsModalOpen(false);
      setEditingClient(null);
      setFormData({
        name: '', companyName: '', address: '', billingAddress: '', shippingAddress: '', gstin: '',
        contactPerson: '', state: '', phone: '', email: ''
      });
      setSameAsBilling(true);
    } catch (error: any) {
      console.error('Save failed:', error);
      setErrorMsg('Failed to save client: ' + (error.message || 'Permission denied'));
    }
  };

  const handleDelete = async (id: string) => {
    setClientToDelete(id);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      try {
        await deleteDoc(doc(db, 'clients', clientToDelete));
        setClientToDelete(null);
      } catch (error: any) {
        console.error('Delete failed:', error);
        setErrorMsg('Failed to delete client: ' + (error.message || 'Permission denied'));
      }
    }
  };

  const filteredClients = clients.filter(client =>
    (client.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (userRole !== 'super_admin' && (!companyId || companyId === 'NONE')) {
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Database</h1>
          <p className="text-gray-500 mt-1">Manage your customer information for quick quotation generation.</p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setErrorMsg(null);
            setFormData({
              name: '', companyName: '', address: '', billingAddress: '', shippingAddress: '', gstin: '',
              contactPerson: '', state: '', phone: '', email: ''
            });
            setSameAsBilling(true);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all duration-200"
        >
          <Plus className="h-5 w-5" />
          Add New Client
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center">
          <p>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {fetchError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center">
          <p>Error loading clients: {fetchError}</p>
          <button onClick={() => setFetchError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company, name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length > 0 ? (
          filteredClients.map((client, i) => (
            <div
              key={client.id}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingClient(client);
                      setFormData(client);
                      setSameAsBilling(client.billingAddress === client.shippingAddress);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {(userRole === 'super_admin' || userRole === 'admin') && (
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 truncate">{client.companyName}</h3>
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                <User className="h-3 w-3" /> {client.name}
              </p>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{client.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <span className="line-clamp-2">{client.address || 'No address'}</span>
                </div>
              </div>

              {client.gstin && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GSTIN</span>
                  <p className="text-xs font-mono font-bold text-blue-600 uppercase">{client.gstin}</p>
                </div>
              )}
              
              {userRole === 'admin' && client.createdBy && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Created by: <span className="font-medium text-gray-700">{usersMap[client.createdBy] || 'Unknown'}</span>
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Users className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No clients found</h3>
            <p className="text-gray-500 mt-2">
              {searchTerm ? `No clients match "${searchTerm}"` : 'Start by adding your first client to the database.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setErrorMsg(null); }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {errorMsg && (
                <div className="md:col-span-2 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center">
                  <p>{errorMsg}</p>
                  <button type="button" onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Company Name *</label>
                <input
                  required
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Contact Person *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Phone *</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Billing Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={formData.billingAddress || formData.address}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        billingAddress: val,
                        shippingAddress: sameAsBilling ? val : prev.shippingAddress
                      }));
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sameAsBilling"
                    checked={sameAsBilling}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAsBilling(checked);
                      if (checked) {
                        setFormData(prev => ({ ...prev, shippingAddress: prev.billingAddress || prev.address }));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="sameAsBilling" className="text-sm font-medium text-gray-600">Shipping address same as billing</label>
                </div>

                {!sameAsBilling && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-sm font-bold text-gray-700">Shipping Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                )}
              </div>
              <div className="md:col-span-2 pt-4 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  {editingClient ? 'Update Client' : 'Save Client'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Client</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this client? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDatabase;
