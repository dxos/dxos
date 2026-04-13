//
// Copyright 2025 DXOS.org
//

export type FilesystemFile = {
  id: string;
  name: string;
  path: string;
  text?: string;
  modified?: boolean;
  type: 'markdown' | 'image';
};

export type FilesystemDirectory = {
  id: string;
  name: string;
  path: string;
  children: FilesystemEntry[];
};

export type FilesystemEntry = FilesystemFile | FilesystemDirectory;

export type FilesystemWorkspace = {
  id: string;
  name: string;
  path: string;
  children: FilesystemEntry[];
  icon?: string;
  hue?: string;
  spaceId?: string;
};

export type NativeFilesystemState = {
  workspaces: FilesystemWorkspace[];
  currentFile?: FilesystemFile;
};

/**
 * True when `entry` is a non-null object with a `children` array (directory or workspace shape).
 * Safe for any `node.data` value; graph nodes often use `null` or non-filesystem payloads.
 */
export const isFilesystemDirectory = (entry: unknown): entry is FilesystemDirectory => {
  return typeof entry === 'object' && entry !== null && 'children' in entry;
};

/**
 * True when `entry` is a file node (has `type`, no `children`). Safe for non-objects.
 */
export const isFilesystemFile = (entry: unknown): entry is FilesystemFile => {
  return typeof entry === 'object' && entry !== null && 'type' in entry && !('children' in entry);
};

export const isFilesystemWorkspace = (entry: unknown): entry is FilesystemWorkspace => {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'id' in entry &&
    'path' in entry &&
    'children' in entry &&
    typeof (entry as FilesystemWorkspace).path === 'string'
  );
};
