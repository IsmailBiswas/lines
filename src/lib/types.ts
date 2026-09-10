export type UserSummary = {
  id: string;
  name: string;
};

export type Variant = {
  name: string;
};

export type Version = {
  id: string;
  message: string;
  timestamp: number;
  is_unsaved: boolean;
  parent_id: string | null;
};

export type DocumentFile = {
  key: string;
  name: string;
  kind: "resume" | "cover-letter" | "additional" | string;
  content: string;
};

export type Workspace = {
  users: UserSummary[];
  current_user: UserSummary | null;
  variants: Variant[];
  current_variant: string | null;
  versions: Version[];
  current_version: string | null;
  documents: DocumentFile[];
  current_tab: string | null;
  pdf_folder: string | null;
  pdf_name_pattern: string | null;
};

export type MappedImport = {
  path: string;
  kind: string;
  extra_name?: string | null;
};
