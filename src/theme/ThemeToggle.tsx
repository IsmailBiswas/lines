import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icons } from "@/lib/icons";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "Light" : "Dark";
  const Icon = theme === "dark" ? Icons.themeLight : Icons.themeDark;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Use ${next} theme`}>
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{next}</TooltipContent>
    </Tooltip>
  );
}
