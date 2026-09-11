import type { ReactNode } from "react";
import { Icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function AccordionRow({ label, summary, open, onToggle, children }: Props) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-1 text-left text-xs outline-none focus:outline-none focus-visible:outline-none"
      >
        <Icons.chevronUp className={cn("size-3.5 shrink-0 transition-transform", !open && "rotate-180")} />
        <span className="shrink-0 font-medium">{label}</span>
        {!open && summary ? (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">: {summary}</span>
        ) : (
          <span className="flex-1" />
        )}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 py-2 pl-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
