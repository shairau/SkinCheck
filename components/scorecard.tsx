import { ProgressBar } from "@/components/ui/progress-bar";
import { Tag } from "@/components/ui/tag";
import { Sparkles } from "lucide-react";

export function Scorecard({ score, rationale, factors }: { score: number; rationale: string; factors: { label: string; value: number }[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white/80 shadow-sm p-6 md:p-8 grid md:grid-cols-[220px_1fr] gap-6">
      <div className="rounded-xl border bg-[#FBE7EC]/60 p-5 flex flex-col items-start gap-3">
        <Tag tone="info"><Sparkles className="h-4 w-4 mr-1" /> Routine Score</Tag>
        <div className="text-5xl font-bold tracking-tight text-[#141822]">{Math.round(score)}</div>
        <div className="text-xs text-neutral-600">out of 100</div>
      </div>
      <div className="space-y-5">
        <div className="space-y-3">
          {factors.map(f => <ProgressBar key={f.label} label={f.label} value={f.value} />)}
        </div>
        <p className="text-sm text-neutral-700 leading-6">{rationale}</p>
      </div>
    </div>
  );
}
