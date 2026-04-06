//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { DXN, Obj } from '@dxos/echo';
import { updateText } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Text } from '@dxos/schema';

import type { FilesystemFile, FilesystemWorkspace, NativeFilesystemState } from '#types';
import { findFileById, readFileContent, updateFileInWorkspace } from '../../util';

import {
  getFileXattrDxn,
  readFileMap,
  setFileXattrDxn,
  watchMarkdownFile,
  writeFileMap,
  type FileMapEntry,
} from './disk-io';

import { collectMarkdownFileIds, collectMarkdownFiles, relativePath } from './file-helpers';

/** Yield to the event loop every N files during restore so capability init cannot wedge the UI thread. */
const RESTORE_YIELD_EVERY_N_FILES = 25;

/**
 * Resolve a Text object from a stored DXN by looking up its owning space on the client.
 * Uses sync resolution first (`getObjectById`, `makeRef` sync target); falls back to
 * `ref.tryLoad()` because objects in linked documents may not be hydrated until async load.
 */
const resolveTextObjectFromStoredDxn = async (client: Client, dxnStr: string): Promise<Text.Text | undefined> => {
  const parsed = DXN.tryParse(dxnStr);
  if (!parsed) {
    return undefined;
  }
  const echoDxn = parsed.asEchoDXN();
  if (!echoDxn) {
    return undefined;
  }
  const owningSpace = echoDxn.spaceId ? client.spaces.get(echoDxn.spaceId) : undefined;
  if (!owningSpace) {
    return undefined;
  }

  const byId = owningSpace.db.getObjectById(echoDxn.echoId);
  if (byId && Obj.instanceOf(Text.Text, byId)) {
    return byId;
  }

  const ref = owningSpace.db.makeRef(parsed);
  const syncTarget = ref.target as Text.Text | undefined;
  if (syncTarget && Obj.instanceOf(Text.Text, syncTarget)) {
    return syncTarget;
  }

  const loaded = await ref.tryLoad();
  if (loaded && Obj.instanceOf(Text.Text, loaded)) {
    return loaded;
  }
  return undefined;
};

export type MarkdownDocuments = {
  /** Per-file reactive generation atom for graph connector invalidation. */
  markdownBindingAtom: (fileId: string) => Atom.Atom<number>;
  /** Lookup text object by filesystem file id. */
  getByFileId: (fileId: string) => Text.Text | undefined;
  /** Resolve disk write target from Echo DXN string. */
  getWriteTargetByDxn: (dxn: string) => { path: string; fileId: string } | undefined;
  /** Restore existing objects then create Text for any unmapped markdown files. */
  syncFromDisk: (workspace: FilesystemWorkspace) => Effect.Effect<void>;
  /** Evict all cached documents and file watchers for a workspace. */
  evictForWorkspace: (workspace: FilesystemWorkspace) => void;
};

/**
 * Manages the bidirectional mapping between on-disk markdown files and ECHO
 * Text objects.
 *
 * Key data structures (all keyed by filesystem file id):
 *  - `documentsByFileId`  — the canonical file-id → Text object lookup.
 *  - `writeTargetByDxn`   — reverse lookup: DXN string → { path, fileId }.
 *                           Used by the editor save path to resolve where to
 *                           write a given ECHO document back to disk.
 *  - `unwatchByFileId`    — teardown handles for per-file Tauri watchers that
 *                           push external edits into ECHO.
 *  - `watchStartPending`  — guards against duplicate watcher setup while the
 *                           async Tauri watch call is in-flight.
 *
 * Lifecycle (per workspace):
 *  1. `syncFromDisk` is the entry point. It waits for the mirror space, then
 *     runs `restoreWorkspaceDocuments` to reconnect files that already have a
 *     stored DXN (via xattr or filemap), and finally calls
 *     `ensureDocumentForFile` for any remaining unmapped files.
 *  2. `evictForWorkspace` tears down watchers and clears all maps for a
 *     workspace's files (called on close or before refresh).
 */
