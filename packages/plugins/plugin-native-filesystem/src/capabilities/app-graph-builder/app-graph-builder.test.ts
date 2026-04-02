//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { qualifyId } from '@dxos/app-graph';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { Text } from '@dxos/schema';

import { meta } from '../../meta';
import {
  type FilesystemEntry,
  type FilesystemFile,
  type NativeFilesystemState,
  type NativeMarkdownDocumentsService,
} from '../../types';
import { createFilesystemEntryExtensions } from './app-graph-builder';

const FILESYSTEM_TYPE = `${meta.id}.workspace`;

describe('native filesystem app graph builder', () => {
  test('shows nested directories and files when expanded', async ({ expect }) => {
    const { graphBuilder } = setupTestContext({
      workspaces: [
        {
          id: 'workspace',
          name: 'Workspace',
          path: '/workspace',
          children: [
            {
              id: 'archive',
              name: 'Archive',
              path: '/workspace/archive',
              children: [
                createMarkdownFile({
                  id: 'nested-note',
                  name: 'Nested note.md',
                  path: '/workspace/archive/nested-note.md',
                  text: '# Nested note',
                }),
              ],
            },
            createMarkdownFile({
              id: 'top-note',
              name: 'Top note.md',
              path: '/workspace/top-note.md',
              text: '# Top note',
            }),
          ],
        },
      ],
    });

    await graphBuilder.expand(Node.RootId);
    await graphBuilder.expand(qualifyId(Node.RootId, 'workspace'));
    await graphBuilder.expand(qualifyId(Node.RootId, 'workspace', 'archive'));

    expect(graphBuilder.getConnections(qualifyId(Node.RootId, 'workspace')).map((node) => node.id)).toEqual([
      qualifyId(Node.RootId, 'workspace', 'archive'),
      qualifyId(Node.RootId, 'workspace', 'top-note'),
    ]);
    expect(graphBuilder.getConnections(qualifyId(Node.RootId, 'workspace', 'archive')).map((node) => node.id)).toEqual([
      qualifyId(Node.RootId, 'workspace', 'archive', 'nested-note'),
    ]);
  });

  test('keeps expanded directory entries in sync when workspace state is replaced', async ({ expect }) => {
    const { graphBuilder, setDirectoryChildren } = setupTestContext({
      workspaces: [
        {
          id: 'workspace',
          name: 'Workspace',
          path: '/workspace',
          children: [
            {
              id: 'archive',
              name: 'Archive',
              path: '/workspace/archive',
              children: [
                createMarkdownFile({
                  id: 'one',
                  name: 'One.md',
                  path: '/workspace/archive/one.md',
                  text: '# One',
                }),
              ],
            },
          ],
        },
      ],
      currentFile: undefined,
    });

    await graphBuilder.expand(Node.RootId);
    await graphBuilder.expand(qualifyId(Node.RootId, 'workspace'));
    await graphBuilder.expand(qualifyId(Node.RootId, 'workspace', 'archive'));

    expect(graphBuilder.getConnections(qualifyId(Node.RootId, 'workspace', 'archive')).map((node) => node.id)).toEqual([
      qualifyId(Node.RootId, 'workspace', 'archive', 'one'),
    ]);

    setDirectoryChildren('archive', [
      createMarkdownFile({
        id: 'one',
        name: 'One.md',
        path: '/workspace/archive/one.md',
        text: '# One',
      }),
      createMarkdownFile({
        id: 'two',
        name: 'Two.md',
        path: '/workspace/archive/two.md',
        text: '# Two',
      }),
    ]);
    await graphBuilder.flush();

    expect(graphBuilder.getConnections(qualifyId(Node.RootId, 'workspace', 'archive')).map((node) => node.id)).toEqual([
      qualifyId(Node.RootId, 'workspace', 'archive', 'one'),
      qualifyId(Node.RootId, 'workspace', 'archive', 'two'),
    ]);
  });
});

