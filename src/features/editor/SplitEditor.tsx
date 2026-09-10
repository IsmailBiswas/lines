import { Textarea } from "@/components/ui/textarea";
import type { DocumentFile } from "@/lib/types";

type Props = {
  document: DocumentFile | undefined;
  onChange: (content: string) => void;
};

export function SplitEditor({ document, onChange }: Props) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
      <div className="min-h-[240px] border-b lg:col-span-6 lg:border-b-0 lg:border-r">
        <Textarea
          value={document?.content ?? ""}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="h-full resize-none"
          aria-label="HTML editor"
        />
      </div>
      <div className="min-h-[240px] bg-muted/40 p-4 lg:col-span-6">
        <div className="h-full overflow-hidden rounded-sm border bg-white shadow-sm">
          <iframe
            title="Preview"
            sandbox=""
            srcDoc={document?.content ?? ""}
            className="h-full w-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}
