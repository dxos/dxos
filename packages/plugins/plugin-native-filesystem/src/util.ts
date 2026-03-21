//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import type { FilesystemEntry, FilesystemFile, FilesystemDirectory, FilesystemWorkspace } from './types';

type DirEntry = { name: string; isDirectory: boolean; isFile: boolean; isSymlink: boolean };

const SUPPORTED_EXTENSIONS = ['.md', '.markdown'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

const pathJoin = (...parts: string[]): string => {
  return parts.join('/').replace(/\/+/g, '/');
};

const getFileName = (path: string): string => {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

const getExtension = (name: string): string => {
  const lastDot = name.lastIndexOf('.');
  return lastDot >= 0 ? name.slice(lastDot).toLowerCase() : '';
};

const isMarkdownFile = (name: string): boolean => {
  const ext = getExtension(name);
  return SUPPORTED_EXTENSIONS.includes(ext);
};

const isImageFile = (name: string): boolean => {
  const ext = getExtension(name);
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
};

const isSupportedFile = (name: string): boolean => {
  return isMarkdownFile(name) || isImageFile(name);
};

const createFileId = (path: string): string => {
  return `fs:${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
};

/** Check if Tauri filesystem APIs are available. */
export const isTauriAvailable = (): boolean => {
  return isTauri();
};

export const openDirectoryPicker = async (): Promise<string | null> => {
  if (!isTauriAvailable()) {
    log.warn('Tauri APIs not available');
    return null;
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
    });
    return selected as string | null;
  } catch (error) {
    log.warn('Failed to open directory picker', { error });
    return null;
  }
};

const readFileContent = async (path: string): Promise<string | undefined> => {
  if (!isTauriAvailable()) {
    return undefined;
  }

  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return await readTextFile(path);
  } catch (error) {
    log.warn('Failed to read file', { path, error });
    return undefined;
  }
};

export const writeFileContent = async (path: string, content: string): Promise<boolean> => {
  if (!isTauriAvailable()) {
    log.warn('Tauri APIs not available');
    return false;
  }

  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, content);
    return true;
  } catch (error) {
    log.warn('Failed to write file', { path, error });
    return false;
  }
};

const readDir = async (path: string): Promise<DirEntry[]> => {
  if (!isTauriAvailable()) {
    return [];
  }

  try {
    const fs = await import('@tauri-apps/plugin-fs');
    return (await fs.readDir(path)) as DirEntry[];
  } catch (error) {
    log.warn('Failed to read directory', { path, error });
    return [];
  }
};

const processEntry = async (entry: DirEntry, parentPath: string): Promise<FilesystemEntry | null> => {
  const entryPath = pathJoin(parentPath, entry.name);
  const entryId = createFileId(entryPath);

  if (entry.isDirectory) {
    const children = await readDirectoryContents(entryPath);
    if (children.length === 0) {
      return null;
    }
    return {
      id: entryId,
      name: entry.name,
      path: entryPath,
      children,
    } satisfies FilesystemDirectory;
  }

  if (!isSupportedFile(entry.name)) {
    return null;
  }

  const isImage = isImageFile(entry.name);

  if (isImage) {
    return {
      id: entryId,
      name: entry.name,
      path: entryPath,
      type: 'image',
    } satisfies FilesystemFile;
  }

  const text = await readFileContent(entryPath);
  return {
    id: entryId,
    name: entry.name,
    path: entryPath,
    text,
    modified: false,
    type: 'markdown',
  } satisfies FilesystemFile;
};

const readDirectoryContents = async (path: string): Promise<FilesystemEntry[]> => {
  try {
    const entries = await readDir(path);
    const results: FilesystemEntry[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const processed = await processEntry(entry, path);
      if (processed) {
        results.push(processed);
      }
    }

    return results.sort((entryA, entryB) => {
      const aIsDir = 'children' in entryA;
      const bIsDir = 'children' in entryB;
      if (aIsDir !== bIsDir) {
        return aIsDir ? -1 : 1;
      }
      return entryA.name.localeCompare(entryB.name);
    });
  } catch (error) {
    log.warn('Failed to read directory', { path, error });
    return [];
  }
};

export const loadWorkspace = async (path: string): Promise<FilesystemWorkspace | null> => {
  if (!isTauriAvailable()) {
    log.warn('Tauri APIs not available');
    return null;
  }

  try {
    const name = getFileName(path);
    const children = await readDirectoryContents(path);
    const id = createFileId(path);

    return {
      id,
      name,
      path,
      children,
    };
  } catch (error) {
    log.warn('Failed to load workspace', { path, error });
    return null;
  }
};

export const refreshWorkspace = async (workspace: FilesystemWorkspace): Promise<FilesystemWorkspace | null> => {
  return loadWorkspace(workspace.path);
};

export const findFileInWorkspace = (workspace: FilesystemWorkspace, fileId: string): FilesystemFile | undefined => {
  const searchEntries = (entries: FilesystemEntry[]): FilesystemFile | undefined => {
    for (const entry of entries) {
      if ('children' in entry) {
        const found = searchEntries(entry.children);
        if (found) {
          return found;
        }
      } else if (entry.id === fileId) {
        return entry;
      }
    }
    return undefined;
  };

  return searchEntries(workspace.children);
};

export const findFileById = (
  workspaces: FilesystemWorkspace[],
  fileId: string,
): { workspace: FilesystemWorkspace; file: FilesystemFile } | undefined => {
  for (const workspace of workspaces) {
    const file = findFileInWorkspace(workspace, fileId);
    if (file) {
      return { workspace, file };
    }
  }
  return undefined;
};

export const updateFileInWorkspace = (
  workspace: FilesystemWorkspace,
  fileId: string,
  updates: Partial<FilesystemFile>,
): FilesystemWorkspace => {
  const updateEntries = (entries: FilesystemEntry[]): FilesystemEntry[] => {
    return entries.map((entry) => {
      if ('children' in entry) {
        return {
          ...entry,
          children: updateEntries(entry.children),
        };
      }
      if (entry.id === fileId) {
        return { ...entry, ...updates };
      }
      return entry;
    });
  };

  return {
    ...workspace,
    children: updateEntries(workspace.children),
  };
};
