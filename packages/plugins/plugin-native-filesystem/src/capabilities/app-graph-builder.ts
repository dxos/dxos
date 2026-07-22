//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppSpace, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Type } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph, GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SHARED } from '@dxos/plugin-space';
import { Expando, Text } from '@dxos/schema';
import { Position, isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { NativeFilesystemOperation } from '#types';
import {
  type FilesystemEntry,
  type FilesystemFile,
  type FilesystemWorkspace,
  NativeFilesystemCapabilities,
  type NativeFilesystemState,
  isFilesystemDirectory,
  isFilesystemWorkspace,
} from '#types';

import { findDirectoryById } from '../util';
import type { FilesystemManager } from './state';

const FILESYSTEM_TYPE = `${meta.profile.key}.workspace`;
const GENERAL_TYPE = `${meta.profile.key}.general`;
const DIRECTORY_TYPE = `${meta.profile.key}.directory`;
const MARKDOWN_PENDING_TYPE = `${meta.profile.key}.markdown-pending`;

const workspaceRearrangeCache = new Map<string, (nextOrder: (FilesystemWorkspace | unknown)[]) => void>();

export const createFilesystemEntryExtensions = (
  stateCapabilitiesAtom: Atom.Atom<Atom.Writable<NativeFilesystemState>[]>,
  filesystemManagerCapabilitiesAtom: Atom.Atom<FilesystemManager.FilesystemManager[]>,
) =>
  Effect.all([
    GraphBuilder.createExtension({
      id: 'workspaceEntries',
      match: NodeMatcher.whenNodeType(FILESYSTEM_TYPE),
      connector: (node, get) => {
        const [stateAtom] = get(stateCapabilitiesAtom);
        const [filesystemManager] = get(filesystemManagerCapabilitiesAtom);
        if (!stateAtom || !filesystemManager) {
          return Effect.succeed([]);
        }

        const workspaceId = (node.data as FilesystemWorkspace).id;
        const state: NativeFilesystemState = get(stateAtom);
        const workspace = state.workspaces.find((item) => item.id === workspaceId);
        return Effect.succeed(
          workspace
            ? workspace.children
                .map((entry) => constructEntryNode(entry, filesystemManager, workspaceId, get))
                .filter(isNonNullable)
            : [],
        );
      },
    }),

    GraphBuilder.createExtension({
      id: 'directoryEntries',
      match: NodeMatcher.whenNodeType(DIRECTORY_TYPE),
      connector: (node, get) => {
        const [stateAtom] = get(stateCapabilitiesAtom);
        const [filesystemManager] = get(filesystemManagerCapabilitiesAtom);
        if (!stateAtom || !filesystemManager) {
          return Effect.succeed([]);
        }

        const directoryId = (node.data as { id: string }).id;
        const state: NativeFilesystemState = get(stateAtom);
        const result = findDirectoryById(state.workspaces, directoryId);
        return Effect.succeed(
          result
            ? result.directory.children
                .map((entry) => constructEntryNode(entry, filesystemManager, result.workspaceId, get))
                .filter(isNonNullable)
            : [],
        );
      },
    }),
  ]).pipe(Effect.map((extensions) => extensions.flat()));

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateCapabilitiesAtom = yield* Capability.atom(NativeFilesystemCapabilities.State);
    const filesystemManagerCapabilitiesAtom = yield* Capability.atom(NativeFilesystemCapabilities.FilesystemManager);
    const appGraphCapabilitiesAtom = yield* Capability.atom(AppCapabilities.AppGraph);
    const clientCapabilitiesAtom = yield* Capability.atom(ClientCapabilities.Client);
    const filesystemEntryExtensions = yield* createFilesystemEntryExtensions(
      stateCapabilitiesAtom,
      filesystemManagerCapabilitiesAtom,
    );

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'primaryActions',
        position: Position.first,
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: NativeFilesystemOperation.OpenDirectory.meta.key,
              data: Effect.fnUntraced(function* () {
                const result = yield* Operation.invoke(NativeFilesystemOperation.OpenDirectory);
                if (result?.subject) {
                  yield* Operation.invoke(LayoutOperation.Open, { subject: [...result.subject] });
                }
              }),
              properties: {
                label: ['open-directory.label', { ns: meta.profile.key }],
                icon: 'ph--folder-open--regular',
                testId: 'nativeFilesystem.openDirectory',
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

          const state: NativeFilesystemState = get(stateAtom);
          const [client] = get(clientCapabilitiesAtom);
          const personalSpace = client && AppSpace.getPersonalSpace(client);

          if (!state.workspaces.length || !personalSpace) {
            return Effect.succeed([]);
          }

          let spacesOrder: Obj.Any | undefined;
          let orderMap = new Map<string, number>();
          const [order] = get(personalSpace.db.query(Filter.type(Expando.Expando, { key: SHARED })).atom);
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
            state.workspaces.map((workspace: FilesystemWorkspace) => {
              let onRearrange = workspaceRearrangeCache.get(workspace.id);
              if (!onRearrange && graph && spacesOrder) {
                onRearrange = (nextOrder) => {
                  Graph.sortEdges(
                    graph,
                    Node.RootId,
                    'outbound',
                    nextOrder.map((item) => {
                      if (isFilesystemWorkspace(item)) {
                        return item.id;
                      }
                      return (item as { id: string }).id;
                    }),
                  );

                  Obj.update(spacesOrder, (spacesOrder: Record<string, unknown>) => {
                    spacesOrder.order = nextOrder.map((item) => {
                      if (isFilesystemWorkspace(item)) {
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
                  testId: 'nativeFilesystem.workspace',
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

    return Capability.provide(AppCapabilities.AppGraphBuilder, [...extensions.flat(), ...filesystemEntryExtensions]);
  }),
);

/** Graph-facing subset of FilesystemManager used to resolve markdown nodes. */
type MarkdownResolver = Pick<FilesystemManager.FilesystemManager, 'markdownBindingAtom' | 'getByFileId'>;

const constructEntryNode = (
  entry: FilesystemEntry,
  filesystemManager: MarkdownResolver,
  workspaceId: string,
  get: Atom.Context,
): Node.NodeArg<any> | null => {
  if (isFilesystemDirectory(entry)) {
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

  const file = entry as FilesystemFile;
  if (file.type === 'markdown') {
    void get(filesystemManager.markdownBindingAtom(file.id));
    const text = filesystemManager.getByFileId(file.id);
    if (text) {
      return Node.make({
        id: file.id,
        type: Type.getTypename(Text.Text),
        data: text,
        properties: {
          label: file.name,
          icon: 'ph--file-text--regular',
          modified: file.modified,
          nativeFilesystemFileId: file.id,
          nativeFilesystemPath: file.path,
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
        nativeFilesystemFileId: file.id,
        nativeFilesystemPath: file.path,
      },
    });
  }

  // Unsupported file type — skip.
  return null;
};
