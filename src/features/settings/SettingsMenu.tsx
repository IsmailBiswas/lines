import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icons } from "@/lib/icons";
import { useTheme } from "@/theme";

type Props = {
  hasUser: boolean;
  onRemote: () => void;
};

export function SettingsMenu({ hasUser, onRemote }: Props) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "Light" : "Dark";
  const ThemeIcon = theme === "dark" ? Icons.themeLight : Icons.themeDark;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Icons.settings />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52 p-2">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuItem onClick={toggleTheme}>
          <ThemeIcon />
          Use {next.toLowerCase()} theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRemote} disabled={!hasUser}>
          <Icons.openLink />
          Remote
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
