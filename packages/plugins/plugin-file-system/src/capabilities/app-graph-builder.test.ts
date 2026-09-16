//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { meta } from '#meta';
import { FileSystemCapabilities } from '#types';

import { MockFileSystemManager } from '../testing/mock-file-system-manager.ts';
import { createFileSystemEntryExtensions } from './app-graph-builder.ts';

const FILESYSTEM_TYPE = `${meta.profile.key}.workspace`;

describe('filesystem app graph builder', () => {
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
                  id: 'nestedNote',
                  name: 'Nested note.md',
                  path: '/workspace/archive/nested-note.md',
                  text: '# Nested note',
                }),
              ],
            },
            createMarkdownFile({
              id: 'topNote',
              name: 'Top note.md',
              path: '/workspace/top-note.md',
              text: '# Top note',
            }),
          ],
        },
      ],
    });

    await graphBuilder.expand(GraphNode.RootId);
    await graphBuilder.expand(GraphNode.qualifyId(GraphNode.RootId, 'workspace'));
    await graphBuilder.expand(GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive'));

    expect(
      graphBuilder.getConnections(GraphNode.qualifyId(GraphNode.RootId, 'workspace')).map((node) => node.id),
    ).toEqual([
      GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive'),
      GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'topNote'),
    ]);
    expect(
      graphBuilder.getConnections(GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive')).map((node) => node.id),
    ).toEqual([GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive', 'nestedNote')]);
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

    await graphBuilder.expand(GraphNode.RootId);
    await graphBuilder.expand(GraphNode.qualifyId(GraphNode.RootId, 'workspace'));
    await graphBuilder.expand(GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive'));

    expect(
      graphBuilder.getConnections(GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive')).map((node) => node.id),
    ).toEqual([GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive', 'one')]);

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

    expect(
      graphBuilder.getConnections(GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive')).map((node) => node.id),
    ).toEqual([
      GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive', 'one'),
      GraphNode.qualifyId(GraphNode.RootId, 'workspace', 'archive', 'two'),
    ]);
  });
});

const setupTestContext = (state: FileSystemCapabilities.FileSystemState) => {
  const registry = Registry.make();
  const stateAtom = Atom.make(state);

  return {
    registry,
    stateAtom,
    graphBuilder: setupFileSystemGraphBuilder({ registry, stateAtom }),
    setDirectoryChildren: (directoryId: string, children: FileSystemCapabilities.FileSystemEntry[]) => {
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

const setupFileSystemGraphBuilder = ({
  registry,
  stateAtom,
}: {
  registry: Registry.AtomRegistry;
  stateAtom: Atom.Writable<FileSystemCapabilities.FileSystemState>;
}) => {
  const initialState = registry.get(stateAtom);
  const rootExtensions = Effect.runSync(createWorkspaceRootExtensions(stateAtom));
  const stateCapabilitiesAtom = Atom.make([stateAtom]);
  const fileSystemManagerCapabilitiesAtom = Atom.make([new MockFileSystemManager(initialState)]);
  const entryExtensions = Effect.runSync(
    createFileSystemEntryExtensions(stateCapabilitiesAtom, fileSystemManagerCapabilitiesAtom, () =>
      registry.get(stateAtom),
    ),
  );

  return setupGraphBuilder({
    registry,
    extensions: [...rootExtensions, ...entryExtensions],
  });
};

const createWorkspaceRootExtensions = (stateAtom: Atom.Writable<FileSystemCapabilities.FileSystemState>) =>
  AppGraphBuilder.createExtension({
    id: 'testWorkspaces',
    match: GraphNodeMatcher.whenRoot,
    connector: (_node, get) =>
      Effect.succeed(
        get(stateAtom).workspaces.map((workspace) => ({
          id: workspace.id,
          type: FILESYSTEM_TYPE,
          data: workspace,
        })),
      ),
  });

const createMarkdownFile = ({
  id,
  name,
  path,
  text,
}: Pick<
  FileSystemCapabilities.FileSystemFile,
  'id' | 'name' | 'path' | 'text'
>): FileSystemCapabilities.FileSystemFile => ({
  id,
  name,
  path,
  text,
  modified: false,
  type: 'markdown',
});

const replaceDirectoryChildren = (
  entries: FileSystemCapabilities.FileSystemEntry[],
  directoryId: string,
  children: FileSystemCapabilities.FileSystemEntry[],
): FileSystemCapabilities.FileSystemEntry[] =>
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
