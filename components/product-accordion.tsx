import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/ui/tag";

export function ProductAccordion({ items }: { items: { matched_product: string; role?: string; key_benefits?: string[]; cautions?: string[]; citations?: string[] }[] }) {
  return (
    <div className="divide-y divide-neutral-200/70 rounded-2xl border border-neutral-200/70 bg-white/70 shadow-sm">
      {items.map((p, i) => <Row key={i} {...p} />)}
    </div>
  );
}

function Row(p: any) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={()=>setOpen(v=>!v)} className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50/70">
        <div>
          <div className="font-medium text-[#141822]">{p.matched_product}</div>
          {p.role && <div className="text-sm text-neutral-600 mt-0.5 capitalize">{p.role}</div>}
        </div>
        <ChevronDown className={cn("h-5 w-5 text-neutral-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-5 grid md:grid-cols-2 gap-5">
          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-2">Key Benefits</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">{(p.key_benefits||[]).map((b:string,i:number)=><li key={i}>{b}</li>)}</ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-2">Notes</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">{(p.cautions||[]).map((b:string,i:number)=><li key={i}>{b}</li>)}</ul>
            {p.citations?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.citations.map((u:string,i:number)=><a key={i} href={u} target="_blank" className="text-xs underline text-neutral-600 hover:text-neutral-800 truncate max-w-[260px]">{u}</a>)}
              </div>
            ): null}
          </div>
        </div>
      )}
    </div>
  );
}
