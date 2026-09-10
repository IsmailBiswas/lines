import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icons } from "@/lib/icons";
import type { Version } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";

export type VersionRow = {
  version: Version;
  indent: boolean;
  pending?: boolean;
};

type Props = {
  rows: VersionRow[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreateVariant: (id: string) => void;
  onDeleteUnsaved: (id: string) => void;
};

export function VersionList({
  rows,
  currentId,
  onSelect,
  onCreateVariant,
  onDeleteUnsaved,
}: Props) {
  return (
    <div className="space-y-0.5 pl-4">
      {rows.map((row) => {
        const selected = row.version.id === currentId || (row.pending && currentId === row.version.parent_id);
        const Icon = row.version.is_unsaved ? Icons.draft : Icons.version;
        const created = row.version.timestamp ? formatTime(row.version.timestamp) : "";
        const label = row.version.is_unsaved ? "Draft" : row.version.message || "Version";
        const rowButton = (
          <button
            type="button"
            onClick={() => {
              if (!row.pending) onSelect(row.version.id);
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left"
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
        return (
          <div
            key={`${row.version.id}-${row.pending ? "pending" : "real"}`}
            className={cn(
              "group flex w-full items-center gap-1 rounded-sm pr-1 text-xs",
              row.indent && "pl-4",
              selected ? "bg-accent font-medium" : "hover:bg-accent/60",
              row.version.is_unsaved && "italic text-muted-foreground",
            )}
          >
            {created ? (
              <Tooltip>
                <TooltipTrigger asChild>{rowButton}</TooltipTrigger>
                <TooltipContent>{created}</TooltipContent>
              </Tooltip>
            ) : (
              rowButton
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-70 group-hover:opacity-100"
                  aria-label="Version actions"
                >
                  <Icons.versionMenu />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {row.version.is_unsaved ? (
                  <DropdownMenuItem onClick={() => onDeleteUnsaved(row.version.id)}>
                    <Icons.deleteUnsaved />
                    Delete Draft
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onCreateVariant(row.version.id)}>
                    <Icons.createVariant />
                    Create variant
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}

export function buildVersionRows(
  versions: Version[],
  dirty: boolean,
  selectedId: string | null,
): VersionRow[] {
  const unsaved = versions.filter((version) => version.is_unsaved);
  const finished = versions.filter((version) => !version.is_unsaved);
  const rows: VersionRow[] = [];

  for (const version of finished) {
    rows.push({ version, indent: false });
    const child = unsaved.find((item) => item.parent_id === version.id);
    if (child) {
      rows.push({ version: child, indent: true });
    } else if (dirty && selectedId === version.id) {
      rows.push({
        version: {
          id: "pending-unsaved",
          message: "Draft",
          timestamp: 0,
          is_unsaved: true,
          parent_id: version.id,
        },
        indent: true,
        pending: true,
      });
    }
  }

  for (const item of unsaved) {
    if (!finished.some((version) => version.id === item.parent_id)) {
      rows.unshift({ version: item, indent: false });
    }
  }

  return rows;
}
