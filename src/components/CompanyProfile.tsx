import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Save, Building2, Mail, Phone, MapPin, CreditCard, Award, Image as ImageIcon, CheckCircle2, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';

interface CompanyProfileData {
  name: string;
  logo?: string;
  address: string;
  gstin: string;
  contactEmail: string;
  contactPhone: string;
  certifications: string[];
  bankDetails: string;
  stamp?: string;
  signature?: string;
}

interface CompanyProfileProps {
  userRole: 'admin' | 'sales' | 'super_admin';
  companyId: string | null;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ userRole, companyId }) => {
  const [profile, setProfile] = useState<CompanyProfileData>({
    name: '',
    address: '',
    gstin: '',
    contactEmail: '',
    contactPhone: '',
    certifications: [],
    bankDetails: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'companies', companyId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProfile({
          name: data.name || '',
          address: data.address || '',
          gstin: data.gstin || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          certifications: data.certifications || [],
          bankDetails: data.bankDetails || '',
          logo: data.logo,
          stamp: data.stamp,
          signature: data.signature
        });
        setErrorMsg(null);
      } else {
        console.warn('Company profile not found for ID:', companyId);
        if (userRole === 'super_admin') {
          setErrorMsg('Company profile not found for ID: ' + companyId + '. You can create it by filling the details below and saving.');
          setProfile({
            name: '',
            address: '',
            gstin: '',
            contactEmail: '',
            contactPhone: '',
            certifications: [],
            bankDetails: ''
          });
        } else {
          setErrorMsg('Company profile not found. Please ensure your company is correctly set up.');
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching company profile:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof CompanyProfileData) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageLoading(prev => ({ ...prev, [field]: true }));
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setProfile({ ...profile, [field]: compressed });
        } catch (error) {
          console.error('Image compression failed:', error);
          setErrorMsg(`Failed to process ${field}. Please try a different image.`);
        } finally {
          setImageLoading(prev => ({ ...prev, [field]: false }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const cleanProfile: any = { ...profile };
      if (cleanProfile.logo === undefined) delete cleanProfile.logo;
      if (cleanProfile.stamp === undefined) delete cleanProfile.stamp;
      if (cleanProfile.signature === undefined) delete cleanProfile.signature;

      if (companyId) {
        await setDoc(doc(db, 'companies', companyId), cleanProfile, { merge: true });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        throw new Error('No Company ID found. Please contact support.');
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      const errInfo = {
        error: error.message || String(error),
        operationType: 'write',
        path: `companies/${companyId}`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          role: userRole,
          companyId: companyId
        }
      };
      console.error('Firestore Error Info:', JSON.stringify(errInfo));
      setErrorMsg('Failed to save Company Profile: ' + (error.message || 'Permission denied'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-500 mt-1">Configure your business details for quotations.</p>
        </div>
        {showSuccess && (
          <div
            className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl font-bold border border-green-100"
          >
            <CheckCircle2 className="h-5 w-5" />
            Saved Successfully
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center">
          <p>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Business Details</h2>
          </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Company Name *</label>
                <input
                  required
                  type="text"
                  disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">GSTIN *</label>
                <input
                  required
                  type="text"
                  disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none uppercase disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Contact Email</label>
                <input
                  type="email"
                  disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                  value={profile.contactEmail}
                  onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Contact Phone</label>
                <input
                  type="tel"
                  disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                  value={profile.contactPhone}
                  onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700">Address *</label>
                <textarea
                  required
                  rows={3}
                  disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
        </div>

        {/* Branding & Assets */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
            <ImageIcon className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Branding & Assets</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">Company Logo</label>
              <div className="h-40 w-full rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative group">
                {imageLoading.logo ? (
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                ) : profile.logo ? (
                  <>
                    <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                          Change Logo
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} disabled={imageLoading.logo} />
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <label className={cn("flex flex-col items-center gap-2", (userRole === 'admin' || userRole === 'super_admin') ? "cursor-pointer" : "")}>
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                    <span className="text-xs text-gray-400 font-medium">Upload Logo</span>
                    {(userRole === 'admin' || userRole === 'super_admin') && <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} disabled={imageLoading.logo} />}
                  </label>
                )}
              </div>
            </div>

            {/* Stamp */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">Company Stamp</label>
              <div className="h-40 w-full rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative group">
                {imageLoading.stamp ? (
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                ) : profile.stamp ? (
                  <>
                    <img src={profile.stamp} alt="Stamp" className="w-full h-full object-contain p-4" />
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                          Change Stamp
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'stamp')} disabled={imageLoading.stamp} />
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <label className={cn("flex flex-col items-center gap-2", (userRole === 'admin' || userRole === 'super_admin') ? "cursor-pointer" : "")}>
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                    <span className="text-xs text-gray-400 font-medium">Upload Stamp</span>
                    {(userRole === 'admin' || userRole === 'super_admin') && <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'stamp')} disabled={imageLoading.stamp} />}
                  </label>
                )}
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">Digital Signature</label>
              <div className="h-40 w-full rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative group">
                {imageLoading.signature ? (
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                ) : profile.signature ? (
                  <>
                    <img src={profile.signature} alt="Signature" className="w-full h-full object-contain p-4" />
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                          Change Signature
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'signature')} disabled={imageLoading.signature} />
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <label className={cn("flex flex-col items-center gap-2", (userRole === 'admin' || userRole === 'super_admin') ? "cursor-pointer" : "")}>
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                    <span className="text-xs text-gray-400 font-medium">Upload Signature</span>
                    {(userRole === 'admin' || userRole === 'super_admin') && <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'signature')} disabled={imageLoading.signature} />}
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
            <CreditCard className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Bank & Certifications</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Bank Details</label>
              <textarea
                rows={4}
                disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                placeholder="Bank Name, A/C No, IFSC, Branch..."
                value={profile.bankDetails}
                onChange={(e) => setProfile({ ...profile, bankDetails: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Certifications (One per line)</label>
              <textarea
                rows={4}
                disabled={userRole !== 'admin' && userRole !== 'super_admin'}
                placeholder="ISO 9001:2015&#10;CE Certified&#10;RoHS Compliant"
                value={profile.certifications.join('\n')}
                onChange={(e) => setProfile({ ...profile, certifications: e.target.value.split('\n').filter(s => s.trim()) })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {(userRole === 'admin' || userRole === 'super_admin') && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              Save Profile Settings
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default CompanyProfile;
