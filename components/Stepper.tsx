import React from "react";
import clsx from "clsx";

type Step = { label: string; icon: React.ReactNode };
export function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps: Step[] = [
    { label: "Upload", icon: <span>📷</span> },
    { label: "Review", icon: <span>📝</span> },
    { label: "Analyze", icon: <span>🔎</span> },
  ];
  return (
    <div className="mx-auto mb-6 flex w-full max-w-3xl items-center justify-between">
      {steps.map((s, i) => {
        const idx = (i + 1) as 1 | 2 | 3;
        const active = step >= idx;
        return (
          <div key={s.label} className="flex flex-1 items-center">
            <div
              className={clsx(
                "flex items-center gap-2 rounded-full px-3 py-1 text-sm",
                active
                  ? "bg-pink-100 text-zinc-800"
                  : "bg-zinc-100 text-zinc-500"
              )}
            >
              <span>{s.icon}</span>
              <span className="font-medium">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={clsx(
                  "mx-2 h-[2px] flex-1 rounded",
                  active ? "bg-pink-200" : "bg-zinc-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
