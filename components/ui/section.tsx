import { cn } from "@/lib/utils";

export function Section({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-neutral-200/70 bg-white/70 shadow-sm p-6 md:p-8", className)}>
      <div className="mb-4">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-[#141822]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
