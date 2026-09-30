import { invoke } from "@tauri-apps/api/core";
import type { DocumentFile, MappedImport, Workspace } from "./types";

export const api = {
  bootstrap: () => invoke<Workspace>("bootstrap"),
  createUser: (name: string) => invoke<Workspace>("create_user", { name }),
  renameUser: (id: string, name: string) => invoke<Workspace>("rename_user", { id, name }),
  importUserLocal: (name: string, path: string) =>
    invoke<Workspace>("import_user_local", { name, path }),
  importUserRemote: (name: string, url: string, token: string) =>
    invoke<Workspace>("import_user_remote", { name, url, token }),
  switchUser: (id: string) => invoke<Workspace>("switch_user", { id }),
  exportUser: (dest: string) => invoke<string>("export_user", { dest }),
  createVariant: (name: string) => invoke<Workspace>("create_variant", { name }),
  importVariant: (name: string, files: MappedImport[]) =>
    invoke<Workspace>("import_variant", { name, files }),
  createVariantFromVersion: (name: string, versionId: string) =>
    invoke<Workspace>("create_variant_from_version", { name, versionId }),
  openVariant: (name: string) => invoke<Workspace>("open_variant", { name }),
  openVersion: (versionId: string) =>
    invoke<Workspace>("open_version", { versionId }),
  saveDocuments: (
    variant: string,
    versionId: string,
    documents: DocumentFile[],
    tab?: string,
  ) =>
    invoke<Workspace>("save_documents", {
      variant,
      versionId,
      documents,
      tab: tab ?? null,
    }),
  deleteUnsaved: (variant: string, versionId: string, tab?: string) =>
    invoke<Workspace>("delete_unsaved", {
      variant,
      versionId,
      tab: tab ?? null,
    }),
  finishVersion: (
    variant: string,
    versionId: string,
    documents: DocumentFile[],
    message: string,
    tab?: string,
  ) =>
    invoke<Workspace>("finish_version", {
      variant,
      versionId,
      documents,
      message,
      tab: tab ?? null,
    }),
  addDocument: (
    variant: string,
    versionId: string,
    documents: DocumentFile[],
    kind: string,
    name?: string,
    tab?: string,
  ) =>
    invoke<Workspace>("add_document", {
      variant,
      versionId,
      documents,
      kind,
      name: name ?? null,
      tab: tab ?? null,
    }),
  rememberTab: (tab: string) => invoke<void>("remember_tab", { tab }),
  exportPdf: (
    items: { name: string; html: string }[],
    destFolder: string,
    resumeName: string,
  ) =>
    invoke<string>("export_pdf", {
      items,
      destFolder,
      resumeName,
    }),
  downloadsDir: () => invoke<string>("downloads_dir"),
  setRemote: (url: string, token: string) => invoke<Workspace>("set_remote", { url, token }),
  syncUser: () => invoke<Workspace>("sync_user"),
  openHostPage: (kind: "github" | "gitlab") => invoke<void>("open_host_page", { kind }),
};
