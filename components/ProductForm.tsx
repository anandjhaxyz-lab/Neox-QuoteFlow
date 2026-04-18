
import React, { useState, useEffect, useRef } from 'react';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import { Product } from '../types';

interface ProductFormProps {
  onSave: (product: Product) => void;
  onCancel: () => void;
  editingProduct?: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ onSave, onCancel, editingProduct }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setDescription(editingProduct.description);
      setDetailedDescription(editingProduct.detailedDescription || '');
      setUnitPrice(editingProduct.unitPrice.toString());
      setImage(editingProduct.image);
    } else {
      setName('');
      setDescription('');
      setDetailedDescription('');
      setUnitPrice('');
      setImage(undefined);
    }
    setErrors({});
  }, [editingProduct]);

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Optimized resolution for square 1:1 aspect ratio
          const TARGET_WIDTH = 1080;
          const TARGET_HEIGHT = 1080;
          canvas.width = TARGET_WIDTH;
          canvas.height = TARGET_HEIGHT;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
          const imgRatio = img.width / img.height;
          let drawWidth, drawHeight, offsetX, offsetY;

          if (imgRatio > targetRatio) {
            drawHeight = img.height;
            drawWidth = img.height * targetRatio;
            offsetX = (img.width - drawWidth) / 2;
            offsetY = 0;
          } else {
            drawWidth = img.width;
            drawHeight = img.width / targetRatio;
            offsetX = 0;
            offsetY = (img.height - drawHeight) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Optimized quality for storage efficiency
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const processedImage = await processImage(file);
        setImage(processedImage);
      } catch (err) {
        console.error('Image processing error:', err);
        setErrors({ ...errors, image: 'Failed to process image.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'Product name is required.';
    if (!unitPrice) {
      newErrors.unitPrice = 'Unit price is required.';
    } else if (isNaN(parseFloat(unitPrice)) || parseFloat(unitPrice) <= 0) {
      newErrors.unitPrice = 'Unit price must be a positive number.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const newProduct: Product = {
        id: editingProduct ? editingProduct.id : Date.now().toString(),
        name,
        description,
        detailedDescription,
        unitPrice: parseFloat(unitPrice),
        image,
      };
      onSave(newProduct);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto mb-8 border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {editingProduct ? 'Edit Product' : 'Add New Product'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-48 h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-3 relative group">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {image ? (
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-4">
                <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-400">Square Photo (1:1)</p>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
          <div className="flex flex-col items-center">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {image ? 'Change Photo' : 'Upload Photo'}
            </Button>
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Optimized for 1080x1080 Pixels</p>
          </div>
          {image && (
            <button 
              type="button" 
              className="text-red-500 text-xs mt-2 hover:underline"
              onClick={() => setImage(undefined)}
            >
              Remove Photo
            </button>
          )}
          {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
        </div>

        <Input
          id="productName"
          label="Product Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Vertical Digital Display"
          error={errors.name}
        />
        <Textarea
          id="productDescription"
          label="Short Description (Shown in Table)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short summary of the product."
        />
        <Textarea
          id="detailedDescription"
          label="Detailed Description (Shown on 2nd Page)"
          value={detailedDescription}
          onChange={(e) => setDetailedDescription(e.target.value)}
          placeholder="Full technical specifications and details."
          rows={6}
        />
        <Input
          id="unitPrice"
          label="Unit Price (₹)"
          type="number"
          step="0.01"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          placeholder="e.g., 5000.00"
          error={errors.unitPrice}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isProcessing}>
            {editingProduct ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
