import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Shield, Users, Building2, FileText, TrendingUp, 
  Mail, Phone, User, Settings, Save, CheckCircle2,
  BarChart3, Activity, Globe, Database, Loader2
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface SystemStats {
  totalCompanies: number;
  totalUsers: number;
  totalQuotes: number;
  totalRevenue: number;
}

const SuperAdminSystem: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalCompanies: 0,
    totalUsers: 0,
    totalQuotes: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'activity' | 'settings'>('overview');
  const [adminProfile, setAdminProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    designation: 'Super Administrator',
    bio: ''
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [configStatus, setConfigStatus] = useState({ resendConfigured: false, firebaseConfigured: false });

  useEffect(() => {
    // Fetch Global Stats
    const fetchData = async () => {
      try {
        const configRes = await fetch('/api/check-config');
        const configData = await configRes.json();
        setConfigStatus(configData);

        const companiesSnap = await getDocs(collection(db, 'companies'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const quotesSnap = await getDocs(collection(db, 'quotations'));
        
        let revenue = 0;
        quotesSnap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'Accepted') {
            revenue += (data.grandTotal || 0);
          }
        });

        setStats({
          totalCompanies: companiesSnap.size,
          totalUsers: usersSnap.size,
          totalQuotes: quotesSnap.size,
          totalRevenue: revenue
        });

        // Fetch Admin Profile
        if (auth.currentUser) {
          const adminDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            setAdminProfile({
              displayName: data.displayName || '',
              email: data.email || auth.currentUser.email || '',
              phone: data.phone || '',
              designation: data.designation || 'Super Administrator',
              bio: data.bio || ''
            });
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching system data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...adminProfile,
        updatedAt: new Date().toISOString()
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving admin profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            System Administration
          </h1>
          <p className="text-gray-500 mt-1">Global platform overview and system-wide management.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'overview' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'profile' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            My Profile
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'activity' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'settings' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Companies</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>Active platform businesses</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Users</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsers}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 text-blue-600 text-xs font-bold">
                <Globe className="h-3 w-3" />
                <span>Registered across all orgs</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Quotes</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalQuotes}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 text-orange-600 text-xs font-bold">
                <Activity className="h-3 w-3" />
                <span>System-wide documents</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>Accepted quotes value</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                System Status
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">Database Connection</span>
                  </div>
                  <span className="text-xs font-bold text-green-600 uppercase">Operational</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">Auth Service</span>
                  </div>
                  <span className="text-xs font-bold text-green-600 uppercase">Operational</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full animate-pulse", configStatus.resendConfigured ? "bg-green-500" : "bg-red-500")}></div>
                    <span className="text-sm font-medium text-gray-700">Email API (Resend)</span>
                  </div>
                  <span className={cn("text-xs font-bold uppercase", configStatus.resendConfigured ? "text-green-600" : "text-red-600")}>
                    {configStatus.resendConfigured ? "Operational" : "Not Configured"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Platform Activity
              </h2>
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Activity className="h-12 w-12 text-gray-200 mb-4" />
                <p className="text-gray-500 text-sm">Real-time activity logs will appear here.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
          <div className="flex items-center gap-6 mb-8">
            <div className="h-24 w-24 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <User className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{adminProfile.displayName || 'Super Admin'}</h2>
              <p className="text-gray-500">{adminProfile.designation}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={adminProfile.displayName}
                  onChange={(e) => setAdminProfile({ ...adminProfile, displayName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={adminProfile.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={adminProfile.phone}
                  onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Designation</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={adminProfile.designation}
                  onChange={(e) => setAdminProfile({ ...adminProfile, designation: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Short Bio</label>
              <textarea
                value={adminProfile.bio}
                onChange={(e) => setAdminProfile({ ...adminProfile, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-between">
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 className="h-5 w-5" />
                Profile updated successfully!
              </div>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="ml-auto flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save Profile
            </button>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Recent System Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-center h-64 text-center border-2 border-dashed border-gray-100 rounded-2xl">
              <div className="max-w-xs">
                <Database className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 text-sm font-medium">No recent system-wide events to display.</p>
                <p className="text-gray-400 text-xs mt-1">Activity logs are automatically generated as users interact with the platform.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Platform Settings
          </h2>
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2">Maintenance Mode</h3>
              <p className="text-sm text-gray-500 mb-4">Temporarily disable access to the platform for all users except Super Admins.</p>
              <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                Coming Soon
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2">Global Plan Limits</h3>
              <p className="text-sm text-gray-500 mb-4">Configure default limits for Free, Basic, and Pro plans.</p>
              <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSystem;
