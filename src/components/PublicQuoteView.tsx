import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import QuoteDisplay from './QuoteDisplay';
import { ArrowLeft, FileText } from 'lucide-react';

interface PublicQuoteViewProps {
  quoteId: string;
  onBack: () => void;
}

const PublicQuoteView: React.FC<PublicQuoteViewProps> = ({ quoteId, onBack }) => {
  const [quoteData, setQuoteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const docRef = doc(db, 'quotations', quoteId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setQuoteData(docSnap.data());
        } else {
          setError('Quotation not found');
        }
      } catch (err: any) {
        console.error('Error fetching public quote:', err);
        setError('You do not have permission to view this quotation or it does not exist.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <FileText className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 max-w-md mb-8">{error}</p>
        <button
          onClick={onBack}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Public View Mode
        </div>
      </div>
      <QuoteDisplay id={quoteId} data={quoteData} />
    </div>
  );
};

export default PublicQuoteView;
