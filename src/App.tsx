import React, { useState, useEffect, useRef } from 'react';
import { localApi } from './services/localApi';
import { LogOut, LayoutDashboard, FileText, Users, Package, Settings, Plus, Menu, X, BarChart3, Shield, User, ChevronLeft, ChevronRight } from 'lucide-react';
import Dashboard from './components/Dashboard';
import QuoteBuilder from './components/QuoteBuilder';
import ClientDatabase from './components/ClientDatabase';
import ProductDatabase from './components/ProductDatabase';
import CompanyProfile from './components/CompanyProfile';
import UserManagement from './components/UserManagement';
import CompanyManagement from './components/CompanyManagement';
import CompanySetup from './components/CompanySetup';
import SuperAdminSystem from './components/SuperAdminSystem';
import UserProfile from './components/UserProfile';
import PublicQuoteView from './components/PublicQuoteView';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Subscription from './components/Subscription';
import LandingPage from './components/LandingPage';
import { cn } from './lib/utils';

// Local User type matching the previous Firebase User but simpler
interface LocalUser {
  id: string;
  uid?: string; // for backward compat
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'sales';
  companyId: string;
  status: 'pending' | 'active' | 'suspended' | 'expired';
  photoURL?: string;
  expiryDate?: string;
}

type View = 'dashboard' | 'builder' | 'clients' | 'products' | 'profile' | 'users' | 'companies' | 'subscription' | 'system' | 'my-profile';

