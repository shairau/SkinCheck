import { cn } from "@/lib/utils";

export function Tag({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral"|"success"|"warn"|"danger"|"info"; className?: string }) {
  const map: Record<string,string> = {
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
    success: "bg-[#DFF3EA] text-emerald-900 border-emerald-200/70",
    warn: "bg-amber-100 text-amber-900 border-amber-200",
    danger: "bg-rose-100 text-rose-900 border-rose-200",
    info: "bg-[#FBE7EC] text-pink-900 border-pink-200",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", map[tone], className)}>{children}</span>;
}
