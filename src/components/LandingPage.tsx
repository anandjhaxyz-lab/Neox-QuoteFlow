import React from 'react';
import { 
  CheckCircle2, 
  Zap, 
  Shield, 
  Users, 
  LayoutDashboard, 
  FileText, 
  ArrowRight,
  Star,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const plans = [
    {
      name: "Free Trial",
      price: "₹0",
      period: "/14 days",
      description: "Perfect for testing the platform",
      features: [
        "Up to 10 Quotes/mo",
        "Basic PDF Export",
        "1 User Access",
        "Client Database",
        "Standard Support"
      ],
      buttonText: "Start Free Trial",
      highlight: false
    },
    {
      name: "Basic",
      price: "₹999",
      period: "/month",
      description: "Best for small sales teams",
      features: [
        "Unlimited Quotes",
        "Custom Branding",
        "3 User Access",
        "Team Management",
        "Priority Support"
      ],
      buttonText: "Get Started",
      highlight: true
    },
    {
      name: "Pro",
      price: "₹2,499",
      period: "/month",
      description: "For growing businesses",
      features: [
        "Everything in Basic",
        "Advanced Analytics",
        "10 User Access",
        "Custom Integrations",
        "24/7 Premium Support"
      ],
      buttonText: "Go Pro",
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <FileText className="text-white h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">QuoteFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
            >
              Login
            </button>
            <button 
              onClick={onGetStarted}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-bold mb-8 animate-bounce">
            <Star className="h-4 w-4 fill-current" />
            <span>Trusted by 500+ Businesses</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
            Create Professional Quotes <br />
            <span className="text-blue-600">in Just 2 Minutes</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop wasting hours on Excel. QuoteFlow helps you generate, manage, and track professional quotations with your sales team from anywhere.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              Start Your 14-Day Free Trial <ArrowRight className="h-5 w-5" />
            </button>
            <button className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all">
              Watch Demo
            </button>
          </div>
          
          {/* Hero Image / Mockup */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full -z-10"></div>
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-5xl mx-auto">
              <img 
                src="https://picsum.photos/seed/dashboard/1200/800" 
                alt="Dashboard Preview" 
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Powerful features designed to help you close deals faster and manage your team efficiently.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Create professional PDF quotations in seconds. No more manual calculations or formatting issues."
              },
              {
                icon: Users,
                title: "Team Management",
                desc: "Assign roles to your sales team. Track their performance and manage access in real-time."
              },
              {
                icon: Shield,
                title: "Secure & Reliable",
                desc: "Your data is encrypted and backed up daily. Access your business from any device, anywhere."
              },
              {
                icon: LayoutDashboard,
                title: "Smart Analytics",
                desc: "Get insights into your sales pipeline. See which quotes are pending, approved, or expired."
              },
              {
                icon: FileText,
                title: "Custom Branding",
                desc: "Add your logo, business details, and custom terms to every quotation you send."
              },
              {
                icon: CheckCircle2,
                title: "Client Database",
                desc: "Maintain a central database of all your clients for quick access and re-quoting."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl transition-all group">
                <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-500">Choose the plan that fits your business needs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <div 
                key={i} 
                className={cn(
                  "p-10 rounded-3xl border transition-all relative overflow-hidden",
                  plan.highlight 
                    ? "border-blue-600 shadow-2xl shadow-blue-100 scale-105 z-10 bg-white" 
                    : "border-gray-100 bg-white hover:border-blue-200"
                )}
              >
                {plan.highlight && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-xs font-bold rounded-bl-xl uppercase tracking-widest">
                    Best Value
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-gray-600">
                      <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={onGetStarted}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all",
                    plan.highlight 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700" 
                      : "bg-gray-50 text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">Ready to transform your sales?</h2>
          <p className="text-blue-100 text-xl mb-10 max-w-2xl mx-auto relative z-10">
            Join hundreds of businesses that are saving time and closing more deals with QuoteFlow.
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-white text-blue-600 px-12 py-5 rounded-2xl font-bold text-xl shadow-xl hover:bg-gray-50 transition-all relative z-10"
          >
            Get Started for Free
          </button>
          <p className="mt-6 text-blue-200 text-sm relative z-10">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="text-white h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">QuoteFlow</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 QuoteFlow. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600">Terms of Service</a>
            <a href="#" className="hover:text-blue-600">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
