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
  onRename: (user: UserSummary) => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
};

export function UserSwitcher({
  users,
  current,
  onSwitch,
  onRename,
  onCreate,
  onImport,
  onExport,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-full justify-between px-2 font-medium">
          <span className="flex min-w-0 items-center gap-1.5">
            <Icons.currentUser />
            <span className="truncate">{current?.name ?? "No User"}</span>
          </span>
          <Icons.switchUser />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch User</DropdownMenuLabel>
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-0.5">
            <DropdownMenuItem
              onClick={() => onSwitch(user.id)}
              className={`min-w-0 flex-1 ${user.id === current?.id ? "font-medium" : ""}`}
            >
              <Icons.currentUser />
              <span className="truncate">{user.name}</span>
            </DropdownMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  aria-label="User Actions"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Icons.versionMenu />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40" sideOffset={4}>
                <DropdownMenuItem onSelect={() => onRename(user)}>
                  <Icons.renameUser />
                  Rename User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreate}>
          <Icons.createUser />
          Create New User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <Icons.importUser />
          Import Existing User
        </DropdownMenuItem>
        {current ? (
          <DropdownMenuItem onClick={onExport}>
            <Icons.exportUser />
            Export User Data
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
