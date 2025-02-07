//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { Capabilities, contributes, type PluginsContext, createIntent, chain, LayoutAction } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { FileCapabilities } from './capabilities';
import { FILES_PLUGIN } from '../meta';
import { type FilesSettingsProps, type LocalDirectory, type LocalEntity, LocalFilesAction } from '../types';
import { isLocalDirectory, isLocalEntity, isLocalFile } from '../util';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // Create export/import actions.
    createExtension({
      id: `${FILES_PLUGIN}/export`,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: LocalFilesAction.Export._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(LocalFilesAction.Export));
          },
          properties: {
            label: ['export label', { ns: FILES_PLUGIN }],
            icon: 'ph--floppy-disk--regular',
          },
        },
        {
          id: LocalFilesAction.Import._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(LocalFilesAction.Import));
          },
          properties: {
            label: ['import label', { ns: FILES_PLUGIN }],
            icon: 'ph--folder-open--regular',
          },
        },
      ],
    }),

    // Create files group node.
    createExtension({
      id: `${FILES_PLUGIN}/root`,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: () => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<FilesSettingsProps>(FILES_PLUGIN)?.value;

        return settings?.openLocalFiles
          ? [
              {
                id: FILES_PLUGIN,
                type: FILES_PLUGIN,
                // TODO(burdon): Factor out palette constants.
                properties: {
                  label: ['plugin name', { ns: FILES_PLUGIN }],
                  role: 'branch',
                },
              },
            ]
          : [];
      },
    }),

    // Create files nodes.
    createExtension({
      id: `${FILES_PLUGIN}/files`,
      filter: (node): node is Node<null> => node.id === FILES_PLUGIN,
      actions: () => [
        {
          id: LocalFilesAction.OpenFile._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(pipe(createIntent(LocalFilesAction.OpenFile), chain(LayoutAction.Open, { part: 'main' })));
          },
          properties: {
            label: ['open file label', { ns: FILES_PLUGIN }],
            icon: 'ph--file-plus--regular',
          },
        },
        ...('showDirectoryPicker' in window
          ? [
              {
                id: 'open-directory',
                data: async () => {
                  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
                  await dispatch(
                    pipe(createIntent(LocalFilesAction.OpenDirectory), chain(LayoutAction.Open, { part: 'main' })),
                  );
                },
                properties: {
                  label: ['open directory label', { ns: FILES_PLUGIN }],
                  icon: 'ph--folder-plus--regular',
                },
              },
            ]
          : []),
      ],
      connector: () => {
        const state = context.requestCapability(FileCapabilities.State);
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
    createExtension({
      id: `${FILES_PLUGIN}/sub-files`,
      filter: (node): node is Node<LocalDirectory> => isLocalDirectory(node.data),
      connector: ({ node }) =>
        node.data.children.map((child) => ({
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
    createExtension({
      id: `${FILES_PLUGIN}/actions`,
      filter: (node): node is Node<LocalEntity> => isLocalEntity(node.data),
      actions: ({ node }) => [
        {
          id: `${LocalFilesAction.Close._tag}:${node.id}`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(LocalFilesAction.Close, { id: node.id }));
          },
          properties: {
            label: ['close label', { ns: FILES_PLUGIN }],
            icon: 'ph--x--regular',
          },
        },
        ...(node.data.permission !== 'granted'
          ? [
              {
                id: `${LocalFilesAction.Reconnect._tag}:${node.id}`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(LocalFilesAction.Reconnect, { id: node.id }));
                },
                properties: {
                  label: ['re-open label', { ns: FILES_PLUGIN }],
                  icon: 'ph--plugs--regular',
                  disposition: 'default',
                },
              },
            ]
          : []),
        ...(node.data.permission === 'granted' && isLocalFile(node.data)
          ? [
              {
                id: `${LocalFilesAction.Save._tag}:${node.data.id}`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(LocalFilesAction.Save, { id: node.data.id }));
                },
                properties: {
                  label: [node.data.handle ? 'save label' : 'save as label', { ns: FILES_PLUGIN }],
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
