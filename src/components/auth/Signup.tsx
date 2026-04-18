import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, serverTimestamp, getDoc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Mail, Lock, Building2, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { motion } from 'framer-motion';

interface SignupProps {
  onSwitchToLogin: () => void;
  onBackToLanding: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSwitchToLogin, onBackToLanding }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isInvited, setIsInvited] = useState(false);

  const checkInvitation = async (email: string) => {
    if (!email.includes('@')) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCompId = params.get('compId');
      
      const invitationId = `invitation_${email.trim().toLowerCase()}`;
      const invDoc = await getDoc(doc(db, 'users', invitationId));
      setIsInvited(invDoc.exists() || !!urlCompId);
    } catch (err) {
      console.error('Error checking invitation:', err);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Check if user is invited
      const trimmedEmail = email.trim().toLowerCase();
      const invitationId = `invitation_${trimmedEmail}`;
      console.log(`[Signup] Checking invitation for ${trimmedEmail} (ID: ${invitationId})`);
      
      let finalCompanyId = '';
      let finalRole: 'admin' | 'sales' = 'admin';
      let isInvited = false;

      try {
        const params = new URLSearchParams(window.location.search);
        const urlCompId = params.get('compId');

        const invDoc = await getDoc(doc(db, 'users', invitationId));
        if (invDoc.exists()) {
          const invData = invDoc.data();
          console.log('[Signup] Invitation found:', invData);
          finalCompanyId = invData.companyId;
          finalRole = invData.role;
          isInvited = true;
        } else if (urlCompId) {
          console.log('[Signup] Invitation not found, but compId found in URL:', urlCompId);
          finalCompanyId = urlCompId;
          finalRole = 'sales'; // Default to sales if joining via link
          isInvited = true;
        } else {
          console.log('[Signup] No invitation found by ID, searching by email field...');
          const q = query(collection(db, 'users'), where('email', '==', trimmedEmail));
          const querySnapshot = await getDocs(q);
          const placeholderDoc = querySnapshot.docs.find(d => d.data().isPlaceholder || d.id.startsWith('invitation_'));
          if (placeholderDoc) {
            const invData = placeholderDoc.data();
            console.log('[Signup] Invitation found by email search:', invData);
            finalCompanyId = invData.companyId;
            finalRole = invData.role;
            isInvited = true;
          } else {
            console.log('[Signup] No invitation found, creating new company');
            // Create a unique company ID (slugified name + random string)
            finalCompanyId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
          }
        }
      } catch (err) {
        console.error('[Signup] Error checking invitation:', err);
        // Fallback to creating new company if check fails
        finalCompanyId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
      }

      // 2. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!isInvited) {
        // 3. Create company document
        await setDoc(doc(db, 'companies', finalCompanyId), {
          name: companyName,
          createdAt: serverTimestamp(),
          ownerId: user.uid,
          ownerEmail: trimmedEmail,
          status: 'active',
          plan: 'free'
        });

        // 4. Create company settings (profile)
        await setDoc(doc(db, 'companyProfile', finalCompanyId), {
          name: companyName,
          address: '',
          gstin: '',
          contactEmail: email,
          contactPhone: '',
          bankDetails: '',
          certifications: []
        });
      }

      // 5. Create user document
      await setDoc(doc(db, 'users', user.uid), {
        email: trimmedEmail,
        displayName: fullName,
        role: finalRole,
        companyId: finalCompanyId,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // 6. Delete invitation if it exists
      if (isInvited) {
        await deleteDoc(doc(db, 'users', invitationId));
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Account Created!" subtitle="Your SaaS workspace is ready">
        <div className="text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">
            Welcome to QuoteFlow! Your company workspace has been set up successfully.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-100 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Start Free Trial" subtitle="Launch your quotation management platform">
      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Work Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value.includes('@')) {
                  checkInvitation(e.target.value);
                }
              }}
              onBlur={() => checkInvitation(email)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="john@acme.com"
            />
          </div>
          {isInvited && (
            <p className="mt-1 text-[10px] text-purple-600 font-bold uppercase tracking-wider">
              ✨ You have been invited to join a company!
            </p>
          )}
        </div>

        {!isInvited && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Company Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                required={!isInvited}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Acme Corp"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-100 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center space-y-4">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </button>
        </p>
        <button 
          onClick={onBackToLanding}
          className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    </AuthLayout>
  );
};

export default Signup;
