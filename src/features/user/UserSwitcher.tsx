import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/lib/icons";
import type { UserSummary } from "@/lib/types";

type Props = {
  users: UserSummary[];
  current: UserSummary | null;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
};

export function UserSwitcher({ users, current, onSwitch, onCreate, onImport, onExport }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-full justify-between px-2 font-medium">
          <span className="flex min-w-0 items-center gap-1.5">
            <Icons.currentUser />
            <span className="truncate">{current?.name ?? "No user"}</span>
          </span>
          <Icons.switchUser />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch user</DropdownMenuLabel>
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => onSwitch(user.id)}
            className={user.id === current?.id ? "font-medium" : undefined}
          >
            <Icons.currentUser />
            {user.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreate}>
          <Icons.createUser />
          Create user
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <Icons.importUser />
          Import user
        </DropdownMenuItem>
        {current ? (
          <DropdownMenuItem onClick={onExport}>
            <Icons.exportUser />
            Export user
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
