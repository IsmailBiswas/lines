import { Button } from "@/components/ui/button";
import { AccordionRow } from "@/components/ui/accordion-row";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Icons } from "@/lib/icons";
import type { DocumentFile } from "@/lib/types";

type Section = "name" | "location" | "files" | null;

type Props = {
  open: boolean;
  busy: boolean;
  documents: DocumentFile[];
  selectedKeys: string[];
  pdfName: string;
  pdfFolder: string;
  expanded: Section;
  onOpenChange: (open: boolean) => void;
  onToggle: (section: Exclude<Section, null>) => void;
  onNameChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onBrowse: () => void;
  onToggleFile: (key: string) => void;
  onSubmit: () => void;
};

export function ExportPdfDialog({
  open,
  busy,
  documents,
  selectedKeys,
  pdfName,
  pdfFolder,
  expanded,
  onOpenChange,
  onToggle,
  onNameChange,
  onFolderChange,
  onBrowse,
  onToggleFile,
  onSubmit,
}: Props) {
  const selected = documents.filter((document) => selectedKeys.includes(document.key));
  const filesSummary =
    selected.length === documents.length
      ? `All ${documents.length}`
      : selected.map((document) => document.name).join(", ") || "None";

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent aria-describedby={undefined}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (pdfFolder && pdfName && selected.length && !busy) onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Export</DialogTitle>
          </DialogHeader>
          <AccordionRow
            label="Resume File Name"
            summary={pdfName || "resume.pdf"}
            open={expanded === "name"}
            onToggle={() => onToggle("name")}
          >
            <Input value={pdfName} onChange={(event) => onNameChange(event.target.value)} disabled={busy} />
          </AccordionRow>
          <AccordionRow
            label="Save Location"
            summary={pdfFolder || "Downloads"}
            open={expanded === "location"}
            onToggle={() => onToggle("location")}
          >
            <div className="flex gap-2">
              <Input value={pdfFolder} onChange={(event) => onFolderChange(event.target.value)} disabled={busy} />
              <Button type="button" variant="outline" onClick={onBrowse} disabled={busy}>
                Browse
              </Button>
            </div>
          </AccordionRow>
          <AccordionRow
            label="Files"
            summary={filesSummary}
            open={expanded === "files"}
            onToggle={() => onToggle("files")}
          >
            <div className="space-y-2">
              {documents.map((document) => (
                <label key={document.key} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(document.key)}
                    onChange={() => onToggleFile(document.key)}
                    disabled={busy}
                  />
                  {document.name}
                </label>
              ))}
            </div>
          </AccordionRow>
          {busy ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
              <Icons.busy className="size-3.5 animate-spin" />
              Writing PDFs…
            </div>
          ) : null}
          <Button type="submit" disabled={!pdfFolder || !pdfName || selected.length === 0 || busy}>
            {busy ? <Icons.busy className="animate-spin" /> : <Icons.exportPdf />}
            Export
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
