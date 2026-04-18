
import React from 'react';
import { Quotation } from '../types';
import Button from './Button';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface QuoteDisplayProps {
  quotation: Quotation;
  onBack: () => void;
  onEdit?: () => void;
}

const QuoteDisplay: React.FC<QuoteDisplayProps> = ({ quotation, onBack, onEdit }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById('print-section');
    if (!element) return;

    // Temporarily hide the action buttons for the PDF
    const buttons = element.querySelector('.print-hidden');
    if (buttons) {
      (buttons as HTMLElement).style.display = 'none';
    }

    const opt = {
      margin:       0.4,
      filename:     `Quotation_${quotation.quoteNumber}.pdf`,
      image:        { type: 'jpeg' as const, quality: 1.0 },
      html2canvas:  { 
        scale: 4, 
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        scrollY: 0,
        windowWidth: 1200
      },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Restore the buttons
      if (buttons) {
        (buttons as HTMLElement).style.display = 'flex';
      }
    });
  };

  return (
    <div id="print-section" className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto mb-8 border border-gray-200">
      {/* Action Buttons (hidden on print via CSS and class) */}
      <div className="flex justify-between mb-6 print-hidden">
        <Button onClick={onBack} variant="secondary">
          ← Back to List
        </Button>
        <div className="space-x-2 flex">
          {onEdit && (
            <Button onClick={onEdit} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              Edit Quote
            </Button>
          )}
          <Button onClick={handleDownload} variant="outline">
            Download PDF
          </Button>
          <Button onClick={handlePrint} variant="primary">
            Print Quotation
          </Button>
        </div>
      </div>

      <div className="mb-8 border-b pb-8">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="text-left align-top py-0">
                <div className="flex items-start gap-4">
                  {quotation.companyLogo && (
                    <img src={quotation.companyLogo} alt="Company Logo" className="h-20 w-auto max-w-[200px] object-contain" />
                  )}
                  <div>
                    <h1 className="text-4xl font-black text-blue-800 tracking-tighter uppercase leading-none">{quotation.companyName || 'Neoxe'}</h1>
                    <p className="text-blue-600 italic text-sm font-semibold mt-1">{quotation.tagLine || 'Fast & Reliable Quotations'}</p>
                    <address className="not-italic text-[10px] text-gray-500 mt-3 leading-relaxed whitespace-pre-wrap">
                      {quotation.companyAddress || 'Office No. 402, Business Hub\nNew Delhi, India'}<br />
                      Phone: {quotation.companyPhone || '+91 98765 43210'}<br />
                      Email: {quotation.companyEmail || 'sales@quoteflow.in'}
                    </address>
                  </div>
                </div>
              </td>
              <td className="text-right align-top py-0">
                <div className="inline-block mb-6">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none pb-1">QUOTATION</h2>
                  <div className="h-[4px] bg-blue-600 w-full mt-3"></div>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-sm font-medium">Quote #: <span className="text-slate-900 font-black ml-1">{quotation.quoteNumber}</span></p>
                  {quotation.revisionCount && quotation.revisionCount > 0 ? (
                    <p className="text-slate-500 text-sm font-medium">Revision: <span className="text-slate-900 font-black ml-1">{quotation.revisionCount}</span></p>
                  ) : null}
                  <p className="text-slate-500 text-sm font-medium">Date: <span className="text-slate-900 font-black ml-1">{quotation.date}{quotation.time ? ` at ${quotation.time}` : ''}</span></p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-6 p-4 border rounded-md bg-gray-50 grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">BILL TO:</h3>
          {quotation.clientCompanyName || quotation.clientGSTNumber ? (
            <div className="mb-2 border-b border-gray-100 pb-1">
              <div className="flex justify-between items-start gap-4">
                {quotation.clientCompanyName && (
                  <div className="text-sm text-gray-900 font-bold whitespace-pre-wrap flex-1">
                    {quotation.clientCompanyName}
                  </div>
                )}
                {quotation.clientGSTNumber && (
                  <div className="text-[10px] text-gray-600 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                    {quotation.clientGSTNumber.startsWith('GST') ? quotation.clientGSTNumber : `GST: ${quotation.clientGSTNumber}`}
                  </div>
                )}
              </div>
            </div>
          ) : quotation.companyDetails ? (
            <div className="mb-2 text-sm text-gray-900 whitespace-pre-wrap font-bold border-b border-gray-100 pb-1">
              {quotation.companyDetails}
            </div>
          ) : null}
          <p className="font-bold text-base text-gray-900">{quotation.clientName}</p>
          {quotation.clientEmail && <p className="text-gray-600 text-xs">{quotation.clientEmail}</p>}
          {quotation.clientPhone && <p className="text-gray-600 text-xs">Tel: {quotation.clientPhone}</p>}
          {quotation.clientAddress && <p className="text-gray-600 text-xs whitespace-pre-wrap mt-1">{quotation.clientAddress}</p>}
        </div>
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">SHIP TO:</h3>
          <p className="font-bold text-base text-gray-900">{quotation.shippingName || quotation.clientName}</p>
          {(quotation.shippingPhone || quotation.clientPhone) && <p className="text-gray-600 text-xs">Tel: {quotation.shippingPhone || quotation.clientPhone}</p>}
          {(quotation.shippingAddress || quotation.clientAddress) && <p className="text-gray-600 text-xs whitespace-pre-wrap mt-1">{quotation.shippingAddress || quotation.clientAddress}</p>}
        </div>
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Photo
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Item & Description
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Unit Price
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Qty
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotation.items.map((item) => (
              <tr key={item.productId}>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="h-12 w-8 rounded border border-gray-200 overflow-hidden bg-gray-50">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-sm">
                  <div className="font-bold text-gray-900">{item.name}</div>
                  {!(item.detailedDescription || (item.description && item.description.length > 100)) && (
                    <div className="text-gray-500 text-[9px] mt-0.5 leading-tight truncate max-w-[200px]">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                  ₹{item.unitPrice.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                  {item.quantity}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900 font-bold">
                  ₹{item.lineTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start mt-6 gap-6">
        <div className="w-full md:w-1/2 space-y-4">
          {quotation.warranty && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest border-b pb-1">Warranty</h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{quotation.warranty}</p>
            </div>
          )}
          {quotation.paymentTerms && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest border-b pb-1">Payment Terms</h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{quotation.paymentTerms}</p>
            </div>
          )}
          {quotation.termsAndConditions && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest border-b pb-1">Terms & Conditions</h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{quotation.termsAndConditions}</p>
            </div>
          )}
          {quotation.bankDetails && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest border-b pb-1">Company Bank Details</h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{quotation.bankDetails}</p>
            </div>
          )}
        </div>

        <div className="w-full sm:w-1/2 md:w-1/3 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-600 mb-2 text-sm">
            <span className="font-medium">Items Subtotal:</span>
            <span className="font-bold text-slate-900">₹{quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex justify-between items-center text-slate-600 mb-2 text-sm">
            <span className="font-medium">Freight Cost:</span>
            <span className="font-bold text-slate-900">₹{quotation.freightCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between items-center text-slate-500 mb-2 text-xs border-t border-slate-200 pt-2 italic">
            <span>Taxable Amount:</span>
            <span>₹{(quotation.subtotal + quotation.freightCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600 mb-4 text-sm">
            <span className="font-medium">GST ({Math.round(quotation.taxRate * 100)}%):</span>
            <span className="font-bold text-slate-900">₹{quotation.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between items-center text-2xl font-black text-blue-800 pt-4 border-t-4 border-blue-800 mt-2">
            <span className="tracking-tighter">TOTAL:</span>
            <span>₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-gray-500 text-xs border-t border-gray-100 pt-4 print-hidden">
        <p className="font-bold text-gray-700">Thank you for choosing {quotation.companyName || 'Neoxe'}!</p>
        <p className="mt-1">Please contact us if you have any questions regarding this quotation.</p>
        <p className="mt-4 text-xs">Generated by {quotation.companyName || 'Neoxe'} - Easy Business Solutions</p>
      </div>

      {/* Second Page: Detailed Descriptions (One Page Per Product) */}
      {quotation.items.filter(item => item.detailedDescription || (item.description && item.description.length > 100)).map((item, index) => (
        <div key={`detail-${item.productId}-${index}`} className="break-before-page page-break-before-always py-8">
          <div className="flex justify-between items-center mb-6 border-b-2 border-blue-600 pb-2">
            <h2 className="text-xl font-bold text-gray-800 uppercase">Technical Specifications</h2>
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Quote #: {quotation.quoteNumber}</p>
              <p className="text-[10px] text-gray-500">Page {index + 2} of {quotation.items.filter(i => i.detailedDescription || (i.description && i.description.length > 100)).length + 1}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-blue-700 mb-4 border-l-4 border-blue-600 pl-4 uppercase tracking-tight">{item.name}</h3>
            
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 p-6 rounded-xl border border-gray-200">
              {item.detailedDescription || item.description}
            </div>
            
            {/* Photo at the bottom of the description section as requested */}
            {item.image && (
              <div className="flex justify-center mt-6">
                <div className="max-w-md w-full border border-gray-200 shadow-md rounded-xl overflow-hidden bg-white">
                  <div className="p-2 bg-white">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-auto object-contain max-h-[450px] rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="bg-gray-50 text-gray-500 text-[9px] py-2 px-4 text-center uppercase tracking-widest border-t border-gray-100 font-bold">
                    Product Reference: {item.name}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-[9px] text-gray-400 border-t pt-4">
            <p>© {new Date().getFullYear()} {quotation.companyName || 'Neoxe'}. All rights reserved.</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuoteDisplay;
