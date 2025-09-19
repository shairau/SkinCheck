'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onImageProcessed: (products: string[]) => void;
  onError: (error: string) => void;
}

export default function ImageUpload({ onImageProcessed, onError }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('Image file is too large. Please upload an image smaller than 10MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process image
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const result = await response.json();
      
      if (!result.products || result.products.length === 0) {
        onError('No product names could be extracted from the image. Please try a clearer image or enter products manually.');
        return;
      }
      
      onImageProcessed(result.products);
    } catch (error) {
      console.error('Error processing image:', error);
      onError('Failed to extract text from image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Card className={`p-6 border-2 border-dashed transition-colors ${
        dragActive 
          ? 'border-pink-400 bg-pink-50' 
          : 'border-gray-300 hover:border-pink-300'
      }`}>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="text-center"
        >
          {uploadedImage ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img
                  src={uploadedImage}
                  alt="Uploaded product image"
                  className="max-h-48 max-w-full rounded-lg shadow-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {isProcessing && (
                <div className="text-sm text-gray-600">
                  <div className="animate-spin inline-block w-4 h-4 border-2 border-pink-300 border-t-pink-600 rounded-full mr-2"></div>
                  Processing image...
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Upload product image
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Drag and drop an image here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports JPG, PNG, and other image formats (max 10MB)
                </p>
              </div>
              <Button onClick={triggerFileInput} variant="outline">
                Choose File
              </Button>
            </div>
          )}
        </div>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
