//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import {
  isFilesystemDirectory,
  type FilesystemDirectory,
  type FilesystemEntry,
  type FilesystemFile,
  type FilesystemWorkspace,
} from './types';

/** Persisted per-workspace metadata stored in `.composer/meta.json`. */
export type ComposerConfig = { icon?: string; hue?: string; spaceId?: string };

const COMPOSER_CONFIG_DIR = '.composer';
const COMPOSER_CONFIG_FILE = 'meta.json';

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

// TODO: Add image/PDF support.
const isSupportedFile = (name: string): boolean => {
  return isMarkdownFile(name);
};

// Deterministic id derived from the absolute path.
const createFileId = (path: string): string => {
  return `fs:${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
};

/** Check if Tauri filesystem APIs are available. */
export const isTauriAvailable = (): boolean => {
  return isTauri();
};

/** Open a native directory picker dialog via Tauri. Returns the selected path or null. */
export const openDirectoryPicker = (): Effect.Effect<string | null> => {
  if (!isTauriAvailable()) {
    return Effect.sync(() => {
      log.warn('Tauri APIs not available');
      return null;
    });
  }

  return Effect.tryPromise(async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      /** Required so Tauri adds recursive FS scope for vault-style folder trees. */
      recursive: true,
    });
    return selected as string | null;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to open directory picker', { error });
        return null;
      }),
    ),
  );
};

/** Read UTF-8 text from a file path (Tauri desktop only). */
export const readFileContent = (path: string): Effect.Effect<string | undefined> => {
  if (!isTauriAvailable()) {
    return Effect.succeed(undefined);
  }

  return Effect.tryPromise(async () => {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return await readTextFile(path);
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to read file', { path, error });
        return undefined;
      }),
    ),
  );
};

/** Write UTF-8 text to a file path (Tauri desktop only). Returns true on success. */
export const writeFileContent = (path: string, content: string): Effect.Effect<boolean> => {
  if (!isTauriAvailable()) {
    return Effect.sync(() => {
      log.warn('Tauri APIs not available');
      return false;
    });
  }

  return Effect.tryPromise(async () => {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, content);
    return true;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to write file', { path, error });
        return false;
      }),
    ),
  );
};

/** Read `.composer/meta.json` from a workspace directory. Returns empty config on failure. */
export const readComposerConfig = (workspacePath: string): Effect.Effect<ComposerConfig> => {
  const configPath = pathJoin(workspacePath, COMPOSER_CONFIG_DIR, COMPOSER_CONFIG_FILE);
  return Effect.gen(function* () {
    const content = yield* readFileContent(configPath);
    if (content === undefined) {
      return {};
    }

    const parsed = yield* Effect.sync(() => {
      try {
        return JSON.parse(content);
      } catch {
        log.warn('Failed to parse composer config', { configPath });
        return undefined;
      }
    });

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return {
      icon: typeof parsed.icon === 'string' ? parsed.icon : undefined,
      hue: typeof parsed.hue === 'string' ? parsed.hue : undefined,
      spaceId: typeof parsed.spaceId === 'string' ? parsed.spaceId : undefined,
    };
  });
};

/** Ensure the `.composer` directory exists within a workspace. */
const ensureComposerDir = (workspacePath: string): Effect.Effect<boolean> => {
  if (!isTauriAvailable()) {
    return Effect.succeed(false);
  }

  return Effect.tryPromise(async () => {
    const { mkdir } = await import('@tauri-apps/plugin-fs');
    const dirPath = pathJoin(workspacePath, COMPOSER_CONFIG_DIR);
    await mkdir(dirPath, { recursive: true });
    return true;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to create .composer directory', { workspacePath, error });
        return false;
      }),
    ),
  );
};

/** Write `.composer/meta.json` to a workspace directory. */
export const writeComposerConfig = (workspacePath: string, config: ComposerConfig): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const dirCreated = yield* ensureComposerDir(workspacePath);
    if (!dirCreated) {
      return false;
    }

    const configPath = pathJoin(workspacePath, COMPOSER_CONFIG_DIR, COMPOSER_CONFIG_FILE);
    return yield* writeFileContent(configPath, JSON.stringify(config, null, 2) + '\n');
  });

// List directory entries via Tauri, returning an empty array on failure.
const readDir = (path: string): Effect.Effect<DirEntry[]> => {
  if (!isTauriAvailable()) {
    return Effect.succeed([]);
  }

  return Effect.tryPromise(async () => {
    const fs = await import('@tauri-apps/plugin-fs');
    return (await fs.readDir(path)) as DirEntry[];
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to read directory', { path, error });
        return [];
      }),
    ),
  );
};

// Convert a single DirEntry into a FilesystemEntry, reading children/content as needed.
const processEntry = (entry: DirEntry, parentPath: string): Effect.Effect<FilesystemEntry | null> =>
  Effect.gen(function* () {
    if (entry.isSymlink) {
      return null;
    }

    const entryPath = pathJoin(parentPath, entry.name);
    const entryId = createFileId(entryPath);

    if (entry.isDirectory) {
      const children = yield* readDirectoryContents(entryPath);
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

    if (isImageFile(entry.name)) {
      return {
        id: entryId,
        name: entry.name,
        path: entryPath,
        type: 'image',
      } satisfies FilesystemFile;
    }

    const text = yield* readFileContent(entryPath);
    if (text === undefined) {
      return null;
    }
    return {
      id: entryId,
      name: entry.name,
      path: entryPath,
      text,
      modified: false,
      type: 'markdown',
    } satisfies FilesystemFile;
  });

// Recursively read a directory tree, sorting directories before files.
const readDirectoryContents = (path: string): Effect.Effect<FilesystemEntry[]> =>
  Effect.gen(function* () {
    const entries = yield* readDir(path);
    const visibleEntries = entries.filter((entry) => !entry.name.startsWith('.'));
    const processedEntries = yield* Effect.forEach(visibleEntries, (entry) => processEntry(entry, path));
    return processedEntries
      .filter((entry): entry is FilesystemEntry => entry !== null)
      .sort((entryA, entryB) => {
        const aIsDir = 'children' in entryA;
        const bIsDir = 'children' in entryB;
        if (aIsDir !== bIsDir) {
          return aIsDir ? -1 : 1;
        }
        return entryA.name.localeCompare(entryB.name);
      });
  });

/** Load a workspace tree from disk, reading directory contents and composer config. Returns null on failure. */
export const loadWorkspace = (path: string): Effect.Effect<FilesystemWorkspace | null> => {
  if (!isTauriAvailable()) {
    return Effect.sync(() => {
      log.warn('Tauri APIs not available');
      return null;
    });
  }

  return Effect.gen(function* () {
    const name = getFileName(path);
    const children = yield* readDirectoryContents(path);
    const id = createFileId(path);
    const config = yield* readComposerConfig(path);

    return {
      id,
      name,
      path,
      children,
      icon: config.icon,
      hue: config.hue,
      spaceId: config.spaceId,
    };
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        log.warn('Failed to load workspace', { path, cause });
        return null;
      }),
    ),
  );
};

/** Reload a workspace's directory tree from disk. */
export const refreshWorkspace = (workspace: FilesystemWorkspace): Effect.Effect<FilesystemWorkspace | null> => {
  return loadWorkspace(workspace.path);
};

const findFileInWorkspace = (workspace: FilesystemWorkspace, fileId: string): FilesystemFile | undefined => {
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

/** Find a file by id across all workspaces, returning the containing workspace and file. */
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

/** Find a directory by id across all workspaces. */
export const findDirectoryById = (
  workspaces: FilesystemWorkspace[],
  directoryId: string,
): { directory: FilesystemDirectory; workspaceId: string } | undefined => {
  for (const workspace of workspaces) {
    const directory = findDirectoryInEntries(workspace.children, directoryId);
    if (directory) {
      return { directory, workspaceId: workspace.id };
    }
  }

  return undefined;
};

/** Recursively search entries for a directory by id. */
export const findDirectoryInEntries = (
  entries: FilesystemEntry[],
  directoryId: string,
): FilesystemDirectory | undefined => {
  for (const entry of entries) {
    if (!isFilesystemDirectory(entry)) {
      continue;
    }

    if (entry.id === directoryId) {
      return entry;
    }

    const nestedDirectory = findDirectoryInEntries(entry.children, directoryId);
    if (nestedDirectory) {
      return nestedDirectory;
    }
  }

  return undefined;
};

/** Immutably update a file's properties within a workspace tree. */
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
