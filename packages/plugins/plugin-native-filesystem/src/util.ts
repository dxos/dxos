//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type { WatchEvent } from '@tauri-apps/plugin-fs';

import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import type { FilesystemDirectory, FilesystemEntry, FilesystemFile, FilesystemWorkspace } from './types';

type ComposerConfig = { icon?: string; hue?: string };

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

/**
 * Watch a single markdown file for external changes. Uses debounced Tauri watch.
 * Invokes onExternalChange when the file may have been modified on disk.
 */
export const watchMarkdownFile = (
  filePath: string,
  onExternalChange: () => Effect.Effect<void>,
): Effect.Effect<(() => void) | null> => {
  if (!isTauriAvailable()) {
    return Effect.succeed(null);
  }

  return Effect.tryPromise(async () => {
    const { watch } = await import('@tauri-apps/plugin-fs');
    const shouldSyncFromDisk = (event: WatchEvent): boolean => {
      const t = event.type;
      if (t === 'any') {
        return false;
      }
      if (typeof t === 'object' && t !== null) {
        if ('modify' in t) {
          return true;
        }
        if ('create' in t) {
          return true;
        }
        if ('remove' in t) {
          return true;
        }
      }
      return false;
    };

    const unwatch = await watch(
      filePath,
      (event) => {
        if (!shouldSyncFromDisk(event)) {
          return;
        }
        void Effect.runFork(onExternalChange());
      },
      { delayMs: 250 },
    );
    return unwatch;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to watch file', { filePath, error });
        return null;
      }),
    ),
  );
};

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

/**
 * Watch a directory recursively for structural changes (new/removed files).
 * Uses `watchImmediate` to receive individual create/remove events rather than
 * Tauri's debounced `watch` which aggregates into `any` events.
 * Callers should debounce the callback at the application level.
 */
export const watchDirectory = (
  dirPath: string,
  onStructuralChange: (event: WatchEvent) => Effect.Effect<void>,
): Effect.Effect<(() => void) | null> => {
  if (!isTauriAvailable()) {
    return Effect.succeed(null);
  }

  return Effect.tryPromise(async () => {
    const { watchImmediate } = await import('@tauri-apps/plugin-fs');
    const unwatch = await watchImmediate(
      dirPath,
      (event: WatchEvent) => {
        const eventType = event.type;
        const shouldTrigger =
          eventType !== 'any' &&
          eventType !== 'other' &&
          typeof eventType === 'object' &&
          eventType !== null &&
          ('create' in eventType ||
            'remove' in eventType ||
            ('modify' in eventType && eventType.modify.kind === 'rename'));
        if (!shouldTrigger) {
          return;
        }
        void Effect.runFork(onStructuralChange(event));
      },
      { recursive: true },
    );
    return unwatch;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to watch directory', { dirPath, error });
        return null;
      }),
    ),
  );
};

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

const processEntry = (entry: DirEntry, parentPath: string): Effect.Effect<FilesystemEntry | null> =>
  Effect.gen(function* () {
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
    return {
      id: entryId,
      name: entry.name,
      path: entryPath,
      text,
      modified: false,
      type: 'markdown',
    } satisfies FilesystemFile;
  });

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

export const refreshWorkspace = (workspace: FilesystemWorkspace): Effect.Effect<FilesystemWorkspace | null> => {
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
