'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ProgressBar } from './ui/progress-bar';
import { Upload, X, RotateCcw, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onImageProcessed: (products: string[], confidence: string) => void;
  onError: (error: string) => void;
  maxRetries?: number;
}

export default function ImageUpload({ onImageProcessed, onError, maxRetries = 3 }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
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

  const processImage = async (file: File, attempt: number = 1) => {
    setIsProcessing(true);
    setUploadProgress(0);
    setCurrentError(null);
    setCurrentFile(file);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.products || result.products.length === 0) {
        throw new Error('No product names could be extracted from the image. Please try a clearer image or enter products manually.');
      }
      
      // Success - reset states
      setRetryCount(0);
      setCurrentError(null);
      onImageProcessed(result.products, result.confidence || 'unknown');
      
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract text from image.';
      
      if (attempt < maxRetries) {
        setRetryCount(attempt);
        setCurrentError(`${errorMessage} Retrying... (${attempt}/${maxRetries})`);
        
        // Auto-retry after a delay
        setTimeout(() => {
          processImage(file, attempt + 1);
        }, 2000);
      } else {
        setCurrentError(errorMessage);
        onError(errorMessage);
        setRetryCount(0);
      }
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Please upload an image file (JPG, PNG, etc.)';
      setCurrentError(errorMsg);
      onError(errorMsg);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'Image file is too large. Please upload an image smaller than 10MB.';
      setCurrentError(errorMsg);
      onError(errorMsg);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process image
    await processImage(file);
  };

  const retryUpload = () => {
    if (currentFile) {
      setRetryCount(0);
      processImage(currentFile);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setCurrentError(null);
    setRetryCount(0);
    setCurrentFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {currentError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 text-sm">{currentError}</p>
              {retryCount > 0 && retryCount < maxRetries && (
                <p className="text-red-600 text-xs mt-1">
                  Attempt {retryCount} of {maxRetries}
                </p>
              )}
            </div>
            {retryCount >= maxRetries && (
              <Button
                onClick={retryUpload}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isProcessing && uploadProgress > 0 && (
        <div className="space-y-2">
          <ProgressBar
            value={uploadProgress}
            label="Processing"
            variant="upload"
            showPercentage={true}
          />
        </div>
      )}

      <Card className={`p-6 border-2 border-dashed transition-colors ${
        currentError ? 'border-red-300 bg-red-50' :
        dragActive 
          ? 'border-pink-400 bg-pink-50' 
          : isProcessing
          ? 'border-blue-300 bg-blue-50'
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
                  disabled={isProcessing}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {isProcessing && (
                <div className="text-sm text-gray-600">
                  <div className="animate-spin inline-block w-4 h-4 border-2 border-pink-300 border-t-pink-600 rounded-full mr-2"></div>
                  {uploadProgress > 0 ? `Processing image... ${Math.round(uploadProgress)}%` : 'Processing image...'}
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
              <Button 
                onClick={triggerFileInput} 
                variant="outline"
                disabled={isProcessing}
              >
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
        disabled={isProcessing}
      />
    </div>
  );
}
