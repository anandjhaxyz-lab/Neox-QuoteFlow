import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { LogOut, LayoutDashboard, FileText, Users, Package, Settings, Plus, Menu, X, BarChart3, Shield } from 'lucide-react';
import Dashboard from './components/Dashboard';
import QuoteBuilder from './components/QuoteBuilder';
import ClientDatabase from './components/ClientDatabase';
import ProductDatabase from './components/ProductDatabase';
import CompanyProfile from './components/CompanyProfile';
import UserManagement from './components/UserManagement';
import CompanyManagement from './components/CompanyManagement';
import CompanySetup from './components/CompanySetup';
import SuperAdminSystem from './components/SuperAdminSystem';
import PublicQuoteView from './components/PublicQuoteView';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Subscription from './components/Subscription';
import LandingPage from './components/LandingPage';
import { cn } from './lib/utils';

type View = 'dashboard' | 'builder' | 'clients' | 'products' | 'profile' | 'users' | 'companies' | 'subscription' | 'system';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'sales'>('sales');
  const [userStatus, setUserStatus] = useState<'pending' | 'active' | 'suspended' | 'expired'>('pending');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyPlan, setCompanyPlan] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('free');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showLanding, setShowLanding] = useState(true);
  const [publicQuoteId, setPublicQuoteId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [manualCompanyId, setManualCompanyId] = useState('');
  const activationAttempted = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quoteId');
    if (qId) {
      setPublicQuoteId(qId);
    }
    const mode = params.get('mode');
    if (mode === 'signup') {
      setShowLanding(false);
      setAuthMode('signup');
    }
    
    const viewParam = params.get('view') as View;
    if (viewParam) {
      setCurrentView(viewParam);
    }
  }, []);

  useEffect(() => {
    if (!user) return; // Only sync URL when user is logged in
    const url = new URL(window.location.href);
    const currentParam = url.searchParams.get('view');
    if (currentParam !== currentView) {
      url.searchParams.set('view', currentView);
      window.history.pushState({}, '', url.toString());
    }
  }, [currentView, user]);

  useEffect(() => {
    if (userRole === 'super_admin') {
      const unsubscribe = onSnapshot(collection(db, 'companies'), (snapshot) => {
        const companyList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.id
        }));
        setCompanies(companyList);
      });
      return () => unsubscribe();
    }
  }, [userRole]);

  useEffect(() => {
    if (!companyId || companyId === 'NONE' || companyId === 'SUPER') {
      setCompanyPlan('free');
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'companies', companyId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCompanyPlan(data.plan || 'free');
        setCompanyName(data.name || '');
      }
    });

    return () => unsubscribe();
  }, [companyId]);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        // Listen to user document changes in real-time
        const userDocRef = doc(db, 'users', authUser.uid);
        unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
          const superAdminEmails = ['anandjhaxyz@gmail.com', 'xtrowsnoida@gmail.com', 'suhaibhusain7@gmail.com'];
          const isHardcodedSuper = superAdminEmails.includes(authUser.email?.toLowerCase() || '');
          const isDbSuper = userDoc.exists() && userDoc.data()?.role === 'super_admin';
          const isSuper = isHardcodedSuper || isDbSuper;

          let currentRole: 'super_admin' | 'admin' | 'sales' = 'sales';
          let currentStatus: 'pending' | 'active' | 'suspended' | 'expired' = 'pending';
          let currentExpiry: string | null = null;
          let currentCompanyId: string | null = null;
          
          if (isSuper) {
            currentRole = 'super_admin';
            currentStatus = 'active';
            currentCompanyId = 'SUPER';
            
            setUserRole('super_admin');
            setUserStatus('active');
            setCompanyId('SUPER');
            setLoading(false);

            if (!userDoc.exists() || userDoc.data()?.role !== 'super_admin' || userDoc.data()?.companyId !== 'SUPER') {
              setDoc(doc(db, 'users', authUser.uid), {
                email: authUser.email?.toLowerCase().trim() || '',
                displayName: authUser.displayName || 'Super Admin',
                role: 'super_admin',
                status: 'active',
                companyId: 'SUPER',
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(err => console.error('Background super admin sync failed:', err));
            }
            return;
          } 
          
          if (!userDoc.exists() || userDoc.data()?.status === 'pending' || !userDoc.data()?.companyId || userDoc.data()?.companyId === 'NONE' || (userDoc.data()?.companyId === 'SUPER' && !isSuper)) {
            if (activationAttempted.current === authUser.uid) {
              console.log('[App] Activation already in progress for this user, skipping...');
              setLoading(false); // Ensure loading is off even if skipping
              return;
            }
            
            let preAssignedData = null;
            let invitationDocRef = null;
            const params = new URLSearchParams(window.location.search);
            const urlCompId = params.get('compId');

            if (authUser.email) {
              const trimmedEmail = authUser.email.trim().toLowerCase();
              const invitationId = `invitation_${trimmedEmail}`;
              console.log(`[App] Checking invitation for ${trimmedEmail} (ID: ${invitationId})`);
              
              // Small delay to ensure auth token is fully ready
              await new Promise(resolve => setTimeout(resolve, 500));
              
              activationAttempted.current = authUser.uid;
              
              try {
                // Try direct ID lookup first (fastest)
                const invDoc = await getDoc(doc(db, 'users', invitationId));
                if (invDoc.exists()) {
                  preAssignedData = invDoc.data();
                  invitationDocRef = doc(db, 'users', invitationId);
                  console.log('[App] Invitation found by ID:', preAssignedData);
                } else {
                  // Fallback: search by email field (slower but safer)
                  console.log('[App] No invitation found by ID, searching by email field...');
                  const q = query(collection(db, 'users'), where('email', '==', trimmedEmail));
                  const querySnapshot = await getDocs(q);
                  // Find a document that is either a placeholder or has a company assigned but is NOT the current user doc
                  const placeholderDoc = querySnapshot.docs.find(d => 
                    d.id !== authUser.uid && 
                    (d.data().isPlaceholder || d.id.startsWith('invitation_') || (d.data().status === 'active' && d.data().companyId !== 'NONE' && d.data().companyId !== 'SUPER'))
                  );
                  if (placeholderDoc) {
                    preAssignedData = placeholderDoc.data();
                    invitationDocRef = doc(db, 'users', placeholderDoc.id);
                    console.log('[App] Invitation/Placeholder found by email search:', preAssignedData);
                  } else if (urlCompId) {
                    // Check for general company invite link
                    preAssignedData = {
                      role: 'sales',
                      status: 'active',
                      companyId: urlCompId,
                      displayName: authUser.displayName || ''
                    };
                    console.log('[App] Using general company invite from URL:', urlCompId);
                  } else {
                    // Check if user is an owner of any company
                    console.log('[App] No invitation found, checking if user is a company owner...');
                    const companyQuery = query(collection(db, 'companies'), where('ownerEmail', '==', trimmedEmail));
                    const companySnapshot = await getDocs(companyQuery);
                    if (!companySnapshot.empty) {
                      const companyDoc = companySnapshot.docs[0];
                      preAssignedData = {
                        role: 'admin',
                        status: 'active',
                        companyId: companyDoc.id,
                        displayName: authUser.displayName || ''
                      };
                      console.log('[App] User is owner of company (by email):', companyDoc.id);
                    } else {
                      // Try by ownerId
                      const ownerQuery = query(collection(db, 'companies'), where('ownerId', '==', authUser.uid));
                      const ownerSnapshot = await getDocs(ownerQuery);
                      if (!ownerSnapshot.empty) {
                        const companyDoc = ownerSnapshot.docs[0];
                        preAssignedData = {
                          role: 'admin',
                          status: 'active',
                          companyId: companyDoc.id,
                          displayName: authUser.displayName || ''
                        };
                        console.log('[App] User is owner of company (by ID):', companyDoc.id);
                      }
                    }
                  }
                }
              } catch (err) {
                console.error('[App] Error claiming invitation/checking ownership:', err);
              }
            }

            const wasInSuperIncorrectly = userDoc.exists() && userDoc.data()?.companyId === 'SUPER' && !isSuper;

            if (preAssignedData || wasInSuperIncorrectly) {
              currentRole = preAssignedData?.role || 'sales';
              currentStatus = 'active';
              
              // Allow 'SUPER' companyId only if the role is 'super_admin'
              if (currentRole === 'super_admin') {
                currentCompanyId = 'SUPER';
              } else {
                currentCompanyId = (preAssignedData?.companyId && preAssignedData.companyId !== 'SUPER') ? preAssignedData.companyId : 'NONE';
              }
              
              console.log('[App] Claiming invitation, creating/updating user doc...');
              const userData = {
                email: authUser.email?.toLowerCase().trim() || '',
                displayName: authUser.displayName || preAssignedData?.displayName || '',
                role: currentRole,
                status: currentStatus,
                companyId: currentCompanyId,
                createdAt: userDoc.exists() ? userDoc.data()?.createdAt : new Date().toISOString(),
                expiryDate: preAssignedData?.expiryDate || (userDoc.exists() ? userDoc.data()?.expiryDate : null),
                updatedAt: new Date().toISOString()
              };
              
              try {
                console.log('[App] Attempting to update user doc with activation data:', userData);
                await setDoc(doc(db, 'users', authUser.uid), userData, { merge: true });
                console.log('[App] User doc updated successfully');
                
                if (invitationDocRef && invitationDocRef.id !== authUser.uid) {
                  await deleteDoc(invitationDocRef);
                  console.log('[App] Invitation document deleted successfully');
                }
              } catch (writeErr: any) {
                console.error('[App] Error writing user doc or deleting invitation:', writeErr);
                // If it's a permission error, it might be because the user doc doesn't exist yet
                // and the rules are too strict for creation.
                activationAttempted.current = null;
              }
            } else {
              // No invitation found and doc doesn't exist yet
              // New independent users become admins so they can setup a company
              currentRole = 'admin';
              currentStatus = 'active';
              currentCompanyId = 'NONE';

              // Ensure a document exists for the user even if they are not invited
              console.log('[App] No invitation found. Creating/Syncing active user document...');
              const userData = {
                email: authUser.email?.toLowerCase().trim() || '',
                displayName: authUser.displayName || '',
                role: currentRole,
                status: currentStatus,
                companyId: currentCompanyId,
                createdAt: userDoc.exists() ? userDoc.data()?.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              setDoc(doc(db, 'users', authUser.uid), userData, { merge: true })
                .then(() => console.log('[App] User document synced successfully'))
                .catch(err => {
                  console.error('[App] Error syncing user document:', err);
                  // Critical: if we can't create the doc, the user won't show in management
                  // But we allow them to continue in memory if they are already authenticated
                });
            }
          } else {
            const data = userDoc.data();
            currentRole = data?.role;
            currentStatus = data?.status;
            currentExpiry = data?.expiryDate;
            currentCompanyId = data?.companyId || 'NONE';

            // Insurance: If doc exists but is missing critical fields, sync them back
            if (!data?.email || !data?.displayName || (!data?.role && !isSuper)) {
              console.log('[App] Syncing missing fields to user document...');
              setDoc(doc(db, 'users', authUser.uid), {
                email: authUser.email?.toLowerCase().trim() || data?.email || '',
                displayName: authUser.displayName || data?.displayName || '',
                role: data?.role || currentRole,
                status: data?.status || currentStatus,
                companyId: data?.companyId || currentCompanyId,
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(err => console.error('[App] Background sync failed:', err));
            }

            if (currentStatus === 'active' && currentExpiry) {
              const expiry = new Date(currentExpiry);
              if (expiry < new Date()) {
                currentStatus = 'expired';
                await setDoc(doc(db, 'users', authUser.uid), { status: 'expired' }, { merge: true });
              }
            }
          }
          
          setUserRole(currentRole);
          setUserStatus(currentStatus || 'pending');
          setExpiryDate(currentExpiry);
          setCompanyId(currentCompanyId);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserRole('sales');
        setUserStatus('pending');
        setCompanyId(null);
        setLoading(false);
        if (unsubscribeUser) unsubscribeUser();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (publicQuoteId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <PublicQuoteView quoteId={publicQuoteId} onBack={() => setPublicQuoteId(null)} />
        </div>
      </div>
    );
  }

  if (!user) {
    if (showLanding) {
      return (
        <LandingPage 
          onGetStarted={() => {
            setAuthMode('signup');
            setShowLanding(false);
          }}
          onLogin={() => {
            setAuthMode('login');
            setShowLanding(false);
          }}
        />
      );
    }
    return authMode === 'login' ? (
      <Login 
        onSwitchToSignup={() => setAuthMode('signup')} 
        onBackToLanding={() => setShowLanding(true)}
      />
    ) : (
      <Signup 
        onSwitchToLogin={() => setAuthMode('login')} 
        onBackToLanding={() => setShowLanding(true)}
      />
    );
  }

  if (userStatus === 'suspended' || userStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center">
            <div className={cn(
              "mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
              userStatus === 'expired' ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600"
            )}>
              <Settings className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {userStatus === 'expired' ? 'Subscription Expired' : 'Account Suspended'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {userStatus === 'expired' ? 'Your subscription has expired. Please contact the administrator to renew.' : 
               'Your account has been suspended. Please contact the administrator for details.'}
            </p>
            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">User Details</p>
              <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <p className="text-[10px] text-gray-400 mt-1 font-mono">UID: {user.uid}</p>
              {expiryDate && (
                <p className="text-xs text-red-500 mt-2 font-bold">
                  Expired on: {new Date(expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
            <div className="mt-6 flex flex-col gap-3">
              {userStatus === 'expired' && userRole === 'admin' && (
                <button
                  onClick={() => {
                    // Temporarily allow access to subscription page
                    setUserStatus('active'); 
                    setCurrentView('subscription');
                  }}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-lg shadow-green-200"
                >
                  Renew Subscription
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex justify-center py-3 px-4 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
              >
                Sign out
              </button>
            </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'builder', label: 'New Quote', icon: Plus },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
  ];

  if (userRole === 'super_admin') {
    navItems.push({ id: 'profile', label: 'Company Profile', icon: Settings });
    navItems.splice(0, 0, { id: 'system', label: 'System Admin', icon: Shield });
    navItems.splice(5, 0, { id: 'companies', label: 'Companies', icon: LayoutDashboard });
    navItems.splice(5, 0, { id: 'users', label: 'All Users', icon: Users });
    navItems.splice(6, 0, { id: 'subscription', label: 'Subscription', icon: BarChart3 });
  } else if (userRole === 'admin') {
    navItems.push({ id: 'profile', label: 'Company Profile', icon: Settings });
    if (companyPlan !== 'free') {
      navItems.splice(4, 0, { id: 'users', label: 'My Team', icon: Users });
    }
    navItems.splice(companyPlan === 'free' ? 4 : 5, 0, { id: 'subscription', label: 'Subscription', icon: BarChart3 });
  }

  const effectiveCompanyId = userRole === 'super_admin' ? (selectedCompanyId || 'SUPER') : companyId;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Popup for Company Setup */}
      {(!companyId || companyId === 'NONE') && userRole !== 'super_admin' && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            {userRole === 'admin' ? (
              <CompanySetup onComplete={(id) => setCompanyId(id)} />
            ) : (
              <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 text-center space-y-6">
                <div className="mx-auto h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Waiting for Company</h2>
                <div className="space-y-4">
                  <p className="text-gray-500 leading-relaxed">
                    Hello {user.displayName || 'there'}! You haven't been assigned to a company yet. 
                    Please ask your administrator to send you an invite link or add you via email.
                  </p>
                  <p className="text-xs text-gray-400 italic">
                    Logged in as: {user.email} ({userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'Sales'})
                  </p>
                </div>
                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={handleLogout}
                    className="w-full py-4 px-6 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign out
                  </button>
                  <button 
                    onClick={async () => {
                      // Allow stuck users to become admins of their own workspace
                      await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
                      setUserRole('admin');
                    }}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    Or create my own workspace (Become Admin)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col shrink-0 z-50",
          isSidebarOpen ? "w-64" : "w-20",
          "fixed inset-y-0 left-0 lg:static lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div className={cn("flex items-center justify-between", isSidebarOpen ? "p-6" : "p-4 flex-col gap-4")}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                <FileText className="h-6 w-6 text-white" />
              </div>
              {isSidebarOpen && <span className="font-bold text-xl text-gray-900 truncate">QuoteFlow</span>}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isSidebarOpen ? <X className="h-5 w-5 text-gray-500" /> : <Menu className="h-5 w-5 text-gray-500" />}
            </button>
          </div>

          {/* Company Switcher for Super Admin */}
          {userRole === 'super_admin' && isSidebarOpen && (
            <div className="px-6 mb-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Active Company
              </label>
              <select
                value={selectedCompanyId || 'SUPER'}
                onChange={(e) => setSelectedCompanyId(e.target.value === 'SUPER' ? null : e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="SUPER">Global View (Super)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <nav className={cn("flex-1 space-y-1 py-4", isSidebarOpen ? "px-3" : "px-2")}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as View);
                  if (item.id === 'builder') setEditingQuoteId(null);
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  currentView === item.id
                    ? "bg-blue-50 text-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                )}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", currentView === item.id ? "text-blue-600" : "text-gray-500")} />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className={cn("border-t border-gray-100", isSidebarOpen ? "p-4" : "p-2")}>
            <div className={cn("flex items-center gap-3", isSidebarOpen ? "px-4 py-3" : "justify-center py-3")}>
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`}
                alt={user.displayName || ''}
                className="h-8 w-8 rounded-full border border-gray-200 shrink-0"
              />
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {userRole.replace('_', ' ')}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <LogOut className="h-3 w-3" /> Sign out
                  </button>
                </div>
              )}
              {!isSidebarOpen && (
                <button
                  onClick={handleLogout}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 p-2 rounded-lg text-red-600 hover:bg-red-50 lg:hidden"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0 relative">
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold text-xl text-gray-900">QuoteFlow</span>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard 
              userRole={userRole}
              companyId={effectiveCompanyId}
              onNewQuote={() => setCurrentView('builder')} 
              onEditQuote={(id) => {
                setEditingQuoteId(id);
                setCurrentView('builder');
              }}
              onViewQuote={(id) => {
                setEditingQuoteId(id);
                setViewMode(true);
                setCurrentView('builder');
              }}
            />
          )}
          {currentView === 'builder' && (
            <QuoteBuilder 
              quoteId={editingQuoteId} 
              viewOnly={viewMode}
              onClose={() => {
                setCurrentView('dashboard');
                setViewMode(false);
              }}
              userRole={userRole}
              companyId={effectiveCompanyId}
            />
          )}
          {currentView === 'clients' && <ClientDatabase userRole={userRole} companyId={effectiveCompanyId} />}
          {currentView === 'products' && <ProductDatabase userRole={userRole} companyId={effectiveCompanyId} />}
          {currentView === 'subscription' && (userRole === 'admin' || userRole === 'super_admin') && <Subscription companyId={effectiveCompanyId || ''} />}
          {currentView === 'profile' && <CompanyProfile userRole={userRole} companyId={effectiveCompanyId} />}
          {currentView === 'users' && <UserManagement userRole={userRole} companyId={effectiveCompanyId} plan={companyPlan} companyName={companyName} />}
          {currentView === 'companies' && userRole === 'super_admin' && (
            <CompanyManagement 
              userRole={userRole} 
              onManageCompany={(id) => {
                setSelectedCompanyId(id);
                setCurrentView('dashboard');
              }}
            />
          )}
          {currentView === 'system' && userRole === 'super_admin' && (
            <SuperAdminSystem />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
