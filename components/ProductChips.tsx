"use client";
import React, { useRef, useState } from "react";

export function ProductChips({
  value,
  onChange,
  placeholder = "Type a product and press Enter…",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(text: string) {
    const items = text
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!items.length) return;
    onChange([...value, ...items]);
    setDraft("");
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap gap-2">
        {value.map((p, i) => (
          <span
            key={`${p}-${i}`}
            className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-zinc-800"
          >
            {p}
            <button
              aria-label={`remove ${p}`}
              className="text-zinc-600 hover:text-zinc-900"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(draft); }
            if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (t.includes(",") || t.includes("\n")) {
              e.preventDefault();
              commit(t);
            }
          }}
          placeholder={placeholder}
          className="min-w-[220px] flex-1 border-0 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-zinc-400"
        />
      </div>
    </div>
  );
}
