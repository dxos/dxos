//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '../../meta';
import { FileCapabilities, LocalFilesOperation } from '../../types';
import { isLocalDirectory, isLocalEntity, isLocalFile } from '../../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      // Create export/import actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/export`,
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: LocalFilesOperation.Export.meta.key,
              data: () => Operation.invoke(LocalFilesOperation.Export),
              properties: {
                label: ['export label', { ns: meta.id }],
                icon: 'ph--floppy-disk--regular',
              },
            },
            {
              id: LocalFilesOperation.Import.meta.key,
              data: () => Operation.invoke(LocalFilesOperation.Import, {}),
              properties: {
                label: ['import label', { ns: meta.id }],
                icon: 'ph--folder-open--regular',
              },
            },
          ]),
      }),

      // Create files group node.
      GraphBuilder.createExtension({
        id: `${meta.id}/root`,
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const registry = capabilities.get(Common.Capability.AtomRegistry);
          const settingsAtom = capabilities.get(FileCapabilities.Settings);
          const settings = registry.get(settingsAtom);
          return Effect.succeed(
            settings && settings.openLocalFiles
              ? [
                  {
                    // TODO(wittjosiah): Deck does not currently support `/` in ids.
                    id: 'dxos:plugin-files',
                    type: meta.id,
                    // TODO(burdon): Factor out palette constants.
                    properties: {
                      label: ['plugin name', { ns: meta.id }],
                      role: 'branch',
                      disposition: 'workspace',
                    },
                  },
                ]
              : [],
          );
        },
      }),

      // Create files nodes.
      GraphBuilder.createExtension({
        id: `${meta.id}/files`,
        match: NodeMatcher.whenId(meta.id),
        actions: () =>
          Effect.succeed([
            {
              id: LocalFilesOperation.OpenFile.meta.key,
              data: Effect.fnUntraced(function* () {
                const result = yield* Operation.invoke(LocalFilesOperation.OpenFile);
                if (result?.subject) {
                  yield* Operation.invoke(Common.LayoutOperation.Open, { subject: [...result.subject] });
                }
              }),
              properties: {
                label: ['open file label', { ns: meta.id }],
                icon: 'ph--file-plus--regular',
              },
            },
            ...('showDirectoryPicker' in window
              ? [
                  {
                    id: 'open-directory',
                    data: Effect.fnUntraced(function* () {
                      const result = yield* Operation.invoke(LocalFilesOperation.OpenDirectory);
                      if (result?.subject) {
                        yield* Operation.invoke(Common.LayoutOperation.Open, { subject: [...result.subject] });
                      }
                    }),
                    properties: {
                      label: ['open directory label', { ns: meta.id }],
                      icon: 'ph--folder-plus--regular',
                    },
                  },
                ]
              : []),
          ]),
        connector: () => {
          const registry = capabilities.get(Common.Capability.AtomRegistry);
          const stateAtom = capabilities.get(FileCapabilities.State);
          const state = registry.get(stateAtom);
          return Effect.succeed(
            state.files.map((entity) => ({
              id: entity.id,
              type: isLocalDirectory(entity) ? 'directory' : 'file',
              data: entity,
              properties: {
                label: entity.name,
                icon: 'children' in entity ? 'ph--folder--regular' : 'ph--file--regular',
                modified: 'children' in entity ? undefined : entity.modified,
              },
            })),
          );
        },
      }),

      // Create sub-files nodes.
      GraphBuilder.createExtension({
        id: `${meta.id}/sub-files`,
        match: (node) => (isLocalDirectory(node.data) ? Option.some(node.data) : Option.none()),
        connector: (directory) =>
          Effect.succeed(
            directory.children.map((child) => ({
              id: child.id,
              type: 'file',
              data: child,
              properties: {
                label: child.name,
                icon: 'ph--file--regular',
              },
            })),
          ),
      }),

      // Create file actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/actions`,
        match: (node) => (isLocalEntity(node.data) ? Option.some(node.data) : Option.none()),
        actions: (entity) =>
          Effect.succeed([
            {
              id: `${LocalFilesOperation.Close.meta.key}:${entity.id}`,
              data: () => Operation.invoke(LocalFilesOperation.Close, { id: entity.id }),
              properties: {
                label: ['close label', { ns: meta.id }],
                icon: 'ph--x--regular',
              },
            },
            ...(entity.permission !== 'granted'
              ? [
                  {
                    id: `${LocalFilesOperation.Reconnect.meta.key}:${entity.id}`,
                    data: () => Operation.invoke(LocalFilesOperation.Reconnect, { id: entity.id }),
                    properties: {
                      label: ['re-open label', { ns: meta.id }],
                      icon: 'ph--plugs--regular',
                    },
                  },
                ]
              : []),
            ...(entity.permission === 'granted' && isLocalFile(entity)
              ? [
                  {
                    id: `${LocalFilesOperation.Save.meta.key}:${entity.id}`,
                    data: () => Operation.invoke(LocalFilesOperation.Save, { id: entity.id }),
                    properties: {
                      label: [entity.handle ? 'save label' : 'save as label', { ns: meta.id }],
                      icon: 'ph--floppy-disk--regular',
                      keyBinding: {
                        macos: 'meta+s',
                        windows: 'ctrl+s',
                      },
                    },
                  },
                ]
              : []),
          ]),
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
