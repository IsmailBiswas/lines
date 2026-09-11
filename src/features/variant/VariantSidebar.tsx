import { useEffect, useState } from "react";
import { VersionList, type VersionRow } from "@/features/version/VersionList";
import { Icons } from "@/lib/icons";
import type { Variant } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | null;
  variants: Variant[];
  currentVariant: string | null;
  versionRows: VersionRow[];
  currentVersion: string | null;
  onOpenVariant: (name: string) => void;
  onSelectVersion: (id: string) => void;
  onCreateVariant: (id: string) => void;
  onDeleteUnsaved: (id: string) => void;
};

export function VariantSidebar({
  userId,
  variants,
  currentVariant,
  versionRows,
  currentVersion,
  onOpenVariant,
  onSelectVersion,
  onCreateVariant,
  onDeleteUnsaved,
}: Props) {
  const [cache, setCache] = useState<Record<string, VersionRow[]>>({});

  useEffect(() => {
    setCache({});
  }, [userId]);

  useEffect(() => {
    if (!currentVariant) return;
    setCache((current) => ({ ...current, [currentVariant]: versionRows }));
  }, [currentVariant, versionRows]);

  return (
    <div className="space-y-4 px-4 py-4">
      {variants.map((variant) => {
        const selected = variant.name === currentVariant;
        const rows = selected ? versionRows : cache[variant.name];
        return (
          <div
            key={variant.name}
            className={cn("rounded-md px-2 py-2", selected ? "bg-accent" : "hover:bg-accent/40")}
          >
            <button
              type="button"
              onClick={() => onOpenVariant(variant.name)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-sm px-1 py-1 text-left text-xs",
                selected ? "font-medium" : "text-muted-foreground",
              )}
            >
              <Icons.variant className="size-3.5" />
              <span className="truncate">{variant.name}</span>
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                selected && rows ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                {rows ? (
                  <div className="mt-2">
                    <VersionList
                      rows={rows}
                      currentId={selected ? currentVersion : null}
                      onSelect={onSelectVersion}
                      onCreateVariant={onCreateVariant}
                      onDeleteUnsaved={onDeleteUnsaved}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
