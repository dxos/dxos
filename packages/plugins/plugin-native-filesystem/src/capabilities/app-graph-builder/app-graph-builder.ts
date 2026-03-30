//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { CreateAtom, Graph, GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SHARED } from '@dxos/plugin-space/types';
import { Expando, Text } from '@dxos/schema';

import { meta } from '../../meta';
import {
  NativeFilesystemCapabilities,
  NativeFilesystemOperation,
  isFilesystemDirectory,
  isFilesystemWorkspace,
  type NativeMarkdownDocumentsService,
  type FilesystemDirectory,
  type FilesystemEntry,
  type FilesystemFile,
  type FilesystemWorkspace,
  type NativeFilesystemState,
} from '../../types';

const FILESYSTEM_TYPE = `${meta.id}.workspace`;
const SETTINGS_TYPE = `${meta.id}.settings`;
const GENERAL_TYPE = `${meta.id}.general`;
const DIRECTORY_TYPE = `${meta.id}.directory`;
const IMAGE_TYPE = `${meta.id}.image`;

const workspaceRearrangeCache = new Map<string, (nextOrder: (FilesystemWorkspace | unknown)[]) => void>();

export const createFilesystemEntryExtensions = (
  stateCapabilitiesAtom: Atom.Atom<Atom.Writable<NativeFilesystemState>[]>,
  nativeMarkdownDocsCapabilitiesAtom: Atom.Atom<NativeMarkdownDocumentsService[]>,
) =>
  Effect.all([
    GraphBuilder.createExtension({
      id: `${meta.id}.workspace-entries`,
      match: NodeMatcher.whenNodeType(FILESYSTEM_TYPE),
      connector: (node, get) => {
        const [stateAtom] = get(stateCapabilitiesAtom);
        const [nativeMarkdownDocs] = get(nativeMarkdownDocsCapabilitiesAtom);
        if (!stateAtom || !nativeMarkdownDocs) {
          return Effect.succeed([]);
        }

        const workspaceId = (node.data as FilesystemWorkspace).id;
        const state: NativeFilesystemState = get(stateAtom);
        const workspace = state.workspaces.find((item) => item.id === workspaceId);
        return Effect.succeed(
          workspace ? workspace.children.map((entry) => constructEntryNode(entry, nativeMarkdownDocs)) : [],
        );
      },
    }),

    GraphBuilder.createExtension({
      id: `${meta.id}.directory-entries`,
      match: NodeMatcher.whenNodeType(DIRECTORY_TYPE),
      connector: (node, get) => {
        const [stateAtom] = get(stateCapabilitiesAtom);
        const [nativeMarkdownDocs] = get(nativeMarkdownDocsCapabilitiesAtom);
        if (!stateAtom || !nativeMarkdownDocs) {
          return Effect.succeed([]);
        }

        const directoryId = (node.data as FilesystemDirectory).id;
        const state: NativeFilesystemState = get(stateAtom);
        const directory = findDirectoryById(state.workspaces, directoryId);
        return Effect.succeed(
          directory ? directory.children.map((entry) => constructEntryNode(entry, nativeMarkdownDocs)) : [],
        );
      },
    }),
  ]).pipe(Effect.map((extensions) => extensions.flat()));

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const stateCapabilitiesAtom = yield* Capability.atom(NativeFilesystemCapabilities.State);
    const nativeMarkdownDocsCapabilitiesAtom = yield* Capability.atom(
      NativeFilesystemCapabilities.NativeMarkdownDocuments,
    );
    const appGraphCapabilitiesAtom = capabilities.atom(AppCapabilities.AppGraph);
    const filesystemEntryExtensions = yield* createFilesystemEntryExtensions(
      stateCapabilitiesAtom,
      nativeMarkdownDocsCapabilitiesAtom,
    );

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
          const [stateAtom] = get(stateCapabilitiesAtom);
          if (!stateAtom) {
            return Effect.succeed([]);
          }

          const state: NativeFilesystemState = get(stateAtom);
          const client = capabilities.get(ClientCapabilities.Client);
          const isReadyAtom = CreateAtom.fromObservable(client.spaces.isReady);
          const isReady = get(isReadyAtom);

          if (!state.workspaces.length || !isReady) {
            return Effect.succeed([]);
          }

          let spacesOrder: Obj.Any | undefined;
          let orderMap = new Map<string, number>();
          const [order] = get(AtomQuery.make(client.spaces.default.db, Filter.type(Expando.Expando, { key: SHARED })));
          if (order) {
            const snapshot = get(AtomObj.make(order)) as { order?: string[] } | undefined;
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
                  icon: workspace.icon ? `ph--${workspace.icon}--regular` : 'ph--folder--regular',
                  hue: workspace.hue,
                  disposition: 'workspace',
                  testId: 'nativeFilesystem.workspace',
                  position: orderMap.get(workspace.id),
                  onRearrange,
                },
                nodes: [
                  {
                    id: 'settings',
                    type: SETTINGS_TYPE,
                    data: null,
                    properties: {
                      label: ['settings panel label', { ns: meta.id }],
                      icon: 'ph--faders--regular',
                      disposition: 'alternate-tree',
                    },
                  },
                ],
              };
            }),
          );
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.settings-sections`,
        match: NodeMatcher.whenNodeType(SETTINGS_TYPE),
        connector: () =>
          Effect.succeed([
            {
              id: GENERAL_TYPE,
              type: GENERAL_TYPE,
              data: GENERAL_TYPE,
              properties: {
                label: ['settings general label', { ns: meta.id }],
                icon: 'ph--sliders--regular',
                position: 'hoist',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, [
      ...extensions.flat(),
      ...filesystemEntryExtensions,
    ]);
  }),
);

const constructEntryNode = (
  entry: FilesystemEntry,
  nativeMarkdownDocs: NativeMarkdownDocumentsService,
): Node.NodeArg<any> => {
  if (isFilesystemDirectory(entry)) {
    return {
      id: entry.id,
      type: DIRECTORY_TYPE,
      data: entry,
      properties: {
        label: entry.name,
        icon: 'ph--folder--regular',
        role: 'branch',
      },
    };
  }

  const file = entry as FilesystemFile;
  if (file.type === 'markdown') {
    const text = nativeMarkdownDocs.getOrCreate(file);
    return {
      id: file.id,
      type: Text.Text.typename,
      data: text,
      properties: {
        label: file.name,
        icon: 'ph--file-text--regular',
        modified: file.modified,
        nativeFilesystemFileId: file.id,
        nativeFilesystemPath: file.path,
        persistenceClass: 'memory',
      },
    };
  }

  return {
    id: file.id,
    type: IMAGE_TYPE,
    data: file,
    properties: {
      label: file.name,
      icon: 'ph--image--regular',
    },
  };
};

const findDirectoryById = (workspaces: FilesystemWorkspace[], directoryId: string): FilesystemDirectory | undefined => {
  for (const workspace of workspaces) {
    const directory = findDirectoryInEntries(workspace.children, directoryId);
    if (directory) {
      return directory;
    }
  }

  return undefined;
};

const findDirectoryInEntries = (entries: FilesystemEntry[], directoryId: string): FilesystemDirectory | undefined => {
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
