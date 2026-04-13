//
// Copyright 2025 DXOS.org
//

import type { WatchEvent } from '@tauri-apps/plugin-fs';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import { readFileContent, writeFileContent } from '../../util';

const COMPOSER_CONFIG_DIR = '.composer';
const FILEMAP_FILE = 'filemap.json';
const XATTR_DXN_NAME = 'org.dxos.dxn';

const pathJoin = (...parts: string[]): string => parts.join('/').replace(/\/+/g, '/');

//
// xattr helpers
//

/** Read the DXN stored as an extended attribute on a file. */
export const getFileXattrDxn = (filePath: string): Effect.Effect<string | undefined> => {
  if (!isTauri()) {
    return Effect.succeed(undefined);
  }

  return Effect.tryPromise(async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string | null>('get_xattr', { path: filePath, name: XATTR_DXN_NAME });
  }).pipe(
    Effect.map((value) => value ?? undefined),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to read xattr', { filePath, error });
        return undefined;
      }),
    ),
  );
};

/** Write a DXN as an extended attribute on a file. */
export const setFileXattrDxn = (filePath: string, dxn: string): Effect.Effect<void> => {
  if (!isTauri()) {
    return Effect.void;
  }

  return Effect.tryPromise(async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_xattr', { path: filePath, name: XATTR_DXN_NAME, value: dxn });
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to set xattr', { filePath, error });
      }),
    ),
  );
};

//
// filemap.json helpers
//

export type FileMapEntry = { relativePath: string; objectDxn: string };
export type FileMap = { files: FileMapEntry[] };

/** Ensure the `.composer` directory exists within a workspace. */
const ensureComposerDir = (workspacePath: string): Effect.Effect<boolean> => {
  if (!isTauri()) {
    return Effect.succeed(false);
  }

  return Effect.tryPromise(async () => {
    const { mkdir } = await import('@tauri-apps/plugin-fs');
    await mkdir(pathJoin(workspacePath, COMPOSER_CONFIG_DIR), { recursive: true });
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

/** Read `.composer/filemap.json` from a workspace directory. */
export const readFileMap = (workspacePath: string): Effect.Effect<FileMap> => {
  const mapPath = pathJoin(workspacePath, COMPOSER_CONFIG_DIR, FILEMAP_FILE);
  return Effect.gen(function* () {
    const content = yield* readFileContent(mapPath);
    if (content === undefined) {
      return { files: [] };
    }

    const parsed = yield* Effect.sync(() => {
      try {
        return JSON.parse(content);
      } catch {
        log.warn('Failed to parse filemap', { mapPath });
        return undefined;
      }
    });

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.files)) {
      return { files: [] };
    }

    return { files: parsed.files } as FileMap;
  });
};

/** Write `.composer/filemap.json` to a workspace directory. */
export const writeFileMap = (workspacePath: string, fileMap: FileMap): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const dirCreated = yield* ensureComposerDir(workspacePath);
    if (!dirCreated) {
      return false;
    }

    const mapPath = pathJoin(workspacePath, COMPOSER_CONFIG_DIR, FILEMAP_FILE);
    return yield* writeFileContent(mapPath, JSON.stringify(fileMap, null, 2) + '\n');
  });

//
// File/directory watchers
//

/**
 * Watch a single markdown file for external changes. Uses debounced Tauri watch.
 * Invokes onExternalChange when the file may have been modified on disk.
 */
export const watchMarkdownFile = (
  filePath: string,
  onExternalChange: () => Effect.Effect<void>,
): Effect.Effect<(() => void) | null> => {
  if (!isTauri()) {
    return Effect.succeed(null);
  }

  return Effect.tryPromise(async () => {
    const { watch } = await import('@tauri-apps/plugin-fs');
    const shouldSyncFromDisk = (event: WatchEvent): boolean => {
      const eventType = event.type;
      if (eventType === 'any') {
        return false;
      }
      if (typeof eventType === 'object' && eventType !== null) {
        if ('modify' in eventType) {
          return true;
        }
        if ('create' in eventType) {
          return true;
        }
        if ('remove' in eventType) {
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
  if (!isTauri()) {
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
