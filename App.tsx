
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Quotation } from './types';
import { LOCAL_STORAGE_PRODUCTS_KEY, LOCAL_STORAGE_QUOTATIONS_KEY } from './constants';
import { INITIAL_PRODUCTS } from './src/data/initialProducts';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';
import QuoteBuilder from './components/QuoteBuilder';
import QuoteDisplay from './components/QuoteDisplay';
import AdminPanel from './components/AdminPanel';
import Button from './components/Button';

enum View {
  PRODUCTS = 'products',
  CREATE_QUOTE = 'create-quote',
  VIEW_QUOTE = 'view-quote',
  ALL_QUOTES = 'all-quotes',
  ADMIN = 'admin',
}

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.PRODUCTS);
  const [lastView, setLastView] = useState<View>(View.PRODUCTS);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        // Initialize with default products if none exist
        setProducts(INITIAL_PRODUCTS);
      }
      
      const storedQuotations = localStorage.getItem(LOCAL_STORAGE_QUOTATIONS_KEY);
      if (storedQuotations) {
        setQuotations(JSON.parse(storedQuotations));
      }
    } catch (error) {
      console.error('Failed to load data from local storage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save products only after initialization
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
      } catch (e) {
        console.error('Storage failed. Might be out of space.', e);
      }
    }
  }, [products, isInitialized]);

  // Save quotations only after initialization
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(LOCAL_STORAGE_QUOTATIONS_KEY, JSON.stringify(quotations));
      } catch (e) {
        console.error('Storage failed. Might be out of space.', e);
      }
    }
  }, [quotations, isInitialized]);

  const navigateTo = useCallback((view: View) => {
    setLastView(currentView);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const handleResetInventory = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const confirmResetInventory = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
    setShowResetModal(false);
  }, []);

  const handleAddOrUpdateProduct = useCallback((product: Product) => {
    setProducts((prevProducts) => {
      const existingIndex = prevProducts.findIndex((p) => p.id === product.id);
      if (existingIndex > -1) {
        const updatedProducts = [...prevProducts];
        updatedProducts[existingIndex] = product;
        return updatedProducts;
      } else {
        return [...prevProducts, product];
      }
    });
    setEditingProduct(null);
    navigateTo(View.PRODUCTS);
  }, [navigateTo]);

  const handleDeleteProduct = useCallback((id: string) => {
    if (!id) return;
    setProductToDelete(id);
  }, []);

  const confirmDeleteProduct = useCallback(() => {
    if (productToDelete) {
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete));
      // Clear editing state if the deleted product was being edited
      setEditingProduct((prev) => (prev?.id === productToDelete ? null : prev));
      setProductToDelete(null);
    }
  }, [productToDelete]);

  const handleGenerateQuotation = useCallback((quotation: Quotation) => {
    setQuotations((prevQuotations) => {
      const existingIndex = prevQuotations.findIndex((q) => q.id === quotation.id);
      if (existingIndex > -1) {
        const updatedQuotations = [...prevQuotations];
        updatedQuotations[existingIndex] = quotation;
        return updatedQuotations;
      }
      return [...prevQuotations, quotation];
    });
    setSelectedQuotation(quotation);
    setEditingQuotation(null);
    navigateTo(View.VIEW_QUOTE);
  }, [navigateTo]);

  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    navigateTo(View.PRODUCTS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo]);

  const handleViewQuote = useCallback((quote: Quotation) => {
    setSelectedQuotation(quote);
    navigateTo(View.VIEW_QUOTE);
  }, [navigateTo]);

  const handleEditQuotation = useCallback((quote: Quotation) => {
    setEditingQuotation(quote);
    navigateTo(View.CREATE_QUOTE);
  }, [navigateTo]);

  const handleBackFromDisplay = useCallback(() => {
    setSelectedQuotation(null);
    if (lastView === View.ALL_QUOTES) {
      setCurrentView(View.ALL_QUOTES);
    } else {
      setCurrentView(View.CREATE_QUOTE);
    }
  }, [lastView]);

  const handleDeleteQuotation = useCallback((id: string) => {
    if (!id) return;
    setQuoteToDelete(id);
  }, []);

  const confirmDeleteQuotation = useCallback(() => {
    if (quoteToDelete) {
      setQuotations((prev) => prev.filter((q) => q.id !== quoteToDelete));
      if (selectedQuotation?.id === quoteToDelete) {
        setSelectedQuotation(null);
        setCurrentView(View.ALL_QUOTES);
      }
      setQuoteToDelete(null);
    }
  }, [quoteToDelete, selectedQuotation]);

  const filteredAndSortedQuotations = useMemo(() => {
    return quotations
      .filter((q) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          q.clientName.toLowerCase().includes(query) ||
          (q.clientPhone && q.clientPhone.toLowerCase().includes(query)) ||
          q.quoteNumber.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [quotations, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6 shadow-md sticky top-0 z-10 print-hidden">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
             <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
             <h1 className="text-3xl font-extrabold tracking-tight">Neoxe</h1>
          </div>
          <nav className="flex flex-wrap justify-center gap-2 sm:gap-4">
            <Button
              variant={currentView === View.PRODUCTS ? 'secondary' : 'outline'}
              className={currentView === View.PRODUCTS ? 'bg-white text-blue-800' : 'text-white border-white hover:bg-white/10'}
              onClick={() => {
                setEditingProduct(null);
                navigateTo(View.PRODUCTS);
              }}
            >
              Manage Products
            </Button>
            <Button
              variant={currentView === View.CREATE_QUOTE ? 'secondary' : 'outline'}
              className={currentView === View.CREATE_QUOTE ? 'bg-white text-blue-800' : 'text-white border-white hover:bg-white/10'}
              onClick={() => {
                setEditingQuotation(null);
                navigateTo(View.CREATE_QUOTE);
              }}
            >
              Create Quotation
            </Button>
            <Button
              variant={currentView === View.ALL_QUOTES ? 'secondary' : 'outline'}
              className={currentView === View.ALL_QUOTES ? 'bg-white text-blue-800' : 'text-white border-white hover:bg-white/10'}
              onClick={() => navigateTo(View.ALL_QUOTES)}
            >
              All Quotations
            </Button>
            <Button
              variant={currentView === View.ADMIN ? 'secondary' : 'outline'}
              className={currentView === View.ADMIN ? 'bg-white text-blue-800' : 'text-white border-white hover:bg-white/10'}
              onClick={() => navigateTo(View.ADMIN)}
            >
              Admin Panel
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isInitialized ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          </div>
        ) : (
          <>
            {currentView === View.PRODUCTS && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ProductForm
                  onSave={handleAddOrUpdateProduct}
                  onCancel={() => setEditingProduct(null)}
                  editingProduct={editingProduct}
                />
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-bold text-gray-800">Product Inventory</h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleResetInventory}
                  >
                    Reset to Default Inventory
                  </Button>
                </div>
                <ProductList
                  products={products}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              </div>
            )}

            {currentView === View.CREATE_QUOTE && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <QuoteBuilder products={products} onGenerateQuote={handleGenerateQuotation} initialQuotation={editingQuotation} />
              </div>
            )}

            {currentView === View.VIEW_QUOTE && selectedQuotation && (
              <div className="animate-in zoom-in duration-300">
                 <QuoteDisplay quotation={selectedQuotation} onBack={handleBackFromDisplay} onEdit={() => handleEditQuotation(selectedQuotation)} />
              </div>
            )}

            {currentView === View.ALL_QUOTES && (
              <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* ... existing All Quotations content ... */}
                {/* (I'll just replace the whole block to be safe) */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-gray-800">All Generated Quotations</h2>
                  {quotations.length > 0 && (
                    <div className="w-full md:w-80 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search by name, phone, or quote #"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
                {quotations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg mb-4">No quotations generated yet.</p>
                    <Button onClick={() => navigateTo(View.CREATE_QUOTE)}>Create Your First Quote</Button>
                  </div>
                ) : filteredAndSortedQuotations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg mb-4">No quotations match your search.</p>
                    <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quote #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rev
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedQuotations.map((quote) => (
                        <tr key={quote.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700 cursor-pointer hover:underline"
                              onClick={() => handleViewQuote(quote)}>
                            {quote.quoteNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {quote.revisionCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {quote.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {quote.clientName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-bold">
                            ₹{quote.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="secondary" size="sm" onClick={() => handleViewQuote(quote)} className="mr-2">
                              View
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleEditQuotation(quote)} className="mr-2">
                              Edit
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteQuotation(quote.id)}>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {currentView === View.ADMIN && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AdminPanel />
              </div>
            )}
          </>
        )}
      </main>

      {/* Custom Modals */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Inventory</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to reset the inventory to default products? This will remove any custom products you have added.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetInventory}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-200"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Product</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this product? It will be removed from your product list.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {quoteToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Quotation</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this quotation? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setQuoteToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteQuotation}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
