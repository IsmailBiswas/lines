import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { DocumentFile } from "@/lib/types";
import { HtmlEditor } from "./HtmlEditor";
import { Preview } from "./Preview";

type Props = {
  document: DocumentFile | undefined;
  onChange: (content: string) => void;
};

function useWideLayout() {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

export function SplitEditor({ document, onChange }: Props) {
  const wide = useWideLayout();

  return (
    <ResizablePanelGroup
      orientation={wide ? "horizontal" : "vertical"}
      className="min-h-0 flex-1"
    >
      <ResizablePanel defaultSize="50" minSize="20" className="min-h-0 bg-editor">
        <HtmlEditor value={document?.content ?? ""} onChange={onChange} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="50" minSize="20" className="min-h-0">
        <Preview html={document?.content ?? ""} fitKey={document?.key ?? ""} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
