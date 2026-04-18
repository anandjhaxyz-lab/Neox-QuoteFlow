
import React, { useState, useEffect } from 'react';
import { LOCAL_STORAGE_ADMIN_SETTINGS_KEY } from '../constants';
import Button from './Button';
import Textarea from './Textarea';

interface AdminSettings {
  companyName: string;
  tagLine: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string;
  bankDetails: string;
  termsAndConditions: string;
  warranty: string;
  paymentTerms: string;
}

const AdminPanel: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings>({
    companyName: 'Neoxe',
    tagLine: 'Fast & Reliable Quotations',
    companyAddress: 'Office No. 402, Business Hub\nNew Delhi, India',
    companyPhone: '+91 98765 43210',
    companyEmail: 'sales@quoteflow.in',
    companyLogo: '',
    bankDetails: '',
    termsAndConditions: '',
    warranty: '',
    paymentTerms: '',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_ADMIN_SETTINGS_KEY);
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error('Failed to parse admin settings', e);
      }
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, companyLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaveStatus('saving');
    localStorage.setItem(LOCAL_STORAGE_ADMIN_SETTINGS_KEY, JSON.stringify(settings));
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <h2 className="text-3xl font-extrabold text-gray-800">Admin Settings</h2>
        <div className="flex items-center gap-4">
          {saveStatus === 'saved' && <span className="text-green-600 font-medium animate-pulse">Settings Saved!</span>}
          <Button onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Company Info Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-blue-700 mb-2 uppercase tracking-wide">Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="e.g., Neoxe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-blue-700 mb-2 uppercase tracking-wide">Tag Line</label>
            <input
              type="text"
              value={settings.tagLine}
              onChange={(e) => setSettings(prev => ({ ...prev, tagLine: e.target.value }))}
              placeholder="e.g., Fast & Reliable Quotations"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-blue-700 mb-2 uppercase tracking-wide">Company Address</label>
            <Textarea
              id="companyAddress"
              value={settings.companyAddress}
              onChange={(e) => setSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
              placeholder="e.g., Office No. 402, Business Hub&#10;New Delhi, India"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-blue-700 mb-2 uppercase tracking-wide">Phone Number</label>
            <input
              type="text"
              value={settings.companyPhone}
              onChange={(e) => setSettings(prev => ({ ...prev, companyPhone: e.target.value }))}
              placeholder="e.g., +91 98765 43210"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-blue-700 mb-2 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              value={settings.companyEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, companyEmail: e.target.value }))}
              placeholder="e.g., sales@quoteflow.in"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </section>

        {/* Logo Section */}
        <section>
          <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </h3>
          <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="w-32 h-32 bg-white rounded border flex items-center justify-center overflow-hidden">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs text-center px-2">No Logo Uploaded</span>
              )}
            </div>
            <div className="flex-1">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500 italic">This logo will be displayed at the top of every quotation.</p>
              {settings.companyLogo && (
                <button 
                  onClick={() => setSettings(prev => ({ ...prev, companyLogo: '' }))}
                  className="mt-2 text-red-600 text-xs font-bold hover:underline"
                >
                  Remove Logo
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Bank Details Section */}
        <section>
          <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Default Bank Details
          </h3>
          <Textarea
            id="bankDetails"
            value={settings.bankDetails}
            onChange={(e) => setSettings(prev => ({ ...prev, bankDetails: e.target.value }))}
            placeholder="Bank Name: HDFC Bank&#10;A/C No: 1234567890&#10;IFSC: HDFC0001234"
            rows={4}
          />
        </section>

        {/* Terms & Warranty Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Default Warranty Info
            </h3>
            <Textarea
              id="warranty"
              value={settings.warranty}
              onChange={(e) => setSettings(prev => ({ ...prev, warranty: e.target.value }))}
              placeholder="1 Year Manufacturer Warranty"
              rows={4}
            />
          </section>
          <section>
            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Default Terms & Conditions
            </h3>
            <Textarea
              id="termsAndConditions"
              value={settings.termsAndConditions}
              onChange={(e) => setSettings(prev => ({ ...prev, termsAndConditions: e.target.value }))}
              placeholder="1. Delivery within 7 days."
              rows={4}
            />
          </section>
        </div>

        {/* Payment Terms Section */}
        <section>
          <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Default Payment Terms
          </h3>
          <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="paymentTerms" 
                value="50% Advance" 
                checked={settings.paymentTerms === '50% Advance'} 
                onChange={(e) => setSettings(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-700">50% Advance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="paymentTerms" 
                value="100% Advance" 
                checked={settings.paymentTerms === '100% Advance'} 
                onChange={(e) => setSettings(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-700">100% Advance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="paymentTerms" 
                value="" 
                checked={settings.paymentTerms === ''} 
                onChange={(e) => setSettings(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-700">None/Custom</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;
