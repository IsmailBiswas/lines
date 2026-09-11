import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { AccordionRow } from "@/components/ui/accordion-row";
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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SplitEditor } from "@/features/editor/SplitEditor";
import { ExportPdfDialog } from "@/features/export/ExportPdfDialog";
import { SettingsMenu } from "@/features/settings/SettingsMenu";
import { UserSwitcher } from "@/features/user/UserSwitcher";
import { VariantSidebar } from "@/features/variant/VariantSidebar";
import { buildVersionRows } from "@/features/version/VersionList";
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
  remote_url: null,
  has_remote_token: false,
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
  const [remoteToken, setRemoteToken] = useState("");
  const [createRepoOpen, setCreateRepoOpen] = useState(false);
  const [remoteHost, setRemoteHost] = useState<"github" | "gitlab">("github");
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
    | "remote"
  >(null);
  const [deleteUnsavedId, setDeleteUnsavedId] = useState<string | null>(null);
  const [versionName, setVersionName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [fileKinds, setFileKinds] = useState<Record<string, string>>({});
  const [extraName, setExtraName] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfFolder, setPdfFolder] = useState("");
  const [exportKeys, setExportKeys] = useState<string[]>([]);
  const [exportSection, setExportSection] = useState<"name" | "location" | "files" | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
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
    const pattern = workspace.pdf_name_pattern || "resume.pdf";
    setPdfFolder(folder);
    setPdfName(pattern.endsWith(".pdf") ? pattern : `${pattern}.pdf`);
    setExportKeys(documents.map((document) => document.key));
    setExportSection(null);
    setDialog("export-pdf");
  }

  async function handleExportPdf() {
    const selected = documents.filter((document) => exportKeys.includes(document.key));
    if (!selected.length) {
      setError("Select at least one file to export.");
      return;
    }
    setExportBusy(true);
    setError(null);
    try {
      await api.exportPdf(
        selected.map((document) => ({
          name: document.kind === "resume" ? pdfName : document.name,
          html: document.content,
        })),
        pdfFolder,
        pdfName,
      );
      setWorkspace((current) => ({
        ...current,
        pdf_folder: pdfFolder,
        pdf_name_pattern: pdfName,
      }));
      setDialog(null);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setExportBusy(false);
    }
  }

  function openRemote() {
    setRemoteUrl(workspace.remote_url || "");
    setRemoteToken("");
    setCreateRepoOpen(false);
    setRemoteHost("github");
    setDialog("remote");
  }

  async function handleSetRemote() {
    await run(() => api.setRemote(remoteUrl, remoteToken), () => {
      setDialog(null);
      setRemoteToken("");
    });
  }

  async function handleSync() {
    await run(async () => {
      await persistIfNeeded();
      return api.syncUser();
    });
  }

  async function pickPdfFolder() {
    const selected = await open({ directory: true, defaultPath: pdfFolder || downloads });
    if (selected && !Array.isArray(selected)) setPdfFolder(selected);
  }

  const wide = useWideLayout();
  const showSidebar = wide || sidebarOpen;
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
      <ResizablePanelGroup orientation="horizontal" className="h-full overflow-hidden">
        {showSidebar ? (
          <>
            <ResizablePanel defaultSize="22" minSize="16" maxSize="40" className="min-h-0">
              <aside className="flex h-full min-h-0 flex-col bg-background">
                <div className="flex h-10 shrink-0 items-center border-b px-4">
                  <UserSwitcher
                    users={workspace.users}
                    current={workspace.current_user}
                    onSwitch={(id) => void handleSwitchUser(id)}
                    onCreate={() => setDialog("create-user")}
                    onImport={() => setDialog("import-user")}
                    onExport={() => void handleExportUser()}
                  />
                </div>
                {workspace.current_user && workspace.variants.length > 0 ? (
                  <div className="flex h-10 shrink-0 items-center gap-2 px-4">
                    <div className="relative flex-1">
                      <Icons.search className="pointer-events-none absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search"
                        className="pl-7"
                      />
                    </div>
                  </div>
                ) : null}
                <ScrollArea className="min-h-0 flex-1">
                  <VariantSidebar
                    userId={workspace.current_user?.id ?? null}
                    variants={filteredVariants}
                    currentVariant={workspace.current_variant}
                    versionRows={versionRows}
                    currentVersion={workspace.current_version}
                    onOpenVariant={(name) => void handleOpenVariant(name)}
                    onSelectVersion={(id) => void handleOpenVersion(id)}
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
                </ScrollArea>
              </aside>
            </ResizablePanel>
            <ResizableHandle />
          </>
        ) : null}

        <ResizablePanel defaultSize={showSidebar ? "78" : "100"} minSize="40" className="min-h-0">
        <main className="flex h-full min-w-0 flex-col">
          <header className="flex h-10 items-center gap-2 border-b px-4">
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
            <SettingsMenu hasUser={Boolean(workspace.current_user)} onRemote={openRemote} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleSync()}
                  disabled={
                    !workspace.current_user ||
                    !workspace.remote_url ||
                    !workspace.has_remote_token ||
                    busy
                  }
                >
                  {busy ? <Icons.busy className="animate-spin" /> : <Icons.sync />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => void handleSave()} disabled={!canSave || busy}>
                  {busy ? <Icons.busy className="animate-spin" /> : <Icons.save />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create new version</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void openExportPdf()}
                  disabled={!documents.length || exportBusy}
                >
                  <Icons.exportPdf />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
          </header>

          {error ? (
            <div className="flex items-center gap-2 border-b px-4 py-2 text-xs">
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
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={dialog === "create-user"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (userName.trim() && !busy) void handleCreateUser();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>This starts a new workspace.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="user-name">User name</Label>
              <Input id="user-name" value={userName} onChange={(event) => setUserName(event.target.value)} />
            </div>
            <Button type="submit" disabled={!userName.trim() || busy}>
              Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "import-user"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              if (remoteUrl.trim()) void handleImportUserRemote();
              else void handleImportUserLocal();
            }}
          >
            <DialogHeader>
              <DialogTitle>Import user</DialogTitle>
              <DialogDescription>Open a whole repository as a user.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="import-user-name">User name</Label>
              <Input id="import-user-name" value={userName} onChange={(event) => setUserName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remote-url">Remote, if you have one</Label>
              <Input
                id="remote-url"
                value={remoteUrl}
                onChange={(event) => setRemoteUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void handleImportUserLocal()} disabled={busy}>
                <Icons.importUser />
                Local folder
              </Button>
              <Button type="submit" disabled={busy}>
                {remoteUrl.trim() ? "Import remote" : "Import"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "create-variant"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (variantName.trim() && !busy) void handleCreateVariant();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create</DialogTitle>
              <DialogDescription>Name this first resume line.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="variant-name">Name</Label>
              <Input id="variant-name" value={variantName} onChange={(event) => setVariantName(event.target.value)} />
            </div>
            <Button type="submit" disabled={!variantName.trim() || busy}>
              Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete-unsaved"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Draft</DialogTitle>
            <DialogDescription>This work will be gone.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2">
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
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (variantName.trim() && !busy) void handleCreateVariantFrom();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create variant</DialogTitle>
              <DialogDescription>This starts a new line from the chosen version.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="variant-from-name">Name</Label>
              <Input
                id="variant-from-name"
                value={variantName}
                onChange={(event) => setVariantName(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={!variantName.trim() || busy}>
              Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "import-variant"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (variantName.trim() && !busy) void pickHtmlFiles();
            }}
          >
            <DialogHeader>
              <DialogTitle>Import</DialogTitle>
              <DialogDescription>Choose a name, then one or more HTML files.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="import-variant-name">Name</Label>
              <Input
                id="import-variant-name"
                value={variantName}
                onChange={(event) => setVariantName(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={!variantName.trim() || busy}>
              <Icons.importHtml />
              Choose files
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "map-files"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map files</DialogTitle>
            <DialogDescription>Say which file is the resume, cover letter, or additional.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-64 space-y-4 overflow-auto">
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
          <Button className="mt-4" onClick={() => void finishMappedImport()} disabled={busy}>
            Import
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "name-version"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (versionName.trim() && !busy) void handleFinishVersion();
            }}
          >
            <DialogHeader>
              <DialogTitle>Name this version</DialogTitle>
              <DialogDescription>This becomes the saved version name.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="version-name">Name</Label>
              <Input
                id="version-name"
                value={versionName}
                onChange={(event) => setVersionName(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={!versionName.trim() || busy}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "add-doc"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (extraName.trim() && !busy) void handleAddNamedDocument();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add document</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="doc-name">Name</Label>
              <Input id="doc-name" value={extraName} onChange={(event) => setExtraName(event.target.value)} />
            </div>
            <Button type="submit" disabled={!extraName.trim() || busy}>
              Add document
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ExportPdfDialog
        open={dialog === "export-pdf"}
        busy={exportBusy}
        documents={documents}
        selectedKeys={exportKeys}
        pdfName={pdfName}
        pdfFolder={pdfFolder}
        expanded={exportSection}
        onOpenChange={(open) => !open && setDialog(null)}
        onToggle={(section) => setExportSection((current) => (current === section ? null : section))}
        onNameChange={setPdfName}
        onFolderChange={setPdfFolder}
        onBrowse={() => void pickPdfFolder()}
        onToggleFile={(key) =>
          setExportKeys((current) =>
            current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
          )
        }
        onSubmit={() => void handleExportPdf()}
      />

      <Dialog open={dialog === "remote"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent aria-describedby={undefined}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (remoteUrl.trim() && (remoteToken.trim() || workspace.has_remote_token) && !busy) {
                void handleSetRemote();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Remote</DialogTitle>
            </DialogHeader>
            <AccordionRow
              label="Create Repository"
              open={createRepoOpen}
              onToggle={() => setCreateRepoOpen((open) => !open)}
            >
              <div className="inline-flex rounded-md bg-muted p-0.5">
                {(
                  [
                    ["github", "GitHub"],
                    ["gitlab", "GitLab"],
                  ] as const
                ).map(([host, label]) => (
                  <button
                    key={host}
                    type="button"
                    onClick={() => setRemoteHost(host)}
                    className={cn(
                      "rounded-sm px-2.5 py-1 text-xs",
                      remoteHost === host ? "bg-background font-medium" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {remoteHost === "github"
                  ? "This opens GitHub's new-repository page. Create the repository and an access token there first, then paste the URL and token here."
                  : "This opens GitLab's new-repository page. Create the repository and an access token there first, then paste the URL and token here."}
              </p>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void api.openHostPage(remoteHost)}
                  disabled={busy}
                >
                  <Icons.openLink />
                  Open
                </Button>
              </div>
            </AccordionRow>
            <div className="space-y-2">
              <Label htmlFor="user-remote">Repository URL</Label>
              <Input
                id="user-remote"
                value={remoteUrl}
                onChange={(event) => setRemoteUrl(event.target.value)}
                placeholder="https://github.com/you/resume.git"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-token">Token</Label>
              <Input
                id="user-token"
                type="password"
                value={remoteToken}
                onChange={(event) => setRemoteToken(event.target.value)}
                placeholder={workspace.has_remote_token ? "Token saved. Leave blank to keep it." : "Personal access token"}
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              disabled={!remoteUrl.trim() || (!remoteToken.trim() && !workspace.has_remote_token) || busy}
            >
              Save remote
            </Button>
          </form>
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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
      <h1 className="text-sm font-medium">{title}</h1>
      <p className="max-w-sm text-xs text-muted-foreground">{copy}</p>
      <div className="flex gap-4">
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
