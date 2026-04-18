import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Building2, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface CompanySetupProps {
  onComplete: (companyId: string) => void;
}

const CompanySetup: React.FC<CompanySetupProps> = ({ onComplete }) => {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    const user = auth.currentUser;
    const companyId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

    try {
      // 1. Create company document
      try {
        await setDoc(doc(db, 'companies', companyId), {
          name: companyName,
          createdAt: serverTimestamp(),
          ownerId: user.uid,
          ownerEmail: user.email,
          status: 'active',
          plan: 'free'
        });
      } catch (error) {
        console.error('Error creating company:', error);
        throw new Error(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          operationType: 'write',
          path: `companies/${companyId}`,
          authInfo: { userId: user.uid, email: user.email }
        }));
      }

      // 2. Create company profile
      try {
        await setDoc(doc(db, 'companyProfile', companyId), {
          name: companyName,
          address: '',
          gstin: '',
          contactEmail: user.email,
          contactPhone: '',
          bankDetails: '',
          certifications: []
        });
      } catch (error) {
        console.error('Error creating company profile:', error);
        throw new Error(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          operationType: 'write',
          path: `companyProfile/${companyId}`,
          authInfo: { userId: user.uid, email: user.email }
        }));
      }

      // 3. Update user document
      try {
        await setDoc(doc(db, 'users', user.uid), {
          companyId: companyId,
          role: 'admin',
          status: 'active'
        }, { merge: true });
      } catch (error) {
        console.error('Error updating user:', error);
        throw new Error(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          operationType: 'write',
          path: `users/${user.uid}`,
          authInfo: { userId: user.uid, email: user.email }
        }));
      }

      setSuccess(true);
      setTimeout(() => onComplete(companyId), 1500);
    } catch (err) {
      console.error('Setup failed:', err);
      alert('Workspace creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center space-y-6">
          <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">Setup Complete!</h2>
          <p className="text-gray-500">Your workspace is ready. Redirecting you to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">Setup Your Company</h2>
          <p className="text-gray-500 mt-2">Create your business workspace to start generating professional quotes.</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Company Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Acme Solutions"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Create Workspace
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <button 
            onClick={() => auth.signOut()}
            className="text-sm font-bold text-gray-400 hover:text-red-600 transition-colors"
          >
            Sign out and try another account
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySetup;
