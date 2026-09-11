import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, autoComplete, spellCheck, autoCorrect, autoCapitalize, ...props }, ref) => (
    <input
      type={type}
      autoComplete={autoComplete ?? "off"}
      autoCorrect={autoCorrect ?? "off"}
      autoCapitalize={autoCapitalize ?? "off"}
      spellCheck={spellCheck ?? false}
      className={cn(
        "flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-none transition-colors file:border-0 file:bg-transparent file:text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
