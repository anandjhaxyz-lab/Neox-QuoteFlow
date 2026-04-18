import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CreditCard, CheckCircle2, AlertTriangle, Calendar, ShieldCheck, Zap, Crown } from 'lucide-react';
import { cn } from '../lib/utils';

interface CompanyData {
  id: string;
  name: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  expiryDate?: string | null;
  status: string;
}

interface SubscriptionProps {
  companyId: string;
}

const Subscription: React.FC<SubscriptionProps> = ({ companyId }) => {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const unsubscribe = onSnapshot(doc(db, 'companies', companyId), (doc) => {
      if (doc.exists()) {
        setCompany({ id: doc.id, ...doc.data() } as CompanyData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (!company) return <div>Company not found</div>;

  const plans = [
    {
      id: 'free',
      name: 'Free Trial',
      price: '₹0',
      icon: Zap,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      features: ['Up to 10 Quotes/mo', 'Basic PDF Export', '1 User Access']
    },
    {
      id: 'basic',
      name: 'Basic',
      price: '₹999/mo',
      icon: ShieldCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
      features: ['Unlimited Quotes', 'Custom Branding', '3 User Access', 'Client Database']
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹2,499/mo',
      icon: Crown,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      features: ['Everything in Basic', 'Advanced Analytics', '10 User Access', 'Priority Support']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      icon: ShieldCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      features: ['Everything in Pro', 'Unlimited Users', 'Dedicated Account Manager', 'Custom Integrations']
    }
  ];

  const currentPlan = plans.find(p => p.id === (company.plan || 'free')) || plans[0];
  const isExpired = company.expiryDate ? new Date(company.expiryDate) < new Date() : false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
        <p className="text-gray-500 mt-1">Manage your plan and view billing details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className={cn(
              "absolute top-0 right-0 px-6 py-2 rounded-bl-2xl text-xs font-bold uppercase tracking-widest",
              isExpired ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
            )}>
              {isExpired ? 'Expired' : 'Active'}
            </div>

            <div className="flex items-start gap-6">
              <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center", currentPlan.bg, currentPlan.color)}>
                <currentPlan.icon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Current Plan</h3>
                <h2 className="text-3xl font-black text-gray-900 mb-2">{currentPlan.name}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Renews on: {company.expiryDate ? new Date(company.expiryDate).toLocaleDateString() : 'Never'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span>{currentPlan.price}</span>
                  </div>
                </div>
              </div>
            </div>

            {isExpired && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">Your subscription has expired. Please upgrade to continue using all features.</p>
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPlan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Billing History Placeholder */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Billing History</h3>
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8" />
              </div>
              <p className="text-gray-400 text-sm">No billing history available yet.</p>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Available Plans</h3>
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={cn(
                "p-6 rounded-2xl border transition-all cursor-pointer group",
                plan.id === currentPlan.id 
                  ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600" 
                  : "border-gray-100 bg-white hover:border-blue-200 hover:shadow-md"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", plan.bg, plan.color)}>
                  <plan.icon className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{plan.price}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest">per month</div>
                </div>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">{plan.name}</h4>
              <p className="text-xs text-gray-500 mb-4">Perfect for {plan.id === 'free' ? 'testing' : plan.id === 'basic' ? 'small teams' : plan.id === 'pro' ? 'growing businesses' : 'large organizations'}.</p>
              
              {plan.id !== currentPlan.id && (
                <button className="w-full py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                  Upgrade to {plan.name}
                </button>
              )}
              {plan.id === currentPlan.id && (
                <div className="flex items-center justify-center gap-2 text-blue-600 text-sm font-bold py-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Current Plan
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
