//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CreateAtom from '@dxos/app-graph/CreateAtom';
import * as Graph from '@dxos/app-graph/Graph';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as Node from '@dxos/app-graph/Node';
import * as NodeMatcher from '@dxos/app-graph/NodeMatcher';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Type } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';
import { Expando, Text } from '@dxos/schema';
import { Position, isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { FileSystemCapabilities, FileSystemOperation } from '#types';

import { findDirectoryById } from '../util';
import type { FileSystemManager } from './state';

const FILESYSTEM_TYPE = `${meta.profile.key}.workspace`;
const GENERAL_TYPE = `${meta.profile.key}.general`;
const DIRECTORY_TYPE = `${meta.profile.key}.directory`;
const MARKDOWN_PENDING_TYPE = `${meta.profile.key}.markdown-pending`;

const workspaceRearrangeCache = new Map<
  string,
  (nextOrder: (FileSystemCapabilities.FileSystemWorkspace | unknown)[]) => void
>();

/**
 * Depth-first walk of a workspace tree from its top-level entries to `targetId`, accumulating the
 * ancestor directory-id chain (root→leaf, excluding the entry). Returns null if not found. Entry ids are
 * lossy and the tree has no parent pointers, so the path can only be rebuilt by walking down.
 */
const findEntryAncestorChain = (
  entries: FileSystemCapabilities.FileSystemEntry[],
  targetId: string,
  chain: string[],
): string[] | null => {
  for (const entry of entries) {
    if (entry.id === targetId) {
      return chain;
    }
    if ('children' in entry) {
      const found = findEntryAncestorChain(entry.children, targetId, [...chain, entry.id]);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

export const createFileSystemEntryExtensions = (
  stateCapabilitiesAtom: Atom.Atom<Atom.Writable<FileSystemCapabilities.FileSystemState>[]>,
  fileSystemManagerCapabilitiesAtom: Atom.Atom<FileSystemManager.FileSystemManager[]>,
  readState: () => FileSystemCapabilities.FileSystemState,
) => {
  // Files/directories sit at a variable-depth, data-dependent path (`root/<workspace>/<dir>/…/<id>`), so
  // forward URL resolution walks the current workspace tree to rebuild the node path from the entry id.
  const resolve: GraphBuilder.PathResolver = ({ id, workspace }) =>
    Effect.sync(() => {
      const ws = readState().workspaces.find((item) => item.id === workspace);
      if (!ws) {
        return null;
      }
      const chain = findEntryAncestorChain(ws.children, id, []);
      return chain ? [Node.RootId, workspace, ...chain, id].join('/') : null;
    });

  return Effect.all([
    GraphBuilder.createExtension({
      id: 'workspaceEntries',
      url: { key: 'file', kind: 'item', path: resolve },
      match: NodeMatcher.whenNodeType(FILESYSTEM_TYPE),
      connector: (node, get) => {
        const [stateAtom] = get(stateCapabilitiesAtom);
        const [fileSystemManager] = get(fileSystemManagerCapabilitiesAtom);
        if (!stateAtom || !fileSystemManager) {
          return Effect.succeed([]);
        }

        const workspaceId = (node.data as FileSystemCapabilities.FileSystemWorkspace).id;
        const state: FileSystemCapabilities.FileSystemState = get(stateAtom);
        const workspace = state.workspaces.find((item) => item.id === workspaceId);
        return Effect.succeed(
          workspace
            ? workspace.children
                .map((entry) => constructEntryNode(entry, fileSystemManager, workspaceId, get))
                .filter(isNonNullable)
            : [],
        );
      },
    }),

    GraphBuilder.createExtension({
      id: 'directoryEntries',
      url: { key: 'file', kind: 'item', path: resolve },
      match: NodeMatcher.whenNodeType(DIRECTORY_TYPE),
      connector: (node, get) => {
        const [stateAtom] = get(stateCapabilitiesAtom);
        const [fileSystemManager] = get(fileSystemManagerCapabilitiesAtom);
        if (!stateAtom || !fileSystemManager) {
          return Effect.succeed([]);
        }

        const directoryId = (node.data as { id: string }).id;
        const state: FileSystemCapabilities.FileSystemState = get(stateAtom);
        const result = findDirectoryById(state.workspaces, directoryId);
        return Effect.succeed(
          result
            ? result.directory.children
                .map((entry) => constructEntryNode(entry, fileSystemManager, result.workspaceId, get))
                .filter(isNonNullable)
            : [],
        );
      },
    }),
  ]).pipe(Effect.map((extensions) => extensions.flat()));
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateCapabilitiesAtom = yield* Capability.atom(FileSystemCapabilities.State);
    const fileSystemManagerCapabilitiesAtom = yield* Capability.atom(FileSystemCapabilities.FileSystemManager);
    const appGraphCapabilitiesAtom = yield* Capability.atom(AppCapabilities.AppGraph);
    const clientCapabilitiesAtom = yield* Capability.atom(ClientCapabilities.Client);
    // Read the current filesystem tree synchronously at URL-resolve time (the `file` resolver runs long
    // after activation), the same registry+atom pattern as markdown-extension.
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = yield* FileSystemCapabilities.State;
    const fileSystemEntryExtensions = yield* createFileSystemEntryExtensions(
      stateCapabilitiesAtom,
      fileSystemManagerCapabilitiesAtom,
      () => registry.get(stateAtom),
    );

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'primaryActions',
        position: Position.first,
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: FileSystemOperation.OpenDirectory.meta.key,
              data: Effect.fnUntraced(function* () {
                const result = yield* Operation.invoke(FileSystemOperation.OpenDirectory);
                if (result?.subject) {
                  yield* Operation.invoke(LayoutOperation.Open, { subject: [...result.subject] });
                }
              }),
              properties: {
                label: ['open-directory.label', { ns: meta.profile.key }],
                icon: 'ph--folder-open--regular',
                testId: 'fileSystem.openDirectory',
                disposition: 'menu',
              },
            },
          ]),
      }),

      GraphBuilder.createExtension({
        id: 'workspaces',
        match: NodeMatcher.whenRoot,
        connector: (_node, get) => {
          const [stateAtom] = get(stateCapabilitiesAtom);
          if (!stateAtom) {
            return Effect.succeed([]);
          }

          const state: FileSystemCapabilities.FileSystemState = get(stateAtom);
          const [client] = get(clientCapabilitiesAtom);
          // The space list fills incrementally, so subscribe to it rather than reading once: the
          // settings space holding the ordering can land after the client capability does.
          const spaces = client && get(CreateAtom.fromObservable(client.spaces));
          const settingsSpace = spaces && AppSpace.getSettingsSpace(client);

          if (!state.workspaces.length || !settingsSpace) {
            return Effect.succeed([]);
          }

          let spacesOrder: Obj.Any | undefined;
          let orderMap = new Map<string, number>();
          const [order] = get(settingsSpace.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).atom);
          if (order) {
            const snapshot = get(Obj.atom(order)) as { order?: string[] } | undefined;
            const orderArray: string[] = snapshot?.order ?? [];
            orderMap = new Map(orderArray.map((id, index) => [id, index]));
            spacesOrder = order;
          }

          const [appGraph] = get(appGraphCapabilitiesAtom);
          if (!appGraph) {
            return Effect.succeed([]);
          }
          const graph = appGraph.graph;

          return Effect.succeed(
            state.workspaces.map((workspace: FileSystemCapabilities.FileSystemWorkspace) => {
              let onRearrange = workspaceRearrangeCache.get(workspace.id);
              if (!onRearrange && graph && spacesOrder) {
                onRearrange = (nextOrder) => {
                  Graph.sortEdges(
                    graph,
                    Node.RootId,
                    'outbound',
                    nextOrder.map((item) => {
                      if (FileSystemCapabilities.isFileSystemWorkspace(item)) {
                        return item.id;
                      }
                      return (item as { id: string }).id;
                    }),
                  );

                  Obj.update(spacesOrder, (spacesOrder: Record<string, unknown>) => {
                    spacesOrder.order = nextOrder.map((item) => {
                      if (FileSystemCapabilities.isFileSystemWorkspace(item)) {
                        return item.id;
                      }
                      return (item as { id: string }).id;
                    });
                  });
                };
                workspaceRearrangeCache.set(workspace.id, onRearrange);
              }

              return Node.make({
                id: workspace.id,
                type: FILESYSTEM_TYPE,
                data: workspace,
                properties: {
                  label: workspace.name,
                  icon: workspace.icon ? `ph--${workspace.icon}--regular` : 'ph--folder--regular',
                  hue: workspace.hue,
                  disposition: 'workspace',
                  testId: 'fileSystem.workspace',
                  position: orderMap.get(workspace.id),
                  onRearrange,
                },
              });
            }),
          );
        },
      }),

      GraphBuilder.createExtension({
        id: 'workspaceSettings',
        match: NodeMatcher.whenNodeType(FILESYSTEM_TYPE),
        connector: () =>
          Effect.succeed([
            Node.make({
              id: GENERAL_TYPE,
              type: GENERAL_TYPE,
              data: GENERAL_TYPE,
              properties: {
                label: ['settings.general.label', { ns: meta.profile.key }],
                icon: 'ph--sliders--regular',
                position: Position.first,
              },
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [...extensions.flat(), ...fileSystemEntryExtensions]);
  }),
);

/** Graph-facing subset of FileSystemManager used to resolve markdown nodes. */
type MarkdownResolver = Pick<FileSystemManager.FileSystemManager, 'markdownBindingAtom' | 'getByFileId'>;

const constructEntryNode = (
  entry: FileSystemCapabilities.FileSystemEntry,
  fileSystemManager: MarkdownResolver,
  workspaceId: string,
  get: Atom.AtomContext,
): Node.NodeArg<any> | null => {
  if (FileSystemCapabilities.isFileSystemDirectory(entry)) {
    return Node.make({
      id: entry.id,
      type: DIRECTORY_TYPE,
      data: entry,
      properties: {
        label: entry.name,
        icon: 'ph--folder--regular',
        role: 'branch',
      },
    });
  }

  const file = entry as FileSystemCapabilities.FileSystemFile;
  if (file.type === 'markdown') {
    void get(fileSystemManager.markdownBindingAtom(file.id));
    const text = fileSystemManager.getByFileId(file.id);
    if (text) {
      return Node.make({
        id: file.id,
        type: Type.getTypename(Text.Text),
        data: text,
        properties: {
          label: file.name,
          icon: 'ph--file-text--regular',
          modified: file.modified,
          fileSystemFileId: file.id,
          fileSystemPath: file.path,
        },
      });
    }

    return Node.make({
      id: file.id,
      type: MARKDOWN_PENDING_TYPE,
      data: null,
      properties: {
        label: file.name,
        icon: 'ph--file-text--regular',
        modified: file.modified,
        fileSystemFileId: file.id,
        fileSystemPath: file.path,
      },
    });
  }

  // Unsupported file type — skip.
  return null;
};