const App: React.FC = () => {
  const [user, setUser] = useState<LocalUser | null>(null);
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
  const [showLanding, setShowLanding] = useState(false);
  const [publicQuoteId, setPublicQuoteId] = useState<string | null>(null);
  const activationAttempted = useRef<string | null>(null);

  // Load URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quoteId');
    if (qId) setPublicQuoteId(qId);
    
    const mode = params.get('mode');
    if (mode === 'signup') {
      setShowLanding(false);
      setAuthMode('signup');
    }
  }, []);

  // Sync View to URL
  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') !== currentView) {
      url.searchParams.set('view', currentView);
      window.history.pushState({}, '', url.toString());
    }
  }, [currentView, user]);

  // Auth Effect - Replaces onAuthStateChanged
  useEffect(() => {
    const initAuth = async () => {
      const storedUserId = localStorage.getItem('localUserId');
      if (storedUserId) {
        try {
          const userData = await localApi.getUser(storedUserId);
          if (userData) {
            setUser({ ...userData, uid: userData.id }); // Add uid for compatibility
            setUserRole(userData.role);
            setUserStatus(userData.status);
            setCompanyId(userData.companyId);
            setExpiryDate(userData.expiryDate);
          } else {
            localStorage.removeItem('localUserId');
          }
        } catch (err) {
          console.error("Local auth check failed:", err);
          localStorage.removeItem('localUserId');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Sync Companies mapping for super admin
  useEffect(() => {
    if (userRole === 'super_admin') {
      const fetchCompanies = async () => {
         // In production we would poll or use websockets, for now simple fetch
         try {
           const res = await fetch('/api/companies/all'); // Need to add this route or just use search
           // Actually I'll implement a simple fetch for super admin
         } catch (e) {}
      };
      // We'll use localApi if I add a batch method, or just wait for now
    }
  }, [userRole]);

  // Sync Company Details
  useEffect(() => {
    if (!companyId || companyId === 'NONE' || companyId === 'SUPER') {
      setCompanyPlan('free');
      return;
    }
    const fetchCompanyData = async () => {
      const data = await localApi.getCompany(companyId);
      if (data) {
        setCompanyPlan(data.plan || 'free');
        setCompanyName(data.name || '');
      }
    };
    fetchCompanyData();
  }, [companyId]);

  const handleLogout = () => {
    localStorage.removeItem('localUserId');
    setUser(null);
    setUserRole('sales');
    setUserStatus('pending');
    setCompanyId(null);
    setCurrentView('dashboard');
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
          onGetStarted={() => { setAuthMode('signup'); setShowLanding(false); }}
          onLogin={() => { setAuthMode('login'); setShowLanding(false); }}
        />
      );
    }
    return authMode === 'login' ? (
      <Login 
        onSwitchToSignup={() => setAuthMode('signup')} 
        onBackToLanding={() => setShowLanding(true)}
        onLoginSuccess={(u) => { 
          localStorage.setItem('localUserId', u.id);
          setUser({ ...u, uid: u.id });
          setUserRole(u.role);
          setUserStatus(u.status);
          setCompanyId(u.companyId);
        }}
      />
    ) : (
      <Signup 
        onSwitchToLogin={() => setAuthMode('login')} 
        onBackToLanding={() => setShowLanding(true)}
        onSignupSuccess={(u) => {
          localStorage.setItem('localUserId', u.id);
          setUser({ ...u, uid: u.id });
          setUserRole(u.role);
          setUserStatus(u.status);
          setCompanyId(u.companyId);
        }}
      />
    );
  }

  if (userStatus === 'suspended' || userStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100 text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">
              {userStatus === 'expired' ? 'Subscription Expired' : 'Account Suspended'}
            </h2>
            <button onClick={handleLogout} className="mt-6 w-full py-3 px-4 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50">
              Sign out
            </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'builder', label: 'New Quote', icon: Plus },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'my-profile', label: 'My Profile', icon: User },
  ];

  if (userRole === 'super_admin') {
    navItems.push({ id: 'users', label: 'Team', icon: Users });
    navItems.push({ id: 'profile', label: 'Company Profile', icon: Settings });
    navItems.splice(0, 0, { id: 'system', label: 'System Admin', icon: Shield });
  } else if (userRole === 'admin') {
    navItems.push({ id: 'users', label: 'Team', icon: Users });
    navItems.push({ id: 'profile', label: 'Company Profile', icon: Settings });
  }

  const effectiveCompanyId = (userRole === 'super_admin' && selectedCompanyId) ? selectedCompanyId : (companyId || 'SUPER');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Toggle Button for broad screens */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={cn(
          "fixed top-6 z-[60] bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm transition-all duration-300 hover:bg-gray-50",
          isSidebarOpen ? "left-[244px]" : "left-[76px]"
        )}
      >
        {isSidebarOpen ? <ChevronLeft className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 fixed inset-y-0 left-0 lg:static z-50 transition-all duration-300 overflow-hidden shrink-0",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className={cn("p-6 flex flex-col h-full transition-all duration-300", isSidebarOpen ? "w-64" : "w-20 px-4")}>
          <div className="flex items-center gap-3 mb-8 overflow-hidden">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">
              <FileText className="h-6 w-6" />
            </div>
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-gray-900 animate-in fade-in slide-in-from-left-2 duration-300">QuoteFlow</span>}
          </div>
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setCurrentView(item.id as View); if (item.id === 'builder') setEditingQuoteId(null); }}
                className={cn(
                  "w-full flex items-center rounded-xl text-sm transition-all group relative", 
                  currentView === item.id ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-50/50" : "text-gray-500 hover:bg-gray-50",
                  isSidebarOpen ? "px-3 py-2.5 gap-3" : "p-3 justify-center"
                )}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-active:scale-90", item.id === 'my-profile' && "text-red-500")} />
                {isSidebarOpen && <span className="font-medium truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[70]">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </nav>
          <div className="border-t border-gray-100 pt-4">
               <div className={cn("flex items-center mb-4 overflow-hidden", isSidebarOpen ? "gap-3" : "justify-center")}>
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  {isSidebarOpen && (
                    <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                      <p className="text-sm font-bold text-gray-900 truncate">{user.displayName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{userRole}</p>
                    </div>
                  )}
               </div>
               <button 
                onClick={handleLogout} 
                className={cn(
                  "w-full text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2 font-bold",
                  isSidebarOpen ? "px-3 py-2 text-sm" : "p-3 justify-center"
                )}
                title={!isSidebarOpen ? "Sign out" : undefined}
               >
                 <LogOut className="h-4 w-4" /> 
                 {isSidebarOpen && <span className="animate-in fade-in slide-in-from-left-2 duration-300">Sign out</span>}
               </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="p-8 max-w-7xl mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard 
              userRole={userRole}
              companyId={effectiveCompanyId}
              onNewQuote={() => setCurrentView('builder')} 
              onEditQuote={id => { setEditingQuoteId(id); setCurrentView('builder'); }}
              onViewQuote={id => { setEditingQuoteId(id); setViewMode(true); setCurrentView('builder'); }}
            />
          )}
          {currentView === 'builder' && (
            <QuoteBuilder 
              quoteId={editingQuoteId} 
              viewOnly={viewMode}
              onClose={() => { setCurrentView('dashboard'); setViewMode(false); }}
              userRole={userRole}
              companyId={effectiveCompanyId}
            />
          )}
          {currentView === 'clients' && <ClientDatabase userRole={userRole} companyId={effectiveCompanyId} />}
          {currentView === 'products' && <ProductDatabase userRole={userRole} companyId={effectiveCompanyId} />}
          {currentView === 'users' && (userRole === 'admin' || userRole === 'super_admin') && (
            <UserManagement userRole={userRole} companyId={effectiveCompanyId} />
          )}
          {currentView === 'profile' && <CompanyProfile userRole={userRole} companyId={effectiveCompanyId} />}
          {currentView === 'my-profile' && <UserProfile userId={user.id} />}
          {currentView === 'system' && userRole === 'super_admin' && <SuperAdminSystem />}
        </div>
      </main>
    </div>
  );
};

export default App;