const setupTestContext = (state: NativeFilesystemState) => {
  const registry = Registry.make();
  const stateAtom = Atom.make(state);

  return {
    registry,
    stateAtom,
    graphBuilder: setupNativeFilesystemGraphBuilder({ registry, stateAtom }),
    setDirectoryChildren: (directoryId: string, children: FilesystemEntry[]) => {
      registry.update(stateAtom, (currentState) => ({
        ...currentState,
        workspaces: currentState.workspaces.map((workspace) => ({
          ...workspace,
          children: replaceDirectoryChildren(workspace.children, directoryId, children),
        })),
      }));
    },
  };
};

const setupNativeFilesystemGraphBuilder = ({
  registry,
  stateAtom,
}: {
  registry: Registry.Registry;
  stateAtom: Atom.Writable<NativeFilesystemState>;
}) => {
  const initialState = registry.get(stateAtom);
  const rootExtensions = Effect.runSync(createWorkspaceRootExtensions(stateAtom));
  const stateCapabilitiesAtom = Atom.make([stateAtom]);
  const nativeMarkdownDocsCapabilitiesAtom = Atom.make([createMarkdownDocumentsStub(initialState)]);
  const entryExtensions = Effect.runSync(
    createFilesystemEntryExtensions(stateCapabilitiesAtom, nativeMarkdownDocsCapabilitiesAtom),
  );

  return setupGraphBuilder({
    registry,
    extensions: [...rootExtensions, ...entryExtensions],
  });
};

const createWorkspaceRootExtensions = (stateAtom: Atom.Writable<NativeFilesystemState>) =>
  GraphBuilder.createExtension({
    id: `${meta.id}.test-workspaces`,
    match: NodeMatcher.whenRoot,
    connector: (_node, get) =>
      Effect.succeed(
        get(stateAtom).workspaces.map((workspace) => ({
          id: workspace.id,
          type: FILESYSTEM_TYPE,
          data: workspace,
        })),
      ),
  });

const createMarkdownDocumentsStub = (state: NativeFilesystemState): NativeMarkdownDocumentsService => {
  const documents = new Map<string, Text.Text>();
  const markdownBindingGeneration = Atom.family((fileId: string) => Atom.make(0).pipe(Atom.keepAlive));

  const seedMarkdownFiles = (entries: FilesystemEntry[]) => {
    for (const entry of entries) {
      if ('children' in entry) {
        seedMarkdownFiles(entry.children);
      } else if (entry.type === 'markdown') {
        documents.set(entry.id, Text.make(entry.text ?? ''));
      }
    }
  };
  for (const workspace of state.workspaces) {
    seedMarkdownFiles(workspace.children);
  }

  return {
    markdownBindingAtom: (fileId: string) => markdownBindingGeneration(fileId),
    ensureDocumentForFile: (file, _workspaceId) => {
      const existing = documents.get(file.id);
      if (existing) {
        return existing;
      }

      const document = Text.make(file.text ?? '');
      documents.set(file.id, document);
      return document;
    },
    getByFileId: (fileId) => documents.get(fileId),
    getWriteTargetByDxn: () => undefined,
    getDxnForFileId: () => undefined,
    restoreWorkspaceDocuments: () => Effect.void,
    syncMarkdownFilesFromDisk: () => Effect.void,
    evictForWorkspace: () => {},
  };
};

const createMarkdownFile = ({
  id,
  name,
  path,
  text,
}: Pick<FilesystemFile, 'id' | 'name' | 'path' | 'text'>): FilesystemFile => ({
  id,
  name,
  path,
  text,
  modified: false,
  type: 'markdown',
});

const replaceDirectoryChildren = (
  entries: FilesystemEntry[],
  directoryId: string,
  children: FilesystemEntry[],
): FilesystemEntry[] =>
  entries.map((entry) => {
    if (!('children' in entry)) {
      return entry;
    }

    if (entry.id === directoryId) {
      return {
        ...entry,
        children,
      };
    }

    return {
      ...entry,
      children: replaceDirectoryChildren(entry.children, directoryId, children),
    };
  });
