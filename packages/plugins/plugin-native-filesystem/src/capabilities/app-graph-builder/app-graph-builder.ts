//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph, GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SHARED } from '@dxos/plugin-space';
import { Expando } from '@dxos/schema';

import { meta } from '../../meta';
import {
  NativeFilesystemCapabilities,
  NativeFilesystemOperation,
  isFilesystemDirectory,
  isFilesystemFile,
  isFilesystemWorkspace,
  type FilesystemDirectory,
  type FilesystemEntry,
  type FilesystemWorkspace,
  type NativeFilesystemState,
} from '../../types';

const FILESYSTEM_TYPE = `${meta.id}.workspace`;

const workspaceRearrangeCache = new Map<string, (nextOrder: (FilesystemWorkspace | unknown)[]) => void>();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}.primary-actions`,
        position: 'hoist',
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
                label: ['open directory label', { ns: meta.id }],
                icon: 'ph--folder-open--regular',
                testId: 'nativeFilesystem.openDirectory',
                disposition: 'menu',
              },
            },
          ]),
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.workspaces`,
        match: NodeMatcher.whenRoot,
        connector: (_node, get) => {
          const state: NativeFilesystemState = get(stateAtom);

          if (!state.workspaces.length) {
            return Effect.succeed([]);
          }

          const client = capabilities.get(ClientCapabilities.Client);

          let spacesOrder: Obj.Any | undefined;
          let orderMap = new Map<string, number>();
          try {
            const [order] = get(AtomQuery.make(client.spaces.default.db, Filter.type(Expando.Expando, { key: SHARED })));
            if (order) {
              const snapshot = get(AtomObj.make(order)) as { order?: string[] } | undefined;
              const orderArray: string[] = snapshot?.order ?? [];
              orderMap = new Map(orderArray.map((id, index) => [id, index]));
              spacesOrder = order;
            }
          } catch {
            // Ignore errors when spaces aren't ready yet.
          }

          const { graph } = capabilities.get(AppCapabilities.AppGraph);

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

                  Obj.change(spacesOrder, (mutableOrder: Record<string, unknown>) => {
                    mutableOrder.order = nextOrder.map((item) => {
                      if (isFilesystemWorkspace(item)) {
                        return item.id;
                      }
                      return (item as { id: string }).id;
                    });
                  });
                };
                workspaceRearrangeCache.set(workspace.id, onRearrange);
              }

              return {
                id: workspace.id,
                type: FILESYSTEM_TYPE,
                data: workspace,
                properties: {
                  label: workspace.name,
                  icon: 'ph--folder--regular',
                  disposition: 'workspace',
                  testId: 'nativeFilesystem.workspace',
                  position: orderMap.get(workspace.id),
                  onRearrange,
                },
              };
            }),
          );
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.workspace-entries`,
        match: (node) => (isFilesystemWorkspace(node.data) ? Option.some(node.data as FilesystemWorkspace) : Option.none()),
        actions: (workspace: FilesystemWorkspace) =>
          Effect.succeed([
            {
              id: `${NativeFilesystemOperation.CloseDirectory.meta.key}:${workspace.id}`,
              data: () => Operation.invoke(NativeFilesystemOperation.CloseDirectory, { id: workspace.id }),
              properties: {
                label: ['close directory label', { ns: meta.id }],
                icon: 'ph--x--regular',
              },
            },
            {
              id: `${NativeFilesystemOperation.RefreshDirectory.meta.key}:${workspace.id}`,
              data: () => Operation.invoke(NativeFilesystemOperation.RefreshDirectory, { id: workspace.id }),
              properties: {
                label: 'Refresh',
                icon: 'ph--arrows-clockwise--regular',
              },
            },
          ]),
        connector: (workspace: FilesystemWorkspace) =>
          Effect.succeed(
            workspace.children.map((entry: FilesystemEntry) => constructEntryNode(entry)),
          ),
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.directory-entries`,
        match: (node) =>
          isFilesystemDirectory(node.data) && !isFilesystemWorkspace(node.data)
            ? Option.some(node.data as FilesystemDirectory)
            : Option.none(),
        connector: (directory: FilesystemDirectory) =>
          Effect.succeed(
            directory.children.map((entry: FilesystemEntry) => constructEntryNode(entry)),
          ),
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.file-actions`,
        match: (node) =>
          isFilesystemFile(node.data) && node.data.type === 'markdown' ? Option.some(node.data) : Option.none(),
        actions: (file) =>
          Effect.succeed([
            {
              id: `${NativeFilesystemOperation.SaveFile.meta.key}:${file.id}`,
              data: () => Operation.invoke(NativeFilesystemOperation.SaveFile, { id: file.id }),
              properties: {
                label: ['save file label', { ns: meta.id }],
                icon: 'ph--floppy-disk--regular',
                keyBinding: {
                  macos: 'meta+s',
                  windows: 'ctrl+s',
                },
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);

const constructEntryNode = (entry: FilesystemEntry): Node.NodeArg<FilesystemEntry> => {
  if (isFilesystemDirectory(entry)) {
    return {
      id: entry.id,
      type: `${meta.id}.directory`,
      data: entry,
      properties: {
        label: entry.name,
        icon: 'ph--folder--regular',
        role: 'branch',
      },
    };
  }

  return {
    id: entry.id,
    type: entry.type === 'image' ? `${meta.id}.image` : `${meta.id}.markdown`,
    data: entry,
    properties: {
      label: entry.name,
      icon: entry.type === 'image' ? 'ph--image--regular' : 'ph--file-text--regular',
      modified: entry.modified,
    },
  };
};
