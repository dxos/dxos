//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  chain,
  contributes,
  createIntent,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { CreateAtom, Graph, GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '../meta';
import { type FilesSettingsProps, LocalFilesAction } from '../types';
import { isLocalDirectory, isLocalEntity, isLocalFile } from '../util';

import { FileCapabilities } from './capabilities';

export default defineCapabilityModule((context: PluginContext) => {
  return contributes(Capabilities.AppGraphBuilder, [
    // Create export/import actions.
    GraphBuilder.createExtension({
      id: `${meta.id}/export`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === Graph.ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: LocalFilesAction.Export._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(LocalFilesAction.Export));
                },
                properties: {
                  label: ['export label', { ns: meta.id }],
                  icon: 'ph--floppy-disk--regular',
                },
              },
              {
                id: LocalFilesAction.Import._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(LocalFilesAction.Import));
                },
                properties: {
                  label: ['import label', { ns: meta.id }],
                  icon: 'ph--folder-open--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create files group node.
    GraphBuilder.createExtension({
      id: `${meta.id}/root`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === Graph.ROOT_ID ? Option.some(node) : Option.none())),
            Option.flatMap(() => {
              const settingsStore = get(context.capabilities(Capabilities.SettingsStore))[0];
              const settings = get(
                CreateAtom.fromSignal(() => settingsStore?.getStore<FilesSettingsProps>(meta.id)?.value),
              );
              return settings ? Option.some(settings) : Option.none();
            }),
            Option.map((settings) => {
              return settings.openLocalFiles
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
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create files nodes.
    GraphBuilder.createExtension({
      id: `${meta.id}/files`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === meta.id ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: LocalFilesAction.OpenFile._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(
                    Function.pipe(createIntent(LocalFilesAction.OpenFile), chain(LayoutAction.Open, { part: 'main' })),
                  );
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
                        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                        await dispatch(
                          Function.pipe(
                            createIntent(LocalFilesAction.OpenDirectory),
                            chain(LayoutAction.Open, { part: 'main' }),
                          ),
                        );
                      },
                      properties: {
                        label: ['open directory label', { ns: meta.id }],
                        icon: 'ph--folder-plus--regular',
                      },
                    },
                  ]
                : []),
            ]),
            Option.getOrElse(() => []),
          ),
        ),
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === meta.id ? Option.some(node) : Option.none())),
            Option.map(() => {
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
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create sub-files nodes.
    GraphBuilder.createExtension({
      id: `${meta.id}/sub-files`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (isLocalDirectory(node.data) ? Option.some(node.data.children) : Option.none())),
            Option.map((children) =>
              children.map((child) => ({
                id: child.id,
                type: 'file',
                data: child,
                properties: {
                  label: child.name,
                  icon: 'ph--file--regular',
                },
              })),
            ),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Create file actions.
    GraphBuilder.createExtension({
      id: `${meta.id}/actions`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (isLocalEntity(node.data) ? Option.some(node.data) : Option.none())),
            Option.map((entity) => [
              {
                id: `${LocalFilesAction.Close._tag}:${entity.id}`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(LocalFilesAction.Close, { id: entity.id }));
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
                        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                        await dispatch(createIntent(LocalFilesAction.Reconnect, { id: entity.id }));
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
                        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                        await dispatch(createIntent(LocalFilesAction.Save, { id: entity.id }));
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
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
});
