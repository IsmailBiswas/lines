import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SplitEditor } from "@/features/editor/SplitEditor";
import { UserSwitcher } from "@/features/user/UserSwitcher";
import { buildVersionRows, VersionList } from "@/features/version/VersionList";
import { api } from "@/lib/api";
import { Icons } from "@/lib/icons";
import type { DocumentFile, MappedImport, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

const emptyWorkspace: Workspace = {
  users: [],
  current_user: null,
  variants: [],
  current_variant: null,
  versions: [],
  current_version: null,
  documents: [],
  current_tab: null,
  pdf_folder: null,
  pdf_name_pattern: null,
};

function sameDocuments(left: DocumentFile[], right: DocumentFile[]) {
  if (left.length !== right.length) return false;
  const a = [...left].sort((x, y) => x.key.localeCompare(y.key));
  const b = [...right].sort((x, y) => x.key.localeCompare(y.key));
  return a.every((doc, index) => doc.key === b[index].key && doc.content === b[index].content);
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [tab, setTab] = useState("resume");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState("");
  const [variantName, setVariantName] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [fromVersionId, setFromVersionId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    | null
    | "create-user"
    | "import-user"
    | "create-variant"
    | "create-variant-from"
    | "import-variant"
    | "add-doc"
    | "export-pdf"
    | "map-files"
    | "name-version"
    | "delete-unsaved"
  >(null);
  const [deleteUnsavedId, setDeleteUnsavedId] = useState<string | null>(null);
  const [versionName, setVersionName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [fileKinds, setFileKinds] = useState<Record<string, string>>({});
  const [extraName, setExtraName] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfFolder, setPdfFolder] = useState("");
  const [setPdfDefault, setSetPdfDefault] = useState(false);
  const [downloads, setDownloads] = useState("");

  const dirty = useMemo(
    () => !sameDocuments(documents, workspace.documents),
    [documents, workspace.documents],
  );

  const apply = useCallback((next: Workspace) => {
    setWorkspace(next);
    setDocuments(next.documents);
    setTab(next.current_tab ?? next.documents[0]?.key ?? "resume");
  }, []);

  const run = useCallback(
    async (work: () => Promise<Workspace | void>, after?: () => void) => {
      setBusy(true);
      setError(null);
      try {
        const next = await work();
        if (next) apply(next);
        after?.();
      } catch (cause) {
        setError(String(cause));
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const persistIfNeeded = useCallback(async () => {
    if (!dirty || !workspace.current_variant || !workspace.current_version) return;
    if (workspace.current_version === "pending-unsaved") return;
    const next = await api.saveDocuments(
      workspace.current_variant,
      workspace.current_version,
      documents,
      tab,
    );
    apply(next);
  }, [apply, dirty, documents, tab, workspace.current_variant, workspace.current_version]);

  useEffect(() => {
    void api
      .bootstrap()
      .then(apply)
      .catch((cause) => setError(String(cause)));
    void api.downloadsDir().then(setDownloads).catch(() => undefined);
  }, [apply]);

  useEffect(() => {
    const unlisten = listen("close-requested", async () => {
      try {
        await persistIfNeeded();
        await getCurrentWindow().destroy();
      } catch (cause) {
        setError(String(cause));
      }
    });
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [persistIfNeeded]);

  const currentDocument = documents.find((document) => document.key === tab);
  const filteredVariants = workspace.variants.filter((variant) =>
    variant.name.toLowerCase().includes(query.toLowerCase()),
  );
  const versionRows = buildVersionRows(workspace.versions, dirty, workspace.current_version);

  async function handleSwitchUser(id: string) {
    if (id === workspace.current_user?.id) return;
    await run(async () => {
      await persistIfNeeded();
      return api.switchUser(id);
    });
  }

  async function handleOpenVariant(name: string) {
    if (name === workspace.current_variant) return;
    await run(async () => {
      await persistIfNeeded();
      return api.openVariant(name);
    });
  }

  async function handleOpenVersion(id: string) {
    if (id === workspace.current_version) return;
    await run(async () => {
      await persistIfNeeded();
      return api.openVersion(id);
    });
  }

  function updateContent(content: string) {
    setDocuments((current) =>
      current.map((document) => (document.key === tab ? { ...document, content } : document)),
    );
  }

  async function handleSave() {
    setVersionName("");
    setDialog("name-version");
  }

  async function handleFinishVersion() {
    if (!workspace.current_variant || !workspace.current_version) return;
    await run(
      () =>
        api.finishVersion(
          workspace.current_variant!,
          workspace.current_version!,
          documents,
          versionName,
          tab,
        ),
      () => {
        setDialog(null);
        setVersionName("");
      },
    );
  }

  async function handleCreateUser() {
    await run(() => api.createUser(userName), () => {
      setDialog(null);
      setUserName("");
    });
  }

  async function handleCreateVariant() {
    await run(() => api.createVariant(variantName), () => {
      setDialog(null);
      setVariantName("");
    });
  }

  async function handleDeleteUnsaved() {
    if (!deleteUnsavedId) return;
    if (deleteUnsavedId === "pending-unsaved") {
      setDocuments(workspace.documents);
      setDialog(null);
      setDeleteUnsavedId(null);
      return;
    }
    if (!workspace.current_variant) return;
    await run(
      () => api.deleteUnsaved(workspace.current_variant!, deleteUnsavedId, tab),
      () => {
        setDialog(null);
        setDeleteUnsavedId(null);
      },
    );
  }

  async function handleCreateVariantFrom() {
    if (!fromVersionId) return;
    await run(
      async () => {
        await persistIfNeeded();
        return api.createVariantFromVersion(variantName, fromVersionId);
      },
      () => {
        setDialog(null);
        setVariantName("");
        setFromVersionId(null);
      },
    );
  }

  async function pickHtmlFiles() {
    const selected = await open({
      multiple: true,
      filters: [{ name: "HTML", extensions: ["html", "htm"] }],
    });
    if (!selected) return;
    const files = Array.isArray(selected) ? selected : [selected];
    if (files.length === 1) {
      await run(
        () =>
          api.importVariant(variantName, [{ path: files[0], kind: "resume", extra_name: null }]),
        () => {
          setDialog(null);
          setVariantName("");
        },
      );
      return;
    }
    setPendingFiles(files);
    setFileKinds(
      Object.fromEntries(
        files.map((file, index) => [file, index === 0 ? "resume" : "additional"]),
      ),
    );
    setDialog("map-files");
  }

  async function finishMappedImport() {
    const files: MappedImport[] = pendingFiles.map((path) => ({
      path,
      kind: fileKinds[path] ?? "additional",
      extra_name: null,
    }));
    await run(() => api.importVariant(variantName, files), () => {
      setDialog(null);
      setVariantName("");
      setPendingFiles([]);
    });
  }

  async function handleImportUserLocal() {
    const selected = await open({ directory: true });
    if (!selected || Array.isArray(selected)) return;
    await run(() => api.importUserLocal(userName, selected), () => {
      setDialog(null);
      setUserName("");
    });
  }

  async function handleImportUserRemote() {
    await run(() => api.importUserRemote(userName, remoteUrl), () => {
      setDialog(null);
      setUserName("");
      setRemoteUrl("");
    });
  }

  async function handleExportUser() {
    const dest = await open({
      directory: true,
      defaultPath: downloads || undefined,
    });
    if (!dest || Array.isArray(dest)) return;
    setBusy(true);
    setError(null);
    try {
      await persistIfNeeded();
      await api.exportUser(dest);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddDocument(kind: "cover-letter" | "additional") {
    if (kind === "additional") {
      setDialog("add-doc");
      return;
    }
    if (!workspace.current_variant || !workspace.current_version) return;
    await run(() =>
      api.addDocument(
        workspace.current_variant!,
        workspace.current_version!,
        documents,
        kind,
      ),
    );
  }

  async function handleAddNamedDocument() {
    if (!workspace.current_variant || !workspace.current_version) return;
    await run(
      () =>
        api.addDocument(
          workspace.current_variant!,
          workspace.current_version!,
          documents,
          "additional",
          extraName,
        ),
      () => {
        setDialog(null);
        setExtraName("");
      },
    );
  }

  async function openExportPdf() {
    const folder = workspace.pdf_folder || downloads;
    const pattern = workspace.pdf_name_pattern || currentDocument?.name || "resume";
    setPdfFolder(folder);
    setPdfName(pattern.endsWith(".pdf") ? pattern : `${pattern}.pdf`);
    setSetPdfDefault(false);
    setDialog("export-pdf");
  }

  async function handleExportPdf() {
    const dest = `${pdfFolder.replace(/\/$/, "")}/${pdfName}`;
    setBusy(true);
    setError(null);
    try {
      await api.exportPdf(currentDocument?.content ?? "", dest, pdfFolder, pdfName, setPdfDefault);
      setDialog(null);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function pickPdfFolder() {
    const selected = await open({ directory: true, defaultPath: pdfFolder || downloads });
    if (selected && !Array.isArray(selected)) setPdfFolder(selected);
  }

  const noUsers = workspace.users.length === 0;
  const noVariants = Boolean(workspace.current_user) && workspace.variants.length === 0;
  const hasCoverLetter = documents.some((document) => document.kind === "cover-letter");
  const currentIsUnsaved = workspace.versions.some(
    (version) => version.id === workspace.current_version && version.is_unsaved,
  );
  const canSave = Boolean(
    workspace.current_variant && workspace.current_version && (dirty || currentIsUnsaved),
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full overflow-hidden">
        <aside
          className={cn(
            "w-64 shrink-0 flex-col border-r bg-background",
            sidebarOpen ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="p-2">
            <UserSwitcher
              users={workspace.users}
              current={workspace.current_user}
              onSwitch={(id) => void handleSwitchUser(id)}
              onCreate={() => setDialog("create-user")}
              onImport={() => setDialog("import-user")}
              onExport={() => void handleExportUser()}
            />
          </div>
          <Separator />
          {workspace.current_user && workspace.variants.length > 0 ? (
          <div className="flex items-center gap-1 p-2">
            <div className="relative flex-1">
              <Icons.search className="pointer-events-none absolute left-2 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="pl-7"
              />
            </div>
          </div>
          ) : null}
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-2">
              {filteredVariants.map((variant) => (
                <div key={variant.name}>
                  <button
                    type="button"
                    onClick={() => void handleOpenVariant(variant.name)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-xs",
                      variant.name === workspace.current_variant
                        ? "bg-accent font-medium"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <Icons.variant className="size-3.5" />
                    <span className="truncate">{variant.name}</span>
                  </button>
                  {variant.name === workspace.current_variant ? (
                    <div className="mt-1">
                      <VersionList
                        rows={versionRows}
                        currentId={workspace.current_version}
                        onSelect={(id) => void handleOpenVersion(id)}
                        onCreateVariant={(id) => {
                          setFromVersionId(id);
                          setVariantName("");
                          setDialog("create-variant-from");
                        }}
                        onDeleteUnsaved={(id) => {
                          setDeleteUnsavedId(id);
                          setDialog("delete-unsaved");
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-10 items-center gap-2 border-b px-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <Icons.sidebar />
              <span className="sr-only">Open sidebar</span>
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {documents.map((document) => {
                const Icon =
                  document.kind === "resume"
                    ? Icons.resume
                    : document.kind === "cover-letter"
                      ? Icons.coverLetter
                      : Icons.additional;
                return (
                  <button
                    key={document.key}
                    type="button"
                    onClick={() => {
                      setTab(document.key);
                      void api.rememberTab(document.key);
                    }}
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center gap-1 rounded-sm px-2 text-xs",
                      tab === document.key ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {document.name}
                  </button>
                );
              })}
              {workspace.current_variant ? (
                <>
                  {!hasCoverLetter ? (
                    <Button variant="ghost" size="sm" onClick={() => void handleAddDocument("cover-letter")}>
                      <Icons.addCoverLetter />
                      Add cover letter
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => void handleAddDocument("additional")}>
                    <Icons.addDocument />
                    Add document
                  </Button>
                </>
              ) : null}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => void handleSave()} disabled={!canSave || busy}>
                  {busy ? <Icons.busy className="animate-spin" /> : <Icons.save />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => void openExportPdf()} disabled={!currentDocument}>
                  <Icons.exportPdf />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
          </header>

          {error ? (
            <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
              <Icons.error className="size-3.5" />
              {error}
            </div>
          ) : null}

          {noUsers ? (
            <EmptyState
              title="Create the first user"
              copy="A user is a complete, separate workspace."
              primary="Create user"
              onPrimary={() => setDialog("create-user")}
              secondary="Import user"
              onSecondary={() => setDialog("import-user")}
            />
          ) : noVariants ? (
            <EmptyState
              title={`Start ${workspace.current_user?.name ?? "this user"}`}
              copy="Create a new resume or import HTML files."
              primary="Create new"
              onPrimary={() => setDialog("create-variant")}
              secondary="Import existing"
              onSecondary={() => setDialog("import-variant")}
            />
          ) : (
            <SplitEditor document={currentDocument} onChange={updateContent} />
          )}
        </main>
      </div>

      <Dialog open={dialog === "create-user"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>This starts a new workspace.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="user-name">User name</Label>
          <Input id="user-name" value={userName} onChange={(event) => setUserName(event.target.value)} />
          <Button className="mt-3" onClick={() => void handleCreateUser()} disabled={!userName.trim() || busy}>
            Create
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "import-user"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import user</DialogTitle>
            <DialogDescription>Open a whole repository as a user.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="import-user-name">User name</Label>
          <Input id="import-user-name" value={userName} onChange={(event) => setUserName(event.target.value)} />
          <Label htmlFor="remote-url" className="mt-2 block">
            Remote, if you have one
          </Label>
          <Input
            id="remote-url"
            value={remoteUrl}
            onChange={(event) => setRemoteUrl(event.target.value)}
            placeholder="https://..."
          />
          <div className="mt-3 flex gap-2">
            <Button variant="outline" onClick={() => void handleImportUserLocal()} disabled={busy}>
              <Icons.importUser />
              Local folder
            </Button>
            <Button onClick={() => void handleImportUserRemote()} disabled={!remoteUrl.trim() || busy}>
              Import remote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "create-variant"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create</DialogTitle>
            <DialogDescription>Name this first resume line.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="variant-name">Name</Label>
          <Input id="variant-name" value={variantName} onChange={(event) => setVariantName(event.target.value)} />
          <Button className="mt-3" onClick={() => void handleCreateVariant()} disabled={!variantName.trim() || busy}>
            Create
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete-unsaved"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Unsaved</DialogTitle>
            <DialogDescription>This work will be gone.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>
              Keep
            </Button>
            <Button onClick={() => void handleDeleteUnsaved()} disabled={busy}>
              <Icons.deleteUnsaved />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "create-variant-from"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create variant</DialogTitle>
            <DialogDescription>This starts a new line from the chosen version.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="variant-from-name">Name</Label>
          <Input
            id="variant-from-name"
            value={variantName}
            onChange={(event) => setVariantName(event.target.value)}
          />
          <Button
            className="mt-3"
            onClick={() => void handleCreateVariantFrom()}
            disabled={!variantName.trim() || busy}
          >
            Create
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "import-variant"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import</DialogTitle>
            <DialogDescription>Choose a name, then one or more HTML files.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="import-variant-name">Name</Label>
          <Input
            id="import-variant-name"
            value={variantName}
            onChange={(event) => setVariantName(event.target.value)}
          />
          <Button className="mt-3" onClick={() => void pickHtmlFiles()} disabled={!variantName.trim() || busy}>
            <Icons.importHtml />
            Choose files
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "map-files"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map files</DialogTitle>
            <DialogDescription>Say which file is the resume, cover letter, or additional.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-auto">
            {pendingFiles.map((file) => (
              <div key={file} className="space-y-1">
                <p className="truncate text-[11px] text-muted-foreground">{file.split("/").pop()}</p>
                <select
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                  value={fileKinds[file]}
                  onChange={(event) =>
                    setFileKinds((current) => ({ ...current, [file]: event.target.value }))
                  }
                >
                  <option value="resume">Resume</option>
                  <option value="cover-letter">Cover letter</option>
                  <option value="additional">Additional document</option>
                </select>
              </div>
            ))}
          </div>
          <Button className="mt-3" onClick={() => void finishMappedImport()} disabled={busy}>
            Import
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "name-version"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name this version</DialogTitle>
            <DialogDescription>This becomes the saved version name.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="version-name">Name</Label>
          <Input
            id="version-name"
            value={versionName}
            onChange={(event) => setVersionName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && versionName.trim()) void handleFinishVersion();
            }}
          />
          <Button className="mt-3" onClick={() => void handleFinishVersion()} disabled={!versionName.trim() || busy}>
            Save
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "add-doc"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
          </DialogHeader>
          <Label htmlFor="doc-name">Name</Label>
          <Input id="doc-name" value={extraName} onChange={(event) => setExtraName(event.target.value)} />
          <Button className="mt-3" onClick={() => void handleAddNamedDocument()} disabled={!extraName.trim() || busy}>
            Add document
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "export-pdf"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export</DialogTitle>
            <DialogDescription>
              By default this goes to {workspace.pdf_folder || downloads || "Downloads"} as{" "}
              {workspace.pdf_name_pattern || currentDocument?.name || "the document name"}.
            </DialogDescription>
          </DialogHeader>
          <Label>Folder</Label>
          <div className="flex gap-2">
            <Input value={pdfFolder} onChange={(event) => setPdfFolder(event.target.value)} />
            <Button variant="outline" onClick={() => void pickPdfFolder()}>
              Browse
            </Button>
          </div>
          <Label className="mt-2 block">File name</Label>
          <Input value={pdfName} onChange={(event) => setPdfName(event.target.value)} />
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={setPdfDefault}
              onChange={(event) => setSetPdfDefault(event.target.checked)}
            />
            Set default path and name
          </label>
          <Button className="mt-3" onClick={() => void handleExportPdf()} disabled={!pdfFolder || !pdfName || busy}>
            Export
          </Button>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function EmptyState({
  title,
  copy,
  primary,
  onPrimary,
  secondary,
  onSecondary,
}: {
  title: string;
  copy: string;
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-sm font-medium">{title}</h1>
      <p className="max-w-sm text-xs text-muted-foreground">{copy}</p>
      <div className="flex gap-2">
        <Button onClick={onPrimary}>
          <Icons.emptyCreate />
          {primary}
        </Button>
        <Button variant="outline" onClick={onSecondary}>
          <Icons.emptyImport />
          {secondary}
        </Button>
      </div>
    </div>
  );
}
