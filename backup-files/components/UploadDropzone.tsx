"use client";
import React, { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import { ProgressBar } from "./ui/progress-bar";

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  hint?: string;
  isLoading?: boolean;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

export function UploadDropzone({
  onFile,
  onProgress,
  onError,
  hint = "Supports JPG/PNG up to 10MB",
  isLoading = false,
  maxFileSize = 10,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type not supported. Please upload: ${allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}`;
    }
    
    // Check file size
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size is ${maxFileSize}MB`;
    }
    
    return null;
  }, [allowedTypes, maxFileSize]);

  const handleFiles = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    
    // Validate file
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }
    
    // Clear previous error
    setError(null);
    setUploadProgress(0);
    setIsUploading(true);
    
    // Create preview
    setPreview(URL.createObjectURL(f));
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsUploading(false);
          onFile(f);
          onProgress?.(100);
          
          // Clear preview after processing
          setTimeout(() => {
            setPreview(null);
            setUploadProgress(0);
          }, 2000);
          return 100;
        }
        const increment = Math.random() * 15 + 5; // Random increment between 5-20
        const newProgress = Math.min(prev + increment, 100);
        onProgress?.(newProgress);
        return newProgress;
      });
    }, 200);
    
  }, [onFile, onProgress, onError, validateFile]);

  const clearError = () => setError(null);

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <ProgressBar
            value={uploadProgress}
            label="Uploading"
            variant="upload"
            showPercentage={true}
          />
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={clsx(
          "relative rounded-xl border-2 border-dashed p-8 transition",
          error ? "border-red-300 bg-red-50" :
          drag ? "border-pink-300 bg-pink-50" : 
          isUploading ? "border-blue-300 bg-blue-50" :
          "border-zinc-200 bg-white"
        )}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        aria-label="Upload product image"
      >
        <div className="pointer-events-none flex flex-col items-center justify-center gap-2 text-center">
          {isLoading ? (
            <>
              <div className="rounded-full bg-pink-100 p-3">
                <div className="animate-spin h-6 w-6 border-2 border-pink-300 border-t-pink-600 rounded-full"></div>
              </div>
              <p className="text-zinc-800 font-medium">Processing image...</p>
              <p className="text-xs text-zinc-500">Extracting product names</p>
            </>
          ) : isUploading ? (
            <>
              <div className="rounded-full bg-blue-100 p-3">
                <div className="animate-spin h-6 w-6 border-2 border-blue-300 border-t-blue-600 rounded-full"></div>
              </div>
              <p className="text-zinc-800 font-medium">Uploading...</p>
              <p className="text-xs text-zinc-500">{Math.round(uploadProgress)}% complete</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-pink-100 p-3 text-xl">⬆️</div>
              <p className="text-zinc-800 font-medium">Upload product image</p>
              <p className="text-xs text-zinc-500">{hint}</p>
            </>
          )}
        </div>

        {preview && (
          <div className="absolute bottom-3 right-3">
            <img
              src={preview}
              alt="preview"
              className="h-16 w-16 rounded-lg border border-zinc-200 object-cover shadow-sm"
            />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={allowedTypes.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
      </div>
    </div>
  );
}
