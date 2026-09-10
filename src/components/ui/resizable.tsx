import { Group, Panel, Separator } from "react-resizable-panels";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: ComponentProps<typeof Group>) {
  return <Group className={cn("h-full w-full", className)} {...props} />;
}

const ResizablePanel = Panel;

function ResizableHandle({ className, ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn(
        "relative w-2 shrink-0 self-stretch bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:self-auto",
        "aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-px aria-[orientation=horizontal]:after:w-auto aria-[orientation=horizontal]:after:-translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2",
        className,
      )}
      {...props}
    />
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
