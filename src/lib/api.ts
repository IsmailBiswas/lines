import { invoke } from "@tauri-apps/api/core";
import type { DocumentFile, MappedImport, Workspace } from "./types";

export const api = {
  bootstrap: () => invoke<Workspace>("bootstrap"),
  createUser: (name: string) => invoke<Workspace>("create_user", { name }),
  importUserLocal: (name: string, path: string) =>
    invoke<Workspace>("import_user_local", { name, path }),
  importUserRemote: (name: string, url: string) =>
    invoke<Workspace>("import_user_remote", { name, url }),
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
    html: string,
    dest: string,
    folder?: string,
    namePattern?: string,
    setDefault?: boolean,
  ) =>
    invoke<string>("export_pdf", {
      html,
      dest,
      folder: folder ?? null,
      namePattern: namePattern ?? null,
      setDefault: setDefault ?? false,
    }),
  downloadsDir: () => invoke<string>("downloads_dir"),
};
