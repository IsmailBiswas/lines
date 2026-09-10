import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icons } from "@/lib/icons";

/** Keep in sync with `src-tauri/src/pdf_service.rs` PAGE_WIDTH_PX. */
const PAGE_WIDTH = 794;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

type Props = {
  html: string;
  fitKey: string;
};

export function Preview({ html, fitKey }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [page, setPage] = useState({ width: PAGE_WIDTH, height: 1123 });
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState<number | null>(null);

  const scale = zoom ?? fitScale;

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!viewport || !doc) return;

    const width = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth ?? 0, PAGE_WIDTH);
    const height = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0, 1);
    setPage({ width, height });

    const nextFit = Math.min(viewport.clientWidth / width, viewport.clientHeight / height);
    setFitScale(Number.isFinite(nextFit) && nextFit > 0 ? nextFit : 1);
  }, []);

  useEffect(() => {
    setZoom(null);
  }, [fitKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure]);

  function nudge(delta: number) {
    setZoom((current) => {
      const base = current ?? fitScale;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((base + delta) * 100) / 100));
    });
  }

  return (
    <div className="relative h-full min-h-0 w-full bg-background">
      <div ref={viewportRef} className={zoom == null ? "h-full w-full overflow-hidden" : "h-full w-full overflow-auto"}>
        <div
          className="relative"
          style={{
            width: page.width * scale,
            height: page.height * scale,
          }}
        >
          <iframe
            ref={iframeRef}
            title="Preview"
            sandbox="allow-same-origin"
            srcDoc={html}
            onLoad={measure}
            className="absolute left-0 top-0 origin-top-left bg-white"
            style={{
              width: page.width,
              height: page.height,
              transform: `scale(${scale})`,
              border: 0,
            }}
          />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-sm border bg-background/95 p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => nudge(-ZOOM_STEP)}>
              <Icons.zoomOut />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 font-normal" onClick={() => setZoom(null)}>
              {zoom == null ? "Fit" : `${Math.round(scale * 100)}%`}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => nudge(ZOOM_STEP)}>
              <Icons.zoomIn />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
