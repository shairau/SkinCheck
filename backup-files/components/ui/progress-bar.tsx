interface ProgressBarProps {
  value?: number;
  label: string;
  variant?: 'default' | 'upload' | 'indeterminate';
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({ 
  value = 0, 
  label, 
  variant = 'default',
  showPercentage = false,
  className = ""
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  
  if (variant === 'indeterminate') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-sm text-neutral-700 min-w-[120px]">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-pink-300 to-pink-500 animate-pulse" />
        </div>
        <span className="text-sm text-neutral-600">Processing...</span>
      </div>
    );
  }

  if (variant === 'upload') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-sm text-neutral-700 min-w-[120px]">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-pink-300 to-pink-500 transition-all duration-300 ease-out" 
            style={{ width: `${pct}%` }} 
          />
        </div>
        <span className="text-sm tabular-nums text-neutral-600 min-w-[50px] text-right">
          {showPercentage ? `${Math.round(pct)}%` : `${Math.round(pct/20)}/5`}
        </span>
      </div>
    );
  }

  // Default variant (original behavior)
  return (
    <div className={`grid grid-cols-[160px_1fr_auto] items-center gap-3 ${className}`}>
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#DFF3EA,#FBE7EC)" }} />
      </div>
      <span className="text-sm tabular-nums text-neutral-600">{Math.round(pct/20)}/5</span>
    </div>
  );
}
