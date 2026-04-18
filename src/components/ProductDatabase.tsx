import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Package, Edit2, Trash2, Tag, List, Image as ImageIcon, X, Copy, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';

interface Specification {
  label: string;
  value: string;
}

interface Product {
  id: string;
  name: string;
  type: 'LED' | 'Standee' | 'Kiosk' | 'Service';
  hsnCode: string;
  defaultRate: number;
  specifications: Specification[];
  image?: string;
  status?: 'active' | 'inactive';
  companyId?: string;
}

interface ProductDatabaseProps {
  userRole: 'admin' | 'sales' | 'super_admin';
  companyId: string | null;
}

const ProductDatabase: React.FC<ProductDatabaseProps> = ({ userRole, companyId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    type: 'LED',
    hsnCode: '',
    defaultRate: 0,
    specifications: [],
    status: 'active'
  });

  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [isImageLoading, setIsImageLoading] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId && userRole !== 'super_admin') return;

    let q: any;
    // Super admins and users in the 'SUPER' company see all products
    if (companyId === 'SUPER') {
      q = query(collection(db, 'products'), orderBy('name', 'asc'));
    } else {
      q = query(collection(db, 'products'), where('companyId', '==', companyId), orderBy('name', 'asc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const productList = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      console.log(`Fetched ${productList.length} products for company: ${companyId}`);
      setProducts(productList);
      setLoading(false);
      setErrorMsg(null);
    }, (error: any) => {
      console.error('Error fetching products:', error);
      setLoading(false);
      if (error.code === 'failed-precondition') {
        setErrorMsg('This view requires a database index. Please contact the administrator to set it up.');
      } else {
        setErrorMsg('Failed to load products: ' + (error.message || 'Permission denied'));
      }
    });

    return () => unsubscribe();
  }, [companyId, userRole]);

  useEffect(() => {
    if (userRole === 'super_admin') {
      const unsubscribe = onSnapshot(collection(db, 'companies'), (snapshot) => {
        const cMap: Record<string, string> = {};
        snapshot.forEach(doc => {
          cMap[doc.id] = doc.data().name || doc.id;
        });
        setCompaniesMap(cMap);
      });
      return () => unsubscribe();
    }
  }, [userRole]);

  const handleAddSpec = () => {
    const specs = [...(formData.specifications || [])];
    specs.push({ label: '', value: '' });
    setFormData({ ...formData, specifications: specs });
  };

  const handleRemoveSpec = (index: number) => {
    const specs = [...(formData.specifications || [])];
    specs.splice(index, 1);
    setFormData({ ...formData, specifications: specs });
  };

  const handleSpecChange = (index: number, field: keyof Specification, value: string) => {
    const specs = [...(formData.specifications || [])];
    specs[index] = { ...specs[index], [field]: value };
    setFormData({ ...formData, specifications: specs });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImageLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setFormData({ ...formData, image: compressed });
        } catch (error) {
          console.error('Image compression failed:', error);
          setErrorMsg('Failed to process image. Please try a different one.');
        } finally {
          setIsImageLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanData: any = { 
        ...formData,
        status: formData.status || 'active'
      };
      if (cleanData.image === undefined) delete cleanData.image;

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), cleanData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...cleanData,
          companyId
        });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', type: 'LED', hsnCode: '', defaultRate: 0, specifications: [] });
    } catch (error: any) {
      console.error('Save failed:', error);
      setErrorMsg('Failed to save product: ' + (error.message || 'Permission denied'));
    }
  };

  const handleDelete = async (id: string) => {
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteDoc(doc(db, 'products', productToDelete));
        setProductToDelete(null);
      } catch (error: any) {
        console.error('Delete failed:', error);
        setErrorMsg('Failed to delete product: ' + (error.message || 'Permission denied'));
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (product.status || 'active') === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const groupedProducts = useMemo(() => {
    if (companyId !== 'SUPER') return { [companyId || 'default']: filteredProducts };
    
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      const cId = p.companyId || 'Unknown';
      if (!groups[cId]) groups[cId] = [];
      groups[cId].push(p);
    });
    return groups;
  }, [filteredProducts, companyId]);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (userRole !== 'super_admin' && (!companyId || companyId === 'NONE')) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Package className="h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">No Company Assigned</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Your account is not yet assigned to a company. Please contact the Super Admin to assign you to a business.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Database</h1>
          <p className="text-gray-500 mt-1">Manage your product templates and technical specifications.</p>
        </div>
        {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'sales') && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setErrorMsg(null);
              setFormData({ name: '', type: 'LED', hsnCode: '', defaultRate: 0, specifications: [] });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            Add New Product
          </button>
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

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                filterStatus === s ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {Object.entries(groupedProducts).map(([cId, productsInGroup]) => {
          const companyProducts = productsInGroup as Product[];
          return (
            <div key={cId} className="space-y-6">
              {companyId === 'SUPER' && (
                <div className="flex items-center gap-3 px-2">
                  <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {companiesMap[cId] || cId}
                  </h2>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                    {companyProducts.length} Products
                  </span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companyProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center",
                      product.type === 'LED' && "bg-blue-50 text-blue-600",
                      product.type === 'Standee' && "bg-purple-50 text-purple-600",
                      product.type === 'Kiosk' && "bg-orange-50 text-orange-600",
                      product.type === 'Service' && "bg-green-50 text-green-600",
                    )}>
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                        (product.status || 'active') === 'active' 
                          ? "bg-green-50 text-green-600 border border-green-100" 
                          : "bg-red-50 text-red-600 border border-red-100"
                      )}>
                        {product.status || 'active'}
                      </span>
                      {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'sales') && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingProduct(null);
                              const { id, ...rest } = product;
                              setFormData({
                                ...rest,
                                name: `${product.name} (Copy)`,
                                status: 'active'
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Duplicate Product"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setFormData(product);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      product.type === 'LED' && "bg-blue-100 text-blue-700",
                      product.type === 'Standee' && "bg-purple-100 text-purple-700",
                      product.type === 'Kiosk' && "bg-orange-100 text-orange-700",
                      product.type === 'Service' && "bg-green-100 text-green-700",
                    )}>
                      {product.type}
                    </span>
                    {product.hsnCode && (
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">HSN: {product.hsnCode}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 truncate">{product.name}</h3>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><List className="h-3 w-3" /> Specs</span>
                      <span className="font-bold text-gray-900">{product.specifications.length} items</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><Tag className="h-3 w-3" /> Base Rate</span>
                      <span className="font-bold text-blue-600">₹{product.defaultRate.toLocaleString()}</span>
                    </div>
                  </div>

                  {product.image && (
                    <div className="mt-4 aspect-square w-full rounded-xl overflow-hidden border border-gray-100">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

        {!loading && filteredProducts.length === 0 && (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No products found</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start by adding your first product to the database.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setErrorMsg(null); }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
              {errorMsg && (
                <div className="md:col-span-2 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center">
                  <p>{errorMsg}</p>
                  <button type="button" onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Product Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Type *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="LED">LED Display</option>
                      <option value="Standee">Digital Standee</option>
                      <option value="Kiosk">Kiosk</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">HSN Code</label>
                    <input
                      type="text"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Default Rate (₹)</label>
                  <input
                    type="number"
                    value={formData.defaultRate}
                    onChange={(e) => setFormData({ ...formData, defaultRate: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Status *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Product Image</label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                      {isImageLoading ? (
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                      ) : formData.image ? (
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                    <label className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                      {isImageLoading ? 'Processing...' : 'Upload Image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isImageLoading} />
                    </label>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: undefined })}
                        className="text-red-500 text-sm font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Technical Specifications</label>
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Spec
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {formData.specifications?.map((spec, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        placeholder="Label (e.g. Pixel Pitch)"
                        value={spec.label}
                        onChange={(e) => handleSpecChange(index, 'label', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <input
                        placeholder="Value (e.g. P2.5)"
                        value={spec.value}
                        onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {(!formData.specifications || formData.specifications.length === 0) && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                      <p className="text-sm text-gray-400">No specifications added yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 pt-6 border-t border-gray-100 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Product</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this product? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
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

export default ProductDatabase;
