import React, { useState, useEffect, useRef } from 'react';
import { localApi } from '../services/localApi';
import { 
  Plus, Trash2, Save, Download, X, Search, User, Building2, 
  Package, ChevronDown, ChevronUp, Calculator, FileText, 
  Eye, ArrowLeft, PlusCircle, Settings2, MapPin, Loader2, Image as ImageIcon
} from 'lucide-react';
import { cn, formatCurrency, numberToWords } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';
import QuoteDisplay from './QuoteDisplay';

interface Specification {
  label: string;
  value: string;
}

interface QuoteItem {
  id: string;
  productId?: string;
  name: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
  specifications: Specification[];
  image?: string;
  showSpecs: boolean;
}

interface Client {
  id: string;
  name: string;
  companyName: string;
  address: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin: string;
  phone: string;
  email: string;
  state: string;
}

interface Product {
  id: string;
  name: string;
  hsnCode: string;
  defaultRate: number;
  specifications: Specification[];
  image?: string;
  type: string;
}

interface QuoteBuilderProps {
  quoteId: string | null;
  viewOnly?: boolean;
  onClose: () => void;
  userRole: 'admin' | 'sales' | 'super_admin';
  companyId: string | null;
}

const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ quoteId, viewOnly, onClose, userRole, companyId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(viewOnly || false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Form State
  const [quoteNumber, setQuoteNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [freight, setFreight] = useState<number | string>('');
  const [installation, setInstallation] = useState<number | string>('');
  const [gstRate, setGstRate] = useState(18);
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Accepted' | 'Rejected'>('Draft');
  const [paymentStatus, setPaymentStatus] = useState<'Unpaid' | 'Partial' | 'Paid'>('Unpaid');
  const [revision, setRevision] = useState(0);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string>('');

  // UI State
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add State - Clients
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientFormData, setClientFormData] = useState<Partial<Client>>({
    name: '', companyName: '', address: '', billingAddress: '', shippingAddress: '', gstin: '',
    state: '', phone: '', email: ''
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Quick Add State - Products
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productFormData, setProductFormData] = useState<Partial<Product>>({
    name: '', type: 'LED', hsnCode: '', specifications: []
  });
  const [isImageLoading, setIsImageLoading] = useState(false);

  const [termsAndConditions, setTermsAndConditions] = useState('');

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    if (!companyId && userRole !== 'super_admin') return;

    try {
      const [clientsData, productsData, quotesData] = await Promise.all([
        localApi.getClients(companyId || 'SUPER'),
        localApi.getProducts(companyId || 'SUPER'),
        localApi.getQuotations(companyId || 'SUPER')
      ]);
      setClients(clientsData.sort((a: any, b: any) => (a.companyName || '').localeCompare(b.companyName || '')));
      setProducts(productsData.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));

      if (!quoteId) {
        // Auto-generate next quote number
        if (Array.isArray(quotesData) && quotesData.length > 0) {
          const sorted = [...quotesData].sort((a: any, b: any) => {
            const aTime = new Date(a.createdAt || a.date || 0).getTime();
            const bTime = new Date(b.createdAt || b.date || 0).getTime();
            return bTime - aTime;
          });
          const lastQuote = sorted[0];
          const lastNumStr = lastQuote.quoteNumber;
          if (lastNumStr) {
            const regex = /(\d+)(?!.*\d)/;
            const match = lastNumStr.match(regex);
            if (match) {
              const numStr = match[1];
              const numVal = parseInt(numStr, 10);
              const nextVal = numVal + 1;
              const paddedNext = String(nextVal).padStart(numStr.length, '0');
              const lastIndex = lastNumStr.lastIndexOf(numStr);
              if (lastIndex !== -1) {
                const generated = lastNumStr.substring(0, lastIndex) + paddedNext + lastNumStr.substring(lastIndex + numStr.length);
                setQuoteNumber(generated);
              } else {
                setQuoteNumber(`QT-${nextVal}`);
              }
            } else {
              setQuoteNumber(lastNumStr + ' - 1');
            }
          } else {
            setQuoteNumber('QT-1001');
          }
        } else {
          setQuoteNumber('QT-1001');
        }
      }
    } catch (error: any) {
      setFetchError(error.message);
    }
  };

  useEffect(() => {
    loadData();
    
    // Load Existing Quote if editing
    if (quoteId) {
      const loadQuote = async () => {
        try {
          const data = await localApi.getQuotation(quoteId);
          if (data) {
            setQuoteNumber(data.quoteNumber);
            setDate(data.date);
            setSelectedClient(data.clientDetails);
            setBillingAddress(data.billingAddress || data.clientDetails?.address || '');
            setShippingAddress(data.shippingAddress || data.clientDetails?.address || '');
            setItems(data.items.map((item: any) => ({ ...item, id: Math.random().toString(36).substr(2, 9), showSpecs: false })));
            setFreight(data.freight || '');
            setInstallation(data.installation || '');
            setGstRate(data.gstRate || 18);
            setStatus(data.status);
            setPaymentStatus(data.paymentStatus || 'Unpaid');
            setRevision(data.revision || 0);
            setTermsAndConditions(data.termsAndConditions || '');
            setCreatedAt(data.createdAt || null);
            setUpdatedAt(data.updatedAt || null);
            setCreatedBy(data.createdBy || '');
          }
        } catch (error: any) {
          setFetchError(error.message);
        } finally {
          setLoading(false);
        }
      };
      loadQuote();
    } else {
      // Set logged-in user as creator
      setCreatedBy(localStorage.getItem('localUserId') || '');
      // Load Company Profile for default T&C
      const fetchProfileData = async () => {
        try {
          const profile = await localApi.getCompanyProfile(companyId || 'SUPER');
          if (profile) {
            setTermsAndConditions(profile.termsAndConditions || '');
          }
        } catch (error) {
          console.error("Failed to load company profile for T&C:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfileData();
    }
  }, [quoteId, userRole, companyId]);

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const taxableAmount = subtotal + (Number(freight) || 0) + (Number(installation) || 0);
  const gstAmount = (taxableAmount * gstRate) / 100;
  const totalBeforeRound = taxableAmount + gstAmount;
  const grandTotal = Math.round(totalBeforeRound);
  const roundOff = grandTotal - totalBeforeRound;
  const totalInWords = numberToWords(grandTotal);

  const handleAddItem = (product: Product) => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      name: product.name,
      hsnCode: product.hsnCode || '',
      quantity: 1,
      rate: product.defaultRate || 0,
      amount: product.defaultRate || 0,
      specifications: [...product.specifications],
      image: product.image,
      showSpecs: true
    };
    setItems([...items, newItem]);
    setShowProductDropdown(false);
    setProductSearch('');
  };

  const handleUpdateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        if ('quantity' in updates || 'rate' in updates) {
          updatedItem.amount = (updatedItem.quantity || 0) * (updatedItem.rate || 0);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (!selectedClient) {
      setErrorMsg('Please select a client');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Please add at least one item');
      return;
    }

    setSaving(true);
    const cleanItems = items.map(({ id, showSpecs, ...rest }) => {
      const cleanedItem: any = { ...rest };
      if (cleanedItem.image === undefined) delete cleanedItem.image;
      if (cleanedItem.productId === undefined) delete cleanedItem.productId;
      return cleanedItem;
    });

    if (!companyId) {
      setErrorMsg('Failed to save quotation: Company ID is missing. Please refresh the page.');
      return;
    }

    const quoteData = {
      companyId,
      quoteNumber,
      date,
      clientDetails: selectedClient,
      billingAddress,
      shippingAddress,
      items: cleanItems,
      subtotal: subtotal || 0,
      freight: Number(freight) || 0,
      installation: Number(installation) || 0,
      gstRate: gstRate || 0,
      gstAmount: gstAmount || 0,
      roundOff: roundOff || 0,
      grandTotal: grandTotal || 0,
      totalInWords,
      status,
      paymentStatus,
      termsAndConditions,
      revision: quoteId ? revision + 1 : 0,
      createdBy: createdBy || localStorage.getItem('localUserId') || 'Unknown'
    };

    try {
      if (quoteId) {
        await localApi.updateQuotation(quoteId, quoteData);
      } else {
        await localApi.createQuotation(quoteData);
      }
      onClose();
    } catch (error: any) {
      setErrorMsg('Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...productFormData,
        defaultRate: productFormData.defaultRate || 0,
        companyId,
        status: 'active'
      };
      const created = await localApi.createProduct(dataToSave);
      handleAddItem(created);
      await loadData();
      setShowAddProductModal(false);
      setProductFormData({ name: '', type: 'LED', hsnCode: '', specifications: [] });
    } catch (error: any) {
      setErrorMsg('Failed to add product');
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await localApi.createClient({
        ...clientFormData,
        address: clientFormData.billingAddress || clientFormData.address,
        companyId
      });
      setSelectedClient(created);
      setBillingAddress(created.billingAddress || created.address);
      setShippingAddress(created.shippingAddress || created.address);
      await loadData();
      setShowAddClientModal(false);
      setClientFormData({
        name: '', companyName: '', address: '', billingAddress: '', shippingAddress: '', gstin: '',
        state: '', phone: '', email: ''
      });
    } catch (error: any) {
      setErrorMsg('Failed to add client');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImageLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setProductFormData({ ...productFormData, image: compressed });
        } catch (error) {
          console.error('Image compression failed:', error);
        } finally {
          setIsImageLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (showPreview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => {
              if (viewOnly) {
                onClose();
              } else {
                setShowPreview(false);
              }
            }} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold"
          >
            <ArrowLeft className="h-5 w-5" /> {viewOnly ? 'Back to Dashboard' : 'Back to Editor'}
          </button>
          {!viewOnly && (
            <div className="flex gap-4">
              <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">
                Save Quotation
              </button>
            </div>
          )}
        </div>
        <QuoteDisplay 
          id={quoteId || undefined}
          data={{
            companyId: companyId || undefined,
            quoteNumber, date, clientDetails: selectedClient!, items, 
            subtotal, freight, installation, gstRate, gstAmount, 
            roundOff, grandTotal, totalInWords,
            billingAddress,
            shippingAddress,
            revision: quoteId ? revision + 1 : 0,
            createdAt: createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{quoteId ? 'Edit Quotation' : 'Create New Quotation'}</h1>
            <p className="text-gray-500 mt-1">Fill in the details below to generate a professional quote.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            <Eye className="h-5 w-5" />
            Preview PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="h-5 w-5" />}
            Save & Close
          </button>
        </div>
      </div>

      {(errorMsg || fetchError) && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center">
          <p>{errorMsg || fetchError}</p>
          <button onClick={() => { setErrorMsg(null); setFetchError(null); }} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Client & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-gray-900">Client Information</h2>
            </div>

            <div className="space-y-4">
              <div className="relative" ref={clientDropdownRef}>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Search Client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by company or name..."
                    value={clientSearch}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                
                  {showClientDropdown && (
                    <div
                      className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto"
                    >
                      <div className="p-2 border-b border-gray-50 flex justify-center">
                        <button
                          onClick={() => {
                            setClientFormData(prev => ({ ...prev, companyName: clientSearch }));
                            setShowAddClientModal(true);
                            setShowClientDropdown(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          <PlusCircle className="h-4 w-4" /> Add "{clientSearch || 'New Client'}"
                        </button>
                      </div>
                      {clients.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
                          <User className="h-8 w-8 text-gray-200" />
                          <p>No clients found in database</p>
                          <p className="text-xs">Go to Clients tab to add your first client</p>
                        </div>
                      ) : clients.filter(c => 
                        (c.companyName || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                        (c.name || '').toLowerCase().includes(clientSearch.toLowerCase())
                      ).length > 0 ? (
                        clients.filter(c => 
                          (c.companyName || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                          (c.name || '').toLowerCase().includes(clientSearch.toLowerCase())
                        ).map(client => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setBillingAddress(client.billingAddress || client.address);
                              setShippingAddress(client.shippingAddress || client.address);
                              setShowClientDropdown(false);
                              setClientSearch('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <p className="font-bold text-gray-900 text-sm">{client.companyName || 'No Company Name'}</p>
                            <p className="text-xs text-gray-500">{client.name} • {client.phone}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 text-gray-200" />
                          <p>No clients found matching "{clientSearch}"</p>
                          <p className="text-xs">Try searching by company name or contact person</p>
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {selectedClient ? (
                <div
                  className="p-4 bg-blue-50 rounded-xl border border-blue-100 relative"
                >
                  <button 
                    onClick={() => setSelectedClient(null)}
                    className="absolute top-2 right-2 p-1 hover:bg-blue-200 rounded-full text-blue-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{selectedClient.companyName}</h3>
                      <p className="text-xs text-gray-500">{selectedClient.name}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs text-gray-600">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Bill To:</label>
                      <textarea
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="w-full p-2 bg-white border border-blue-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Ship To:</label>
                      <textarea
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full p-2 bg-white border border-blue-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                    </div>
                    <p className="flex items-center gap-2 font-mono font-bold text-blue-700 uppercase pt-1">GST: {selectedClient.gstin || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400">No client selected</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-4">
              <FileText className="h-5 w-5 text-purple-600" />
              <h2 className="font-bold text-gray-900">Quotation Details</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quote Number</label>
                <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Items & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                <h2 className="font-bold text-gray-900">Quotation Items</h2>
              </div>
              <div className="relative" ref={productDropdownRef}>
                <button
                  onClick={() => setShowProductDropdown(!showProductDropdown)}
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Item
                </button>
                
                  {showProductDropdown && (
                    <div
                      className="absolute right-0 z-50 w-80 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-50">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search products..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-100 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        <div className="p-2 border-b border-gray-50">
                          <button
                             onClick={() => {
                              setProductFormData(prev => ({ ...prev, name: productSearch }));
                              setShowAddProductModal(true);
                              setShowProductDropdown(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            <PlusCircle className="h-4 w-4" /> Add "{productSearch || 'New Product'}"
                          </button>
                        </div>
                        {products.length === 0 ? (
                          <div className="px-4 py-8 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-gray-200" />
                            <p>No products found in database</p>
                            <p className="text-xs">Go to Products tab to add your first product</p>
                          </div>
                        ) : products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase())).length > 0 ? (
                          products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase())).map(product => (
                            <button
                              key={product.id}
                              onClick={() => handleAddItem(product)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex items-center gap-3"
                            >
                              <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                <Package className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-xs">{product.name}</p>
                                <p className="text-[10px] text-gray-500">₹{product.defaultRate.toLocaleString()}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-gray-200" />
                            <p>No products found matching "{productSearch}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <div className="bg-gray-50/50 p-4 flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400">#{index + 1}</span>
                        <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                      </div>
                      <p className="text-xs text-gray-500">HSN: {item.hsnCode || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Rate (₹)</label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(item.id, { rate: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-bold text-blue-600"
                        />
                      </div>
                      <div className="text-right w-32">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Amount</label>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateItem(item.id, { showSpecs: !item.showSpecs })}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            item.showSpecs ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100"
                          )}
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                    {item.showSpecs && (
                      <div
                        className="overflow-hidden border-t border-gray-50"
                      >
                        <div className="p-4 bg-white space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Technical Specifications</h4>
                            <button
                              onClick={() => {
                                const newSpecs = [...item.specifications, { label: '', value: '' }];
                                handleUpdateItem(item.id, { specifications: newSpecs });
                              }}
                              className="text-blue-600 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Spec
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {item.specifications.map((spec, sIdx) => (
                              <div key={sIdx} className="flex gap-2 items-center">
                                <input
                                  placeholder="Label"
                                  value={spec.label}
                                  onChange={(e) => {
                                    const newSpecs = [...item.specifications];
                                    newSpecs[sIdx].label = e.target.value;
                                    handleUpdateItem(item.id, { specifications: newSpecs });
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-100 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <input
                                  placeholder="Value"
                                  value={spec.value}
                                  onChange={(e) => {
                                    const newSpecs = [...item.specifications];
                                    newSpecs[sIdx].value = e.target.value;
                                    handleUpdateItem(item.id, { specifications: newSpecs });
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-100 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <button
                                  onClick={() => {
                                    const newSpecs = item.specifications.filter((_, i) => i !== sIdx);
                                    handleUpdateItem(item.id, { specifications: newSpecs });
                                  }}
                                  className="text-gray-300 hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <div className="mx-auto h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-gray-300" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">No items added</h3>
                  <p className="text-xs text-gray-500 mt-1">Search and add products from the database above.</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-4">
              <Calculator className="h-5 w-5 text-green-600" />
              <h2 className="font-bold text-gray-900">Pricing Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Freight Charges (₹)</label>
                    <input
                      type="number"
                      value={freight}
                      onChange={(e) => setFreight(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Installation (₹)</label>
                    <input
                      type="number"
                      value={installation}
                      onChange={(e) => setInstallation(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">GST Rate (%)</label>
                  <div className="flex gap-2">
                    {[0, 5, 12, 18, 28].map(rate => (
                      <button
                        key={rate}
                        onClick={() => setGstRate(rate)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                          gstRate === rate ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Freight & Installation</span>
                  <span className="font-bold text-gray-900">{formatCurrency((Number(freight) || 0) + (Number(installation) || 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST ({gstRate}%)</span>
                  <span className="font-bold text-gray-900">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Round Off</span>
                  <span className="font-bold text-gray-900">{formatCurrency(roundOff)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Grand Total</span>
                  <span className="text-2xl font-black text-blue-600">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="pt-2 text-[10px] font-bold text-gray-400 text-right uppercase tracking-wider italic">
                  {totalInWords}
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions Editor */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-4">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="font-bold text-gray-900 text-lg">Terms & Conditions</h2>
            </div>
            <textarea
              rows={6}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="Enter terms and conditions here (one per line)..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium leading-relaxed resize-none"
            />
            <p className="text-[10px] text-gray-400 italic">This will appear at the bottom of the quotation.</p>
          </div>
        </div>
      </div>
      {/* Quick Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Quick Add Client</h2>
              <button onClick={() => setShowAddClientModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Company Name *</label>
                <input required type="text" value={clientFormData.companyName} onChange={(e) => setClientFormData({ ...clientFormData, companyName: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Contact Person *</label>
                <input required type="text" value={clientFormData.name} onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Phone *</label>
                <input required type="tel" value={clientFormData.phone} onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Email</label>
                <input type="email" value={clientFormData.email} onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Billing Address *</label>
                  <textarea required rows={2} value={clientFormData.billingAddress || clientFormData.address} onChange={(e) => {
                    const val = e.target.value;
                    setClientFormData(prev => ({ ...prev, billingAddress: val, shippingAddress: sameAsBilling ? val : prev.shippingAddress }));
                  }} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                </div>
                {!sameAsBilling && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Shipping Address *</label>
                    <textarea required rows={2} value={clientFormData.shippingAddress} onChange={(e) => setClientFormData({ ...clientFormData, shippingAddress: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Save Client</button>
                <button type="button" onClick={() => setShowAddClientModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Quick Add Product</h2>
              <button onClick={() => setShowAddProductModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Product Name *</label>
                  <input required type="text" value={productFormData.name} onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Type *</label>
                    <select value={productFormData.type} onChange={(e) => setProductFormData({ ...productFormData, type: e.target.value as any })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="LED">LED Display</option>
                      <option value="Standee">Digital Standee</option>
                      <option value="Kiosk">Kiosk</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">HSN Code</label>
                    <input type="text" value={productFormData.hsnCode} onChange={(e) => setProductFormData({ ...productFormData, hsnCode: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Default Rate (₹)</label>
                  <input type="number" value={productFormData.defaultRate ?? ''} onChange={(e) => setProductFormData({ ...productFormData, defaultRate: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Product Image</label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                      {isImageLoading ? <Loader2 className="h-6 w-6 text-blue-500 animate-spin" /> : productFormData.image ? <img src={productFormData.image} className="w-full h-full object-cover" /> : <ImageIcon className="h-6 w-6 text-gray-300" />}
                    </div>
                    <label className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all">
                      {isImageLoading ? 'Processing...' : 'Upload Image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isImageLoading} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Specifications</label>
                  <button type="button" onClick={() => setProductFormData({ ...productFormData, specifications: [...(productFormData.specifications || []), { label: '', value: '' }] })} className="text-blue-600 text-xs font-bold flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
                </div>
                <div className="space-y-2">
                  {productFormData.specifications?.map((spec, i) => (
                    <div key={i} className="flex gap-2">
                      <input placeholder="Label" value={spec.label} onChange={(e) => {
                        const newSpecs = [...(productFormData.specifications || [])];
                        newSpecs[i].label = e.target.value;
                        setProductFormData({ ...productFormData, specifications: newSpecs });
                      }} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm" />
                      <input placeholder="Value" value={spec.value} onChange={(e) => {
                        const newSpecs = [...(productFormData.specifications || [])];
                        newSpecs[i].value = e.target.value;
                        setProductFormData({ ...productFormData, specifications: newSpecs });
                      }} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm" />
                      <button type="button" onClick={() => {
                        const newSpecs = [...(productFormData.specifications || [])];
                        newSpecs.splice(i, 1);
                        setProductFormData({ ...productFormData, specifications: newSpecs });
                      }} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 pt-6 flex gap-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">Add Product</button>
                <button type="button" onClick={() => setShowAddProductModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteBuilder;
