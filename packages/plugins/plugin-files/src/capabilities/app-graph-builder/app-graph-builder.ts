//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '../../meta';
import { FileCapabilities, type FilesSettingsProps, LocalFilesAction, LocalFilesOperation } from '../../types';
import { isLocalDirectory, isLocalEntity, isLocalFile } from '../../util';

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);

    return Capability.contributes(Common.Capability.AppGraphBuilder, [
      // Create export/import actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/export`,
        match: NodeMatcher.whenRoot,
        actions: () => [
          {
            id: LocalFilesAction.Export._tag,
            data: async () => {
              await invokePromise(LocalFilesOperation.Export);
            },
            properties: {
              label: ['export label', { ns: meta.id }],
              icon: 'ph--floppy-disk--regular',
            },
          },
          {
            id: LocalFilesAction.Import._tag,
            data: async () => {
              await invokePromise(LocalFilesOperation.Import, {});
            },
            properties: {
              label: ['import label', { ns: meta.id }],
              icon: 'ph--folder-open--regular',
            },
          },
        ],
      }),

      // Create files group node.
      GraphBuilder.createExtension({
        id: `${meta.id}/root`,
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const settingsStore = get(context.capabilities(Common.Capability.SettingsStore))[0];
          const settings = get(
            CreateAtom.fromSignal(() => settingsStore?.getStore<FilesSettingsProps>(meta.id)?.value),
          );
          return settings && settings.openLocalFiles
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
            : [];
        },
      }),

      // Create files nodes.
      GraphBuilder.createExtension({
        id: `${meta.id}/files`,
        match: NodeMatcher.whenId(meta.id),
        actions: () => [
          {
            id: LocalFilesAction.OpenFile._tag,
            data: async () => {
              const result = await invokePromise(LocalFilesOperation.OpenFile);
              if (result.data?.subject) {
                await invokePromise(Common.LayoutOperation.Open, { subject: [...result.data.subject] });
              }
            },
            properties: {
              label: ['open file label', { ns: meta.id }],
              icon: 'ph--file-plus--regular',
            },
          },
          ...('showDirectoryPicker' in window
            ? [
                {
                  id: 'open-directory',
                  data: async () => {
                    const result = await invokePromise(LocalFilesOperation.OpenDirectory);
                    if (result.data?.subject) {
                      await invokePromise(Common.LayoutOperation.Open, { subject: [...result.data.subject] });
                    }
                  },
                  properties: {
                    label: ['open directory label', { ns: meta.id }],
                    icon: 'ph--folder-plus--regular',
                  },
                },
              ]
            : []),
        ],
        connector: () => {
          const state = context.getCapability(FileCapabilities.State);
          return state.files.map((entity) => ({
            id: entity.id,
            type: isLocalDirectory(entity) ? 'directory' : 'file',
            data: entity,
            properties: {
              label: entity.name,
              icon: 'children' in entity ? 'ph--folder--regular' : 'ph--file--regular',
              modified: 'children' in entity ? undefined : entity.modified,
            },
          }));
        },
      }),

      // Create sub-files nodes.
      GraphBuilder.createExtension({
        id: `${meta.id}/sub-files`,
        match: (node) => (isLocalDirectory(node.data) ? Option.some(node.data) : Option.none()),
        connector: (directory) =>
          directory.children.map((child) => ({
            id: child.id,
            type: 'file',
            data: child,
            properties: {
              label: child.name,
              icon: 'ph--file--regular',
            },
          })),
      }),

      // Create file actions.
      GraphBuilder.createExtension({
        id: `${meta.id}/actions`,
        match: (node) => (isLocalEntity(node.data) ? Option.some(node.data) : Option.none()),
        actions: (entity) => [
          {
            id: `${LocalFilesAction.Close._tag}:${entity.id}`,
            data: async () => {
              await invokePromise(LocalFilesOperation.Close, { id: entity.id });
            },
            properties: {
              label: ['close label', { ns: meta.id }],
              icon: 'ph--x--regular',
            },
          },
          ...(entity.permission !== 'granted'
            ? [
                {
                  id: `${LocalFilesAction.Reconnect._tag}:${entity.id}`,
                  data: async () => {
                    await invokePromise(LocalFilesOperation.Reconnect, { id: entity.id });
                  },
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
                  id: `${LocalFilesAction.Save._tag}:${entity.id}`,
                  data: async () => {
                    await invokePromise(LocalFilesOperation.Save, { id: entity.id });
                  },
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
        ],
      }),
    ]);
  }),
);
