
import React, { useState } from 'react';
import { Product, QuoteItem, Quotation } from '../types';
import { LOCAL_STORAGE_ADMIN_SETTINGS_KEY, LOCAL_STORAGE_QUOTATIONS_KEY } from '../constants';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';

interface QuoteBuilderProps {
  products: Product[];
  onGenerateQuote: (quotation: Quotation) => void;
  initialQuotation?: Quotation | null;
}

const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ products, onGenerateQuote, initialQuotation }) => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  
  const [companyName, setCompanyName] = useState('Neoxe');
  const [tagLine, setTagLine] = useState('Fast & Reliable Quotations');
  const [companyAddress, setCompanyAddress] = useState('Office No. 402, Business Hub\nNew Delhi, India');
  const [companyPhone, setCompanyPhone] = useState('+91 98765 43210');
  const [companyEmail, setCompanyEmail] = useState('sales@quoteflow.in');
  const [useSameShipping, setUseSameShipping] = useState(true);
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const [clientCompanyName, setClientCompanyName] = useState('');
  const [clientGSTNumber, setClientGSTNumber] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [warranty, setWarranty] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  const [taxRateInput, setTaxRateInput] = useState<string>('18');
  const [freightCost, setFreightCost] = useState<string>('0');
  const [selectedItems, setSelectedItems] = useState<Map<string, { product: Product; quantity: number; customUnitPrice: number }>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const autoFillFromExisting = (key: 'clientPhone' | 'clientGSTNumber', value: string) => {
    if (!value || value.length < 5) return; // Don't search for very short strings

    try {
      const storedQuotes = localStorage.getItem(LOCAL_STORAGE_QUOTATIONS_KEY);
      if (storedQuotes) {
        const quotations: Quotation[] = JSON.parse(storedQuotes);
        // Find the most recent quotation with this phone or GST
        const match = quotations
          .sort((a, b) => parseInt(b.id) - parseInt(a.id))
          .find(q => {
            if (key === 'clientPhone') return q.clientPhone === value;
            if (key === 'clientGSTNumber') return q.clientGSTNumber === value;
            return false;
          });

        if (match) {
          if (match.clientName) setClientName(match.clientName);
          if (match.clientEmail) setClientEmail(match.clientEmail);
          if (match.clientAddress) setClientAddress(match.clientAddress);
          if (match.clientCompanyName) setClientCompanyName(match.clientCompanyName);
          if (match.clientGSTNumber && key !== 'clientGSTNumber') setClientGSTNumber(match.clientGSTNumber);
          if (match.clientPhone && key !== 'clientPhone') setClientPhone(match.clientPhone);
          
          // Also fill shipping if it was different
          if (match.shippingName) setShippingName(match.shippingName);
          if (match.shippingPhone) setShippingPhone(match.shippingPhone);
          if (match.shippingAddress) setShippingAddress(match.shippingAddress);
          
          // Check if shipping was same as billing in that quote
          const isSame = match.shippingName === match.clientName && 
                         match.shippingAddress === match.clientAddress && 
                         match.shippingPhone === match.clientPhone;
          setUseSameShipping(isSame);
        }
      }
    } catch (e) {
      console.error('Error auto-filling from existing quotes:', e);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  React.useEffect(() => {
    if (initialQuotation) {
      setClientName(initialQuotation.clientName || '');
      setClientEmail(initialQuotation.clientEmail || '');
      setClientPhone(initialQuotation.clientPhone || '');
      setClientAddress(initialQuotation.clientAddress || '');
      
      const isSameShipping = 
        (!initialQuotation.shippingName || initialQuotation.shippingName === initialQuotation.clientName) &&
        (!initialQuotation.shippingPhone || initialQuotation.shippingPhone === initialQuotation.clientPhone) &&
        (!initialQuotation.shippingAddress || initialQuotation.shippingAddress === initialQuotation.clientAddress);
      
      setUseSameShipping(isSameShipping);
      setShippingName(initialQuotation.shippingName || '');
      setShippingPhone(initialQuotation.shippingPhone || '');
      setShippingAddress(initialQuotation.shippingAddress || '');

      setClientCompanyName(initialQuotation.clientCompanyName || '');
      setClientGSTNumber(initialQuotation.clientGSTNumber || '');
      
      // Load current Admin Settings for fallback
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_ADMIN_SETTINGS_KEY);
      let adminSettings: any = {};
      if (storedSettings) {
        try {
          adminSettings = JSON.parse(storedSettings);
        } catch (e) {
          console.error('Failed to parse admin settings', e);
        }
      }

      setCompanyName(initialQuotation.companyName || adminSettings.companyName || 'Neoxe');
      setTagLine(initialQuotation.tagLine || adminSettings.tagLine || 'Fast & Reliable Quotations');
      setCompanyAddress(initialQuotation.companyAddress || adminSettings.companyAddress || 'Office No. 402, Business Hub\nNew Delhi, India');
      setCompanyPhone(initialQuotation.companyPhone || adminSettings.companyPhone || '+91 98765 43210');
      setCompanyEmail(initialQuotation.companyEmail || adminSettings.companyEmail || 'sales@quoteflow.in');
      setCompanyLogo(initialQuotation.companyLogo || adminSettings.companyLogo || '');
      setWarranty(initialQuotation.warranty || adminSettings.warranty || '');
      setPaymentTerms(initialQuotation.paymentTerms || adminSettings.paymentTerms || '');
      setTermsAndConditions(initialQuotation.termsAndConditions || adminSettings.termsAndConditions || '');
      setBankDetails(initialQuotation.bankDetails || adminSettings.bankDetails || '');

      setTaxRateInput((initialQuotation.taxRate * 100).toString());
      setFreightCost(initialQuotation.freightCost.toString());

      const itemsMap = new Map();
      initialQuotation.items.forEach(item => {
        // Find the original product to get its full details, or create a placeholder if it was deleted
        const product = products.find(p => p.id === item.productId) || {
          id: item.productId,
          name: item.name,
          description: item.description,
          detailedDescription: item.detailedDescription,
          unitPrice: item.unitPrice,
          image: item.image
        };
        itemsMap.set(item.productId, { product, quantity: item.quantity, customUnitPrice: item.unitPrice });
      });
      setSelectedItems(itemsMap);
    } else {
      // Reset form if no initial quotation
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setUseSameShipping(true);
      setShippingName('');
      setShippingPhone('');
      setShippingAddress('');
      setClientCompanyName('');
      setClientGSTNumber('');
      
      // Load defaults from Admin Settings
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_ADMIN_SETTINGS_KEY);
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings);
          setCompanyName(settings.companyName || 'Neoxe');
          setTagLine(settings.tagLine || 'Fast & Reliable Quotations');
          setCompanyAddress(settings.companyAddress || 'Office No. 402, Business Hub\nNew Delhi, India');
          setCompanyPhone(settings.companyPhone || '+91 98765 43210');
          setCompanyEmail(settings.companyEmail || 'sales@quoteflow.in');
          setCompanyLogo(settings.companyLogo || '');
          setWarranty(settings.warranty || '');
          setPaymentTerms(settings.paymentTerms || '');
          setTermsAndConditions(settings.termsAndConditions || '');
          setBankDetails(settings.bankDetails || '');
        } catch (e) {
          console.error('Failed to load admin settings in QuoteBuilder', e);
        }
      } else {
        setCompanyName('Neoxe');
        setTagLine('Fast & Reliable Quotations');
        setCompanyAddress('Office No. 402, Business Hub\nNew Delhi, India');
        setCompanyPhone('+91 98765 43210');
        setCompanyEmail('sales@quoteflow.in');
        setCompanyLogo('');
        setWarranty('');
        setPaymentTerms('');
        setTermsAndConditions('');
        setBankDetails('');
      }

      setTaxRateInput('18');
      setFreightCost('0');
      setSelectedItems(new Map());
      setErrors({});
    }
  }, [initialQuotation]);

  const handleAddItem = (product: Product) => {
    setSelectedItems((prev) => {
      const newItems = new Map<string, { product: Product; quantity: number; customUnitPrice: number }>(prev);
      const existing = newItems.get(product.id);
      if (existing) {
        newItems.set(product.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        newItems.set(product.id, { product, quantity: 1, customUnitPrice: product.unitPrice });
      }
      return newItems;
    });
  };

  const handleUpdateQuantity = (productId: string, quantityStr: string) => {
    // We handle empty string by allowing it to stay in state as 0 or null, 
    // but we don't delete the item until 'Remove' is clicked.
    const quantity = parseInt(quantityStr) || 0;
    setSelectedItems((prev) => {
      const newItems = new Map<string, { product: Product; quantity: number; customUnitPrice: number }>(prev);
      const existing = newItems.get(productId);
      if (existing) {
        newItems.set(productId, { ...existing, quantity: quantity });
      }
      return newItems;
    });
  };

  const handleUpdateUnitPrice = (productId: string, priceStr: string) => {
    const customUnitPrice = parseFloat(priceStr) || 0;
    setSelectedItems((prev) => {
      const newItems = new Map<string, { product: Product; quantity: number; customUnitPrice: number }>(prev);
      const existing = newItems.get(productId);
      if (existing) {
        newItems.set(productId, { ...existing, customUnitPrice });
      }
      return newItems;
    });
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => {
      const newItems = new Map<string, { product: Product; quantity: number; customUnitPrice: number }>(prev);
      newItems.delete(productId);
      return newItems;
    });
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!clientName.trim()) newErrors.clientName = 'Client name is required.';
    if (selectedItems.size === 0) newErrors.items = 'At least one product must be added to the quotation.';
    if (isNaN(parseFloat(taxRateInput)) || parseFloat(taxRateInput) < 0) {
      newErrors.taxRate = 'Tax rate must be a non-negative number.';
    }
    if (isNaN(parseFloat(freightCost)) || parseFloat(freightCost) < 0) {
      newErrors.freightCost = 'Freight cost must be a non-negative number.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateQuote = () => {
    if (!validate()) {
      alert('Please correct the errors before generating the quote.');
      return;
    }

    const items: QuoteItem[] = Array.from(selectedItems.values()).map(({ product, quantity, customUnitPrice }) => ({
      productId: product.id,
      name: product.name,
      description: product.description,
      detailedDescription: product.detailedDescription,
      unitPrice: customUnitPrice,
      quantity,
      lineTotal: customUnitPrice * quantity,
      image: product.image,
    }));

    const subtotal = items.reduce((sum: number, item: QuoteItem) => sum + item.lineTotal, 0);
    const parsedTaxRate = (parseFloat(taxRateInput) || 0) / 100;
    const parsedFreight = parseFloat(freightCost) || 0;
    
    const taxableAmount = subtotal + parsedFreight;
    const taxAmount = taxableAmount * parsedTaxRate;
    const total = taxableAmount + taxAmount;

    // Sequential Quote Number Logic
    let nextQuoteNumber = '101';
    try {
      const storedQuotes = localStorage.getItem(LOCAL_STORAGE_QUOTATIONS_KEY);
      if (storedQuotes) {
        const quotations: Quotation[] = JSON.parse(storedQuotes);
        if (quotations.length > 0) {
          // Extract numbers from quoteNumber strings like "Q-102" or "102"
          const numbers = quotations.map(q => {
            const match = q.quoteNumber.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          });
          const maxNumber = Math.max(...numbers);
          nextQuoteNumber = (maxNumber + 1).toString();
        }
      }
    } catch (e) {
      console.error('Error calculating next quote number', e);
    }

    const newQuotation: Quotation = {
      id: initialQuotation ? initialQuotation.id : Date.now().toString(),
      quoteNumber: initialQuotation ? initialQuotation.quoteNumber : nextQuoteNumber,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      clientName,
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientAddress: clientAddress.trim() || undefined,
      shippingName: useSameShipping ? clientName : (shippingName.trim() || undefined),
      shippingPhone: useSameShipping ? (clientPhone.trim() || undefined) : (shippingPhone.trim() || undefined),
      shippingAddress: useSameShipping ? (clientAddress.trim() || undefined) : (shippingAddress.trim() || undefined),
      items,
      subtotal,
      taxRate: parsedTaxRate,
      taxAmount,
      freightCost: parsedFreight,
      total,
      companyName,
      tagLine,
      companyAddress: companyAddress.trim() || undefined,
      companyPhone: companyPhone.trim() || undefined,
      companyEmail: companyEmail.trim() || undefined,
      companyDetails: `${clientCompanyName}\n${clientGSTNumber}`.trim() || undefined,
      clientCompanyName: clientCompanyName.trim() || undefined,
      clientGSTNumber: clientGSTNumber.trim() || undefined,
      companyLogo: companyLogo || undefined,
      warranty: warranty.trim() || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      termsAndConditions: termsAndConditions.trim() || undefined,
      bankDetails: bankDetails.trim() || undefined,
      revisionCount: initialQuotation ? (initialQuotation.revisionCount || 0) + 1 : 0,
    };

    onGenerateQuote(newQuotation);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setShippingName('');
    setShippingPhone('');
    setShippingAddress('');
    setUseSameShipping(true);
    setCompanyName('Neoxe');
    setTagLine('Fast & Reliable Quotations');
    setClientCompanyName('');
    setClientGSTNumber('');
    
    // Load defaults from Admin Settings
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_ADMIN_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings);
        setCompanyName(settings.companyName || 'Neoxe');
        setTagLine(settings.tagLine || 'Fast & Reliable Quotations');
        setCompanyAddress(settings.companyAddress || 'Office No. 402, Business Hub\nNew Delhi, India');
        setCompanyPhone(settings.companyPhone || '+91 98765 43210');
        setCompanyEmail(settings.companyEmail || 'sales@quoteflow.in');
        setCompanyLogo(settings.companyLogo || '');
        setWarranty(settings.warranty || '');
        setPaymentTerms(settings.paymentTerms || '');
        setTermsAndConditions(settings.termsAndConditions || '');
        setBankDetails(settings.bankDetails || '');
      } catch (e) {
        console.error('Failed to load admin settings in QuoteBuilder reset', e);
      }
    } else {
      setCompanyName('Neoxe');
      setTagLine('Fast & Reliable Quotations');
      setCompanyAddress('Office No. 402, Business Hub\nNew Delhi, India');
      setCompanyPhone('+91 98765 43210');
      setCompanyEmail('sales@quoteflow.in');
      setCompanyLogo('');
      setWarranty('');
      setPaymentTerms('');
      setTermsAndConditions('');
      setBankDetails('');
    }

    setTaxRateInput('18');
    setFreightCost('0');
    setSelectedItems(new Map());
    setErrors({});
  };

  const currentQuoteItems: { product: Product; quantity: number; customUnitPrice: number }[] = Array.from(selectedItems.values());
  const subtotal: number = currentQuoteItems.reduce((sum: number, item) => sum + item.customUnitPrice * item.quantity, 0);
  
  // Robust Fallbacks for calculation to prevent NaN UI
  const parsedTaxRateRaw = parseFloat(taxRateInput);
  const parsedTaxRate = isNaN(parsedTaxRateRaw) ? 0 : parsedTaxRateRaw / 100;
  
  const parsedFreightValueRaw = parseFloat(freightCost);
  const parsedFreightValue = isNaN(parsedFreightValueRaw) ? 0 : parsedFreightValueRaw;
  
  const taxableAmount: number = subtotal + parsedFreightValue;
  const taxAmount: number = taxableAmount * parsedTaxRate;
  const total: number = taxableAmount + taxAmount;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {initialQuotation ? `Edit Quotation ${initialQuotation.quoteNumber}` : 'Create New Quotation'}
      </h2>

      <section className="mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 bg-blue-50/30 p-6 rounded-xl border border-blue-100/50">
          <div className="flex-shrink-0">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="h-24 w-auto object-contain border-2 border-white rounded-lg p-2 bg-white shadow-md" />
            ) : (
              <div className="h-24 w-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center px-4">
                No Logo Set in Admin Panel
              </div>
            )}
          </div>
          <div className="text-center sm:text-left flex-1 space-y-2">
            <input 
              type="text" 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
              className="text-3xl font-extrabold text-blue-800 tracking-tight bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none w-full transition-colors"
              placeholder="Company Name"
            />
            <input 
              type="text" 
              value={tagLine} 
              onChange={(e) => setTagLine(e.target.value)} 
              className="text-blue-600/70 italic text-base font-medium bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none w-full transition-colors"
              placeholder="Tag Line"
            />
            <textarea
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="text-xs text-gray-600 bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none w-full resize-none transition-colors"
              placeholder="Company Address"
              rows={2}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="text-xs text-gray-600 bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none w-full transition-colors"
                placeholder="Phone"
              />
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="text-xs text-gray-600 bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none w-full transition-colors"
                placeholder="Email"
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[10px] h-7 px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => {
                  const storedSettings = localStorage.getItem(LOCAL_STORAGE_ADMIN_SETTINGS_KEY);
                  if (storedSettings) {
                    try {
                      const settings = JSON.parse(storedSettings);
                      setCompanyName(settings.companyName || 'Neoxe');
                      setTagLine(settings.tagLine || 'Fast & Reliable Quotations');
                      setCompanyAddress(settings.companyAddress || 'Office No. 402, Business Hub\nNew Delhi, India');
                      setCompanyPhone(settings.companyPhone || '+91 98765 43210');
                      setCompanyEmail(settings.companyEmail || 'sales@quoteflow.in');
                      setCompanyLogo(settings.companyLogo || '');
                    } catch (e) {
                      console.error('Manual sync failed', e);
                    }
                  }
                }}
              >
                Sync from Admin Settings
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Client Details (Bill To)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Textarea
            id="clientCompanyName"
            label="Client Company Name"
            value={clientCompanyName}
            onChange={(e) => setClientCompanyName(e.target.value)}
            placeholder="e.g., Acme Solutions Pvt. Ltd."
            rows={2}
          />
          <Textarea
            id="clientGSTNumber"
            label="Client GST Number"
            value={clientGSTNumber}
            onChange={(e) => {
              const val = e.target.value;
              setClientGSTNumber(val);
              autoFillFromExisting('clientGSTNumber', val);
            }}
            placeholder="GSTIN: 22AAAAA0000A1Z5"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="clientName"
            label="Client Name"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g., Acme Corp."
            error={errors.clientName}
          />
          <Input
            id="clientPhone"
            label="Phone Number (Optional)"
            type="tel"
            value={clientPhone}
            onChange={(e) => {
              const val = e.target.value;
              setClientPhone(val);
              autoFillFromExisting('clientPhone', val);
            }}
            placeholder="e.g., +91 98765 43210"
          />
        </div>
        <Input
          id="clientEmail"
          label="Client Email (Optional)"
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="e.g., contact@acmecorp.com"
        />
        <Textarea
          id="clientAddress"
          label="Client Address (Optional)"
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
          placeholder="123 Main St, Anytown, India"
        />
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h3 className="text-xl font-semibold text-gray-700">Shipping Details (Ship To)</h3>
          <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useSameShipping} 
              onChange={(e) => setUseSameShipping(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Same as Billing Address</span>
          </label>
        </div>
        
        {!useSameShipping && (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="shippingName"
                label="Shipping Name (Optional)"
                type="text"
                value={shippingName}
                onChange={(e) => setShippingName(e.target.value)}
                placeholder="e.g., Acme Corp. Warehouse"
              />
              <Input
                id="shippingPhone"
                label="Shipping Phone (Optional)"
                type="tel"
                value={shippingPhone}
                onChange={(e) => setShippingPhone(e.target.value)}
                placeholder="e.g., +91 98765 43210"
              />
            </div>
            <Textarea
              id="shippingAddress"
              label="Shipping Address (Optional)"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="456 Warehouse Blvd, Anytown, India"
            />
          </div>
        )}
      </section>

      <section className="mb-8 relative">
        <div className="border-b pb-2 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-gray-700">Search & Add Products</h3>
            {products.length > 0 && (
              <div className="relative w-full sm:w-96">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Type to search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border-2 border-blue-100 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-200 shadow-sm hover:border-blue-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {/* Search Results Dropdown */}
                {searchTerm.trim() !== '' && (
                  <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-96 overflow-y-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredProducts.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-gray-500 text-sm">No products found matching "{searchTerm}"</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            handleAddItem(product);
                            setSearchTerm('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-4 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="h-12 w-8 rounded overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                            {product.image ? (
                              <img src={product.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-300 bg-gray-50">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500 truncate">{product.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-blue-600">₹{product.unitPrice.toLocaleString('en-IN')}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Click to add</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-600">No products available in your catalog.</p>
            <p className="text-sm text-gray-500 mt-1">Please add products in the 'Manage Products' section first.</p>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Current Quote Items</h3>
        {errors.items && <p className="mb-4 text-sm text-red-600 font-medium">{errors.items}</p>}
        {selectedItems.size === 0 ? (
          <p className="text-gray-600 italic">No items added to the quote yet.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Line Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentQuoteItems.map(({ product, quantity, customUnitPrice }) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div className="h-12 w-7 rounded overflow-hidden mr-3 border border-gray-200 bg-gray-50 flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-300">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="mr-1">₹</span>
                        <Input
                          id={`price-${product.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={customUnitPrice === 0 ? '' : customUnitPrice.toString()}
                          onChange={(e) => handleUpdateUnitPrice(product.id, e.target.value)}
                          className="w-24 p-1 text-right mb-0"
                          label=""
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Input
                        id={`quantity-${product.id}`}
                        type="number"
                        min="1"
                        value={quantity === 0 ? '' : quantity.toString()}
                        onChange={(e) => handleUpdateQuantity(product.id, e.target.value)}
                        className="w-20 p-1 text-center mb-0"
                        label=""
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ₹{(customUnitPrice * quantity).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="danger" size="sm" onClick={() => handleRemoveItem(product.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Warranty, Terms & Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Textarea
            id="warranty"
            label="Warranty Information"
            value={warranty}
            onChange={(e) => setWarranty(e.target.value)}
            placeholder="1 Year Manufacturer Warranty"
            rows={3}
          />
          <Textarea
            id="termsAndConditions"
            label="Terms & Conditions"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            placeholder="1. Delivery within 7 days."
            rows={3}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="paymentTerms" 
                  value="50% Advance" 
                  checked={paymentTerms === '50% Advance'} 
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">50% Advance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="paymentTerms" 
                  value="100% Advance" 
                  checked={paymentTerms === '100% Advance'} 
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">100% Advance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="paymentTerms" 
                  value="" 
                  checked={paymentTerms === ''} 
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">None/Custom</span>
              </label>
            </div>
          </div>
          <Textarea
            id="bankDetails"
            label="Bank Details"
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
            placeholder="Bank Name: HDFC Bank&#10;A/C No: 1234567890&#10;IFSC: HDFC0001234"
            rows={3}
          />
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Quote Summary</h3>
        <div className="flex justify-end mb-4">
          <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-inner">
            <div className="flex justify-between items-center text-gray-700 py-2 border-b border-gray-200">
              <span className="font-semibold">Items Subtotal:</span>
              <span className="font-bold">₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="py-2 border-b border-gray-200">
              <Input
                id="freightCost"
                label="Freight/Transport Cost (₹)"
                type="number"
                step="0.01"
                min="0"
                value={freightCost}
                onChange={(e) => setFreightCost(e.target.value)}
                className="mb-0"
                error={errors.freightCost}
                placeholder="0.00"
              />
            </div>

            <div className="py-2 border-b border-gray-200">
              <Input
                id="taxRate"
                label="Tax Rate (%)"
                type="number"
                step="0.1"
                min="0"
                value={taxRateInput}
                onChange={(e) => setTaxRateInput(e.target.value)}
                className="mb-0"
                error={errors.taxRate}
              />
              <div className="flex justify-between items-center text-gray-600 text-sm mt-1">
                <span>Taxable Amount (Items + Freight):</span>
                <span>₹{taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600 text-sm mt-1">
                <span>Tax Amount:</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-2xl font-bold text-blue-700 pt-4 mt-2">
              <span>Grand Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <Button variant="primary" size="lg" onClick={generateQuote}>
            {initialQuotation ? 'Update Quotation' : 'Generate Quotation'}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default QuoteBuilder;
