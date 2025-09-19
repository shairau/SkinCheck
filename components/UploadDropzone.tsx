"use client";
import React, { useCallback, useRef, useState } from "react";
import clsx from "clsx";

export function UploadDropzone({
  onFile,
  hint = "Supports JPG/PNG up to 10MB",
  isLoading = false,
}: {
  onFile: (file: File) => void;
  hint?: string;
  isLoading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={clsx(
        "relative rounded-xl border-2 border-dashed p-8 transition",
        drag ? "border-pink-300 bg-pink-50" : "border-zinc-200 bg-white"
      )}
      onClick={() => inputRef.current?.click()}
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
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