export const createMarkdownDocuments = (
  registry: Registry.Registry,
  stateAtom: Atom.Writable<NativeFilesystemState>,
  getSpaceForWorkspace: (workspaceId: string) => Option.Option<Space>,
  client: Client,
): MarkdownDocuments => {
  const documentsByFileId = new Map<string, Text.Text>();
  const writeTargetByDxn = new Map<string, { path: string; fileId: string }>();
  const unwatchByFileId = new Map<string, () => void>();
  const watchStartPending = new Set<string>();

  // Atom family producing a per-file generation counter. Graph connectors
  // subscribe to these atoms so nodes re-render when a file's binding changes.
  const markdownBindingGeneration = Atom.family((fileId: string) => Atom.make(0).pipe(Atom.keepAlive));

  const bumpMarkdownBinding = (fileId: string): void => {
    registry.update(markdownBindingGeneration(fileId), (generation) => generation + 1);
  };

  /** Update both forward (fileId→doc) and reverse (dxn→writeTarget) maps. */
  const updateMapsForDocument = (fileId: string, path: string, doc: Text.Text): void => {
    const dxn = Obj.getDXN(doc).toString();
    documentsByFileId.set(fileId, doc);
    writeTargetByDxn.set(dxn, { path, fileId });
  };

  /** Update maps and bump the reactive generation so graph nodes re-render. */
  const indexDocument = (fileId: string, path: string, doc: Text.Text): void => {
    updateMapsForDocument(fileId, path, doc);
    bumpMarkdownBinding(fileId);
  };

  //
  // --- File watching: external editor → ECHO ---
  //

  /**
   * Called by a per-file Tauri watcher when the file changes on disk.
   * Reads the new content, updates the atom state (marks not-modified), and
   * pushes the text into the ECHO Text object via `updateText`.
   */
  const applyExternalDiskText = (fileId: string, path: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const doc = documentsByFileId.get(fileId);
      if (!doc) {
        return;
      }

      const diskText = yield* readFileContent(path);
      if (diskText === undefined) {
        return;
      }

      // Sync the file name if it changed on disk (e.g. rename).
      const state = registry.get(stateAtom);
      const fileResult = findFileById(state.workspaces, fileId);
      if (fileResult && doc.name !== fileResult.file.name) {
        Obj.change(doc, (mutable) => {
          mutable.name = fileResult.file.name;
        });
      }

      const current = doc.content ?? '';
      if (diskText === current) {
        return;
      }

      registry.update(stateAtom, (currentState: NativeFilesystemState) => {
        const result = findFileById(currentState.workspaces, fileId);
        if (!result) {
          return currentState;
        }
        const { workspace } = result;
        return {
          ...currentState,
          workspaces: currentState.workspaces.map((ws: FilesystemWorkspace) =>
            ws.id === workspace.id ? updateFileInWorkspace(ws, fileId, { text: diskText, modified: false }) : ws,
          ),
        };
      });

      updateText(doc, ['content'], diskText);
    });

  /**
   * Start a Tauri file watcher for a single markdown file. If the document
   * was evicted before the async setup completes, the watcher is torn down
   * immediately.
   */
  const startFileWatcher = (file: FilesystemFile): Effect.Effect<void> =>
    Effect.gen(function* () {
      const unwatch = yield* watchMarkdownFile(file.path, () => applyExternalDiskText(file.id, file.path));
      if (!unwatch) {
        return;
      }
      // Document may have been evicted while the watcher was being set up.
      if (!documentsByFileId.has(file.id)) {
        unwatch();
        return;
      }
      unwatchByFileId.set(file.id, unwatch);
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          watchStartPending.delete(file.id);
        }),
      ),
    );

  /** Idempotent: starts a watcher only if one isn't already running or pending. */
  const ensureFileWatcher = (file: FilesystemFile): void => {
    if (unwatchByFileId.has(file.id) || watchStartPending.has(file.id)) {
      return;
    }

    watchStartPending.add(file.id);
    void Effect.runFork(startFileWatcher(file));
  };

  //
  // --- Identity persistence: file ↔ ECHO DXN ---
  //

  /**
   * Persist the file→DXN mapping in two places so it survives across sessions:
   *  1. macOS extended attribute on the file itself (fast, per-file lookup).
   *  2. `.composer/filemap.json` in the workspace root (portable fallback for
   *     filesystems that don't support xattr, or after file moves).
   */
  const persistFileIdentity = (file: FilesystemFile, workspaceId: string, dxn: string): void => {
    const state = registry.get(stateAtom);
    const workspace = state.workspaces.find((ws) => ws.id === workspaceId);
    if (!workspace) {
      return;
    }

    void Effect.runFork(
      Effect.gen(function* () {
        yield* setFileXattrDxn(file.path, dxn);

        const relPath = relativePath(workspace.path, file.path);
        const fileMap = yield* readFileMap(workspace.path);
        const existingIdx = fileMap.files.findIndex((entry) => entry.relativePath === relPath);
        const newEntry: FileMapEntry = { relativePath: relPath, objectDxn: dxn };
        if (existingIdx >= 0) {
          fileMap.files[existingIdx] = newEntry;
        } else {
          fileMap.files.push(newEntry);
        }
        yield* writeFileMap(workspace.path, fileMap);
      }),
    );
  };

  //
  // --- Document creation and restoration ---
  //

  /**
   * Get or create a Text object for a markdown file. If one already exists in
   * `documentsByFileId`, re-index it (the path may have changed) and ensure its
   * watcher is running. Otherwise, create a new Text in the mirror space, index
   * it, and persist the DXN identity.
   */
  const ensureDocumentForFile = (file: FilesystemFile, workspaceId: string): Text.Text => {
    const existing = documentsByFileId.get(file.id);
    if (existing) {
      if (existing.name !== file.name) {
        Obj.change(existing, (doc) => {
          doc.name = file.name;
        });
      }
      updateMapsForDocument(file.id, file.path, existing);
      ensureFileWatcher(file);
      return existing;
    }

    const space = getSpaceForWorkspace(workspaceId);
    invariant(Option.isSome(space), `Mirror space not available for workspace ${workspaceId}`);
    const doc = space.value.db.add(Obj.make(Text.Text, { content: file.text ?? '', name: file.name }));
    indexDocument(file.id, file.path, doc);
    ensureFileWatcher(file);

    const dxn = Obj.getDXN(doc).toString();
    persistFileIdentity(file, workspaceId, dxn);

    return doc;
  };

  /**
   * Attempt to reconnect on-disk markdown files with their previously-created
   * ECHO Text objects. For each file:
   *  1. Look up a stored DXN — first from the file's xattr, then from filemap.
   *  2. Resolve the DXN to a Text object via the client's space database.
   *  3. Index the restored document and attach a file watcher.
   *  4. If disk content diverges from the ECHO object, push the disk version.
   *  5. Ensure xattr and filemap are up to date.
   *
   * Files without a stored DXN are skipped here and handled later by
   * `ensureDocumentForFile` in `syncFromDisk`.
   */
  const restoreWorkspaceDocuments = (workspace: FilesystemWorkspace): Effect.Effect<void> =>
    Effect.gen(function* () {
      const files = collectMarkdownFiles(workspace.children);
      if (files.length === 0) {
        return;
      }

      const fileMap = yield* readFileMap(workspace.path);
      const fileMapByPath = new Map(fileMap.files.map((entry) => [entry.relativePath, entry.objectDxn]));
      let fileMapDirty = false;

      let fileIndex = 0;
      for (const file of files) {
        fileIndex++;
        // Yield periodically so large workspaces don't block the UI.
        if (fileIndex % RESTORE_YIELD_EVERY_N_FILES === 0) {
          yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
        }

        if (documentsByFileId.has(file.id)) {
          continue;
        }

        // Try xattr first, fall back to filemap.
        let dxnStr = yield* getFileXattrDxn(file.path);

        if (!dxnStr) {
          const relPath = relativePath(workspace.path, file.path);
          dxnStr = fileMapByPath.get(relPath);
        }

        if (!dxnStr) {
          continue;
        }

        const parsedDxn = DXN.tryParse(dxnStr);
        if (!parsedDxn) {
          continue;
        }

        let target: Text.Text | undefined;
        try {
          target = yield* Effect.promise(() => resolveTextObjectFromStoredDxn(client, dxnStr));
        } catch (error) {
          log.warn('Ref resolution threw during restore', { fileId: file.id, path: file.path, dxn: dxnStr, error });
          continue;
        }

        if (!target || !Obj.instanceOf(Text.Text, target)) {
          log.warn('Failed to restore object for file', {
            fileId: file.id,
            path: file.path,
            dxn: dxnStr,
            found: !!target,
          });
          continue;
        }

        indexDocument(file.id, file.path, target);
        ensureFileWatcher(file);

        if (target.name !== file.name) {
          Obj.change(target, (mutable) => {
            mutable.name = file.name;
          });
        }

        // Disk is authoritative: overwrite the ECHO content if it diverged.
        const diskText = file.text ?? (yield* readFileContent(file.path)) ?? '';
        const persistedText = target.content ?? '';
        if (diskText !== persistedText) {
          updateText(target, ['content'], diskText);
        }

        // Ensure xattr is set (may have been restored from filemap only).
        yield* setFileXattrDxn(file.path, dxnStr);

        // Keep filemap in sync.
        const relPath = relativePath(workspace.path, file.path);
        const existingMapDxn = fileMapByPath.get(relPath);
        if (existingMapDxn !== dxnStr) {
          fileMapByPath.set(relPath, dxnStr);
          fileMapDirty = true;
        }
      }

      if (fileMapDirty) {
        const updatedFileMap = {
          files: Array.from(fileMapByPath.entries()).map(([rp, dxn]) => ({ relativePath: rp, objectDxn: dxn })),
        };
        yield* writeFileMap(workspace.path, updatedFileMap);
      }
    });

  //
  // --- Public API ---
  //

  const service: MarkdownDocuments = {
    markdownBindingAtom: (fileId: string) => markdownBindingGeneration(fileId),

    getByFileId: (fileId: string): Text.Text | undefined => {
      return documentsByFileId.get(fileId);
    },

    getWriteTargetByDxn: (dxn: string): { path: string; fileId: string } | undefined => {
      return writeTargetByDxn.get(dxn);
    },

    /**
     * Full sync: wait for the mirror space to be ready, restore documents that
     * have a persisted DXN, then create new Text objects for any remaining
     * unmapped files.
     */
    syncFromDisk: (workspace: FilesystemWorkspace): Effect.Effect<void> =>
      Effect.gen(function* () {
        const space = getSpaceForWorkspace(workspace.id);
        if (Option.isNone(space)) {
          return;
        }
        yield* Effect.promise(() => space.value.waitUntilReady());
        yield* restoreWorkspaceDocuments(workspace).pipe(
          Effect.catchAll((error) =>
            Effect.sync(() => {
              log.error('restoreWorkspaceDocuments failed', { workspaceId: workspace.id, error });
            }),
          ),
        );
        // Create fresh Text objects for any files that weren't restored above.
        for (const file of collectMarkdownFiles(workspace.children)) {
          if (service.getByFileId(file.id)) {
            continue;
          }
          try {
            ensureDocumentForFile(file, workspace.id);
          } catch (error) {
            log.warn('Failed to create document for file', { fileId: file.id, workspaceId: workspace.id, error });
          }
        }
      }),

    /** Tear down watchers and clear all maps for files belonging to this workspace. */
    evictForWorkspace: (workspace: FilesystemWorkspace): void => {
      const fileIds = collectMarkdownFileIds(workspace.children);
      for (const fileId of fileIds) {
        watchStartPending.delete(fileId);
        const unwatch = unwatchByFileId.get(fileId);
        if (unwatch) {
          unwatch();
          unwatchByFileId.delete(fileId);
        }
        const doc = documentsByFileId.get(fileId);
        documentsByFileId.delete(fileId);
        if (doc) {
          const dxn = Obj.getDXN(doc).toString();
          writeTargetByDxn.delete(dxn);
        }
        // Bump so graph nodes notice the document is gone.
        bumpMarkdownBinding(fileId);
      }
    },
  };

  return service;
};
