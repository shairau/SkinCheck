export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#DFF3EA,#FBE7EC)" }} />
      </div>
      <span className="text-sm tabular-nums text-neutral-600">{Math.round(pct/20)}/5</span>
    </div>
  );
}
