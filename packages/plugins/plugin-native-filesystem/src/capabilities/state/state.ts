//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { createObject, updateText } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { Text } from '@dxos/schema';

import { meta } from '../../meta';
import {
  NativeFilesystemCapabilities,
  type NativeMarkdownDocumentsService,
  type NativeFilesystemState,
  type FilesystemFile,
  type FilesystemWorkspace,
  type FilesystemEntry,
  isFilesystemFile,
} from '../../types';
import {
  findFileById,
  loadWorkspace,
  readFileContent,
  updateFileInWorkspace,
  watchMarkdownFile,
} from '../../util';

const STORAGE_KEY = `${meta.id}.workspaces`;

const loadPersistedWorkspaces = async (): Promise<FilesystemWorkspace[]> => {
  try {
    const stored = await localforage.getItem<FilesystemWorkspace[]>(STORAGE_KEY);
    return stored ?? [];
  } catch (error) {
    log.warn('Failed to load persisted workspaces', { error });
    return [];
  }
};

/** Collect all markdown file ids from a tree of entries. */
const collectMarkdownFileIds = (entries: FilesystemEntry[]): string[] => {
  const ids: string[] = [];
  for (const entry of entries) {
    if ('children' in entry) {
      ids.push(...collectMarkdownFileIds(entry.children));
    } else if (isFilesystemFile(entry) && entry.type === 'markdown') {
      ids.push(entry.id);
    }
  }
  return ids;
};

const createNativeMarkdownDocumentsService = (
  registry: Registry.Registry,
  stateAtom: Atom.Writable<NativeFilesystemState>,
): NativeMarkdownDocumentsService => {
  const documentsByFileId = new Map<string, Text.Text>();
  const writeTargetByDxn = new Map<string, { path: string; fileId: string }>();
  const dxnByFileId = new Map<string, string>();
  const unwatchByFileId = new Map<string, () => void>();
  const watchStartPending = new Set<string>();

  const indexDocument = (fileId: string, path: string, doc: Text.Text): void => {
    const dxn = Obj.getDXN(doc).toString();
    documentsByFileId.set(fileId, doc);
    writeTargetByDxn.set(dxn, { path, fileId });
    dxnByFileId.set(fileId, dxn);
  };

  const applyExternalDiskText = async (fileId: string, path: string): Promise<void> => {
    const doc = documentsByFileId.get(fileId);
    if (!doc) {
      return;
    }

    const diskText = await readFileContent(path);
    if (diskText === undefined) {
      return;
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
          ws.id === workspace.id
            ? updateFileInWorkspace(ws, fileId, { text: diskText, modified: false })
            : ws,
        ),
      };
    });

    updateText(doc, ['content'], diskText);
  };

  const ensureFileWatcher = (file: FilesystemFile): void => {
    if (unwatchByFileId.has(file.id) || watchStartPending.has(file.id)) {
      return;
    }

    watchStartPending.add(file.id);
    void watchMarkdownFile(file.path, () => applyExternalDiskText(file.id, file.path)).then((unwatch) => {
      watchStartPending.delete(file.id);
      if (!unwatch) {
        return;
      }
      if (!documentsByFileId.has(file.id)) {
        unwatch();
        return;
      }
      unwatchByFileId.set(file.id, unwatch);
    });
  };

  return {
    getOrCreate: (file: FilesystemFile): Text.Text => {
      const existing = documentsByFileId.get(file.id);
      if (existing) {
        indexDocument(file.id, file.path, existing);
        ensureFileWatcher(file);
        return existing;
      }

      const doc = createObject(Text.make(file.text ?? ''));
      indexDocument(file.id, file.path, doc);
      ensureFileWatcher(file);
      return doc;
    },

    getByFileId: (fileId: string): Text.Text | undefined => {
      return documentsByFileId.get(fileId);
    },

    getWriteTargetByDxn: (dxn: string): { path: string; fileId: string } | undefined => {
      return writeTargetByDxn.get(dxn);
    },

    getDxnForFileId: (fileId: string): string | undefined => {
      return dxnByFileId.get(fileId);
    },

    evictForWorkspace: (workspace: FilesystemWorkspace): void => {
      const fileIds = collectMarkdownFileIds(workspace.children);
      for (const fileId of fileIds) {
        watchStartPending.delete(fileId);
        const unwatch = unwatchByFileId.get(fileId);
        if (unwatch) {
          unwatch();
          unwatchByFileId.delete(fileId);
        }
        const dxn = dxnByFileId.get(fileId);
        documentsByFileId.delete(fileId);
        dxnByFileId.delete(fileId);
        if (dxn) {
          writeTargetByDxn.delete(dxn);
        }
      }
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

    const initialState: NativeFilesystemState = {
      workspaces: [],
      currentFile: undefined,
    };

    const stateAtom = Atom.make<NativeFilesystemState>(initialState).pipe(Atom.keepAlive);

    const persistedWorkspaces = yield* Effect.promise(loadPersistedWorkspaces);
    if (persistedWorkspaces.length > 0) {
      const refreshed = yield* Effect.promise(() =>
        Promise.all(
          persistedWorkspaces.map(async (workspace) => {
            const latest = await loadWorkspace(workspace.path);
            return latest ?? workspace;
          }),
        ),
      );
      registry.update(stateAtom, (current) => ({
        ...current,
        workspaces: refreshed,
      }));
    }

    const nativeMarkdownDocuments = createNativeMarkdownDocumentsService(registry, stateAtom);

    return [
      Capability.contributes(NativeFilesystemCapabilities.State, stateAtom),
      Capability.contributes(NativeFilesystemCapabilities.NativeMarkdownDocuments, nativeMarkdownDocuments),
    ];
  }),
);
