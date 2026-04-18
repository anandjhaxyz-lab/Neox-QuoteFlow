import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Download, FileText, Printer, Share2, Mail, MapPin, Phone, Award, Package } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import html2pdf from 'html2pdf.js';

interface QuoteDisplayProps {
  id?: string;
  data: {
    quoteNumber: string;
    date: string;
    clientDetails: {
      name: string;
      companyName: string;
      address: string;
      gstin: string;
      phone: string;
      email: string;
      state: string;
    };
    billingAddress?: string;
    shippingAddress?: string;
    items: any[];
    subtotal: number;
    freight: number;
    installation: number;
    gstRate: number;
    gstAmount: number;
    roundOff: number;
    grandTotal: number;
    totalInWords: string;
    revision?: number;
    createdAt?: string;
    updatedAt?: string;
  };
}

const QuoteDisplay: React.FC<QuoteDisplayProps> = ({ id, data }) => {
  const [company, setCompany] = useState<any>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'companyProfile', 'settings'));
        if (docSnap.exists()) {
          setCompany(docSnap.data());
        } else {
          setCompany({
            name: 'Your Company Name',
            address: 'Your Address',
            contactPhone: '',
            contactEmail: '',
            gstin: '',
            bankDetails: '',
            certifications: []
          });
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
        setCompany({
          name: 'Your Company Name',
          address: 'Your Address',
          contactPhone: '',
          contactEmail: '',
          gstin: '',
          bankDetails: '',
          certifications: []
        });
      }
    };
    fetchCompany();
  }, []);

  const handleDownload = () => {
    const element = pdfRef.current;
    const opt = {
      margin: 0,
      filename: `Quotation_${data.quoteNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'], avoid: '.avoid-break' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (!company) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3 no-print">
        <button
          onClick={() => {
            const baseUrl = window.location.origin + window.location.pathname;
            const idToUse = id || data.quoteNumber;
            const text = `📄 Quotation ${data.quoteNumber} from ${company.name}\n\nTotal: ${formatCurrency(data.grandTotal)}\n\nClick below to view the full PDF quotation:\n${baseUrl}?quoteId=${idToUse}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all"
        >
          <Share2 className="h-4 w-4" />
          WhatsApp
        </button>
        <button
          onClick={() => {
            const subject = `Quotation ${data.quoteNumber} - ${company.name}`;
            const body = `Hello,\n\nPlease find the quotation ${data.quoteNumber} attached.\nTotal: ${formatCurrency(data.grandTotal)}\n\nRegards,\n${company.name}`;
            window.location.href = `mailto:${data.clientDetails.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          }}
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-900 shadow-lg shadow-gray-100 transition-all"
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div 
        ref={pdfRef}
        className="bg-white mx-auto text-gray-900 font-sans p-0 m-0 overflow-visible"
        style={{ width: '8.5in' }}
      >
        {/* Main Quotation Page */}
        <div className="w-[8.5in] h-[10.7in] p-[0.4in] bg-white flex flex-col overflow-hidden">
          <div className="border-2 border-gray-200 flex-1 flex flex-col p-8 relative">
            <div className="flex-1">
              {/* Header */}
              <div className="flex justify-between items-start border-b-4 border-blue-600 pb-4 mb-6">
                <div className="space-y-2">
                  {company.logo ? (
                    <img src={company.logo} alt="Logo" className="h-16 object-contain" />
                  ) : (
                    <div className="h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      {company.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">{company.name}</h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Digital Signage & LED Solutions</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <h2 className="text-3xl font-black text-blue-600 uppercase italic">Quotation</h2>
                  <div className="pt-2 space-y-1 text-[10px] font-medium text-gray-600">
                    <p className="flex items-center justify-end gap-2"> {company.address} <MapPin className="h-3 w-3 text-blue-600" /></p>
                    <p className="flex items-center justify-end gap-2"> {company.contactPhone} <Phone className="h-3 w-3 text-blue-600" /></p>
                    <p className="flex items-center justify-end gap-2"> {company.contactEmail} <Mail className="h-3 w-3 text-blue-600" /></p>
                    <p className="flex items-center justify-end gap-2 font-bold text-gray-900"> GSTIN: {company.gstin} <FileText className="h-3 w-3 text-blue-600" /></p>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="bg-blue-600 text-white px-3 py-1 inline-block text-[10px] font-black uppercase tracking-widest rounded">Bill To:</div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-gray-900 uppercase">{data.clientDetails.companyName}</h3>
                      <p className="text-xs font-bold text-gray-600">{data.clientDetails.name}</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs">{data.billingAddress || data.clientDetails.address}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">GSTIN: {data.clientDetails.gstin || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-gray-800 text-white px-3 py-1 inline-block text-[10px] font-black uppercase tracking-widest rounded">Ship To:</div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs">{data.shippingAddress || data.clientDetails.address}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 min-w-[220px] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quote No:</span>
                      <span className="text-xs font-black text-blue-600 font-mono">{data.quoteNumber}</span>
                    </div>
                    {data.revision !== undefined && data.revision > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revision:</span>
                        <span className="text-xs font-bold text-gray-900">Rev {data.revision}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date:</span>
                      <span className="text-xs font-bold text-gray-900">{new Date(data.date).toLocaleDateString()}</span>
                    </div>
                    {data.createdAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Created:</span>
                        <span className="text-xs font-bold text-gray-900">
                          {new Date(data.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}
                    {data.updatedAt && data.revision !== undefined && data.revision > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Revised:</span>
                        <span className="text-xs font-bold text-gray-900">
                          {new Date(data.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valid Until:</span>
                      <span className="text-xs font-bold text-gray-900">{new Date(new Date(data.date).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white avoid-break">
                      <th className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-widest border-r border-blue-500">Sr.</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest border-r border-blue-500">Photo</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest border-r border-blue-500">Description</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest border-r border-blue-500">HSN</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest border-r border-blue-500">Qty</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest border-r border-blue-500">Rate</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 border-b-2 border-gray-100">
                    {data.items.map((item, index) => (
                      <tr key={index} className="group avoid-break">
                        <td className="px-2 py-3 align-top text-[10px] font-bold text-gray-400">{index + 1}</td>
                        <td className="px-4 py-3 align-top">
                          {item.image ? (
                            <div className="h-16 w-16 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center">
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="h-16 w-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-200" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-black text-gray-900 uppercase text-xs mb-1">{item.name}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-center text-[10px] font-bold text-gray-600">{item.hsnCode}</td>
                        <td className="px-4 py-3 align-top text-center text-[10px] font-black text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 align-top text-right text-[10px] font-bold text-gray-900">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-3 align-top text-right text-[10px] font-black text-blue-600">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-8 avoid-break">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-xl space-y-1">
                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount in Words:</h4>
                    <p className="text-[10px] font-black text-gray-900 italic uppercase">{data.totalInWords}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Terms & Conditions:</h4>
                    <ul className="text-[9px] text-gray-500 space-y-0.5 list-disc pl-4 font-medium">
                      <li>GST @ {data.gstRate}% extra as applicable.</li>
                      <li>Freight and Installation charges are as mentioned.</li>
                      <li>Delivery within 7-10 working days after PO.</li>
                      <li>Payment: 50% Advance, 50% before dispatch.</li>
                      <li>Warranty: 1 Year standard manufacturer warranty.</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank Details:</h4>
                    <p className="text-[9px] text-gray-600 font-bold whitespace-pre-line leading-relaxed">{company.bankDetails}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5 border-b border-gray-100 pb-3">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-500 uppercase">Sub Total:</span>
                      <span className="text-gray-900">{formatCurrency(data.subtotal)}</span>
                    </div>
                    {data.freight > 0 && (
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-500 uppercase">Freight Charges:</span>
                        <span className="text-gray-900">{formatCurrency(data.freight)}</span>
                      </div>
                    )}
                    {data.installation > 0 && (
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-500 uppercase">Installation Charges:</span>
                        <span className="text-gray-900">{formatCurrency(data.installation)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-500 uppercase">GST ({data.gstRate}%):</span>
                      <span className="text-gray-900">{formatCurrency(data.gstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-500 uppercase">Round Off:</span>
                      <span className="text-gray-900">{formatCurrency(data.roundOff)}</span>
                    </div>
                  </div>
                  <div className="bg-blue-600 text-white p-4 rounded-xl flex justify-between items-center shadow-lg shadow-blue-100">
                    <span className="text-[10px] font-black uppercase tracking-widest">Grand Total:</span>
                    <span className="text-xl font-black">{formatCurrency(data.grandTotal)}</span>
                  </div>
                  
                  {/* Signature Area */}
                  <div className="pt-6 text-right space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">For {company.name}</p>
                    <div className="h-16 flex justify-end items-center gap-4">
                      {company.stamp && <img src={company.stamp} alt="Stamp" className="h-16 opacity-80" />}
                      {company.signature && <img src={company.signature} alt="Signature" className="h-12" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-900 uppercase">Authorized Signatory</p>
                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Sales & Operations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-gray-100 text-center avoid-break">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Thank you for your business!</p>
              <div className="flex justify-center gap-4 mt-2">
                {company.certifications?.map((cert: string, i: number) => (
                  <div key={i} className="flex items-center gap-1 text-[7px] font-black text-blue-600 uppercase border border-blue-100 px-1.5 py-0.5 rounded">
                    <Award className="h-2 w-2" /> {cert}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Detail Pages */}
        {data.items.map((item, index) => (
          <div 
            key={`detail-${index}`} 
            className="w-[8.5in] h-[10.7in] p-[0.4in] bg-white flex flex-col overflow-hidden" 
            style={{ pageBreakBefore: 'always' }}
          >
            <div className="border-2 border-gray-200 flex-1 flex flex-col p-8 relative">
              {/* Header for Detail Page */}
              <div className="flex justify-between items-center border-b-2 border-blue-600 pb-4 mb-8">
                <div className="flex items-center gap-3">
                  {company.logo ? (
                    <img src={company.logo} alt="Logo" className="h-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {company.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{company.name}</h3>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Product Specification Sheet</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-blue-600 uppercase italic">Quote: {data.quoteNumber}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Item #{index + 1}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Product Image - Large */}
                <div className="flex justify-center">
                  {item.image ? (
                    <div className="w-full max-w-2xl aspect-video bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center shadow-inner">
                      <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl aspect-video bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center">
                      <Package className="h-20 w-20 text-gray-200" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                  <div className="border-l-4 border-blue-600 pl-4">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{item.name}</h2>
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">HSN Code: {item.hsnCode}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Award className="h-4 w-4 text-blue-600" />
                      Technical Specifications
                    </h4>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      {item.specifications.map((spec: any, sIdx: number) => (
                        <div key={sIdx} className="flex justify-between items-center border-b border-gray-200 pb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{spec.label}</span>
                          <span className="text-xs font-bold text-gray-900">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Info / Features could go here */}
                </div>
              </div>

              {/* Footer for Detail Page */}
              <div className="mt-auto pt-8 border-t border-gray-100 text-center">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">Thank you for your business!</p>
                <div className="flex justify-center gap-4 mb-4">
                  {company.certifications?.map((cert: string, i: number) => (
                    <div key={i} className="flex items-center gap-1 text-[7px] font-black text-blue-600 uppercase border border-blue-100 px-1.5 py-0.5 rounded">
                      <Award className="h-2 w-2" /> {cert}
                    </div>
                  ))}
                </div>
                <p className="text-[7px] text-gray-300 font-bold uppercase tracking-widest">© {new Date().getFullYear()} {company.name} | Confidential Quotation</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuoteDisplay;
