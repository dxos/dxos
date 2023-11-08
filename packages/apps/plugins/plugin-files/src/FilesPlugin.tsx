//
// Copyright 2023 DXOS.org
//

import { FilePlus, FolderPlus } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal/react';
import localforage from 'localforage';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { type MarkdownProvides } from '@braneframe/plugin-markdown';
import {
  resolvePlugin,
  type PluginDefinition,
  parseLayoutPlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  LayoutAction,
} from '@dxos/app-framework';
import { EventSubscriptions, Trigger } from '@dxos/async';

import { LocalFileMain } from './components';
import translations from './translations';
import {
  FILES_PLUGIN,
  FILES_PLUGIN_SHORT_ID,
  type LocalEntity,
  type LocalFile,
  LocalFilesAction,
  type LocalFilesPluginProvides,
} from './types';
import {
  findFile,
  getDirectoryChildren,
  handleSave,
  handleToLocalDirectory,
  handleToLocalFile,
  isLocalFile,
  legacyFileToLocalFile,
  localEntityToGraphNode,
} from './util';

// TODO(burdon): Rename package plugin-file (singular).

export const FilesPlugin = (): PluginDefinition<LocalFilesPluginProvides, MarkdownProvides> => {
  let onFilesUpdate: ((node?: Node<LocalEntity>) => void) | undefined;
  const state = deepSignal<{ files: LocalEntity[]; current: LocalFile | undefined }>({
    files: [],
    current: undefined,
  });
  const subscriptions = new EventSubscriptions();

  const handleKeyDown = async (event: KeyboardEvent) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === 's' && modifier && state.current) {
      event.preventDefault();
      await handleSave(state.current);
      onFilesUpdate?.();
    }
  };

  return {
    meta: {
      id: FILES_PLUGIN,
      shortId: FILES_PLUGIN_SHORT_ID,
    },
    initialize: async () => {
      return {
        markdown: {
          onChange: (text) => {
            if (state.current) {
              state.current.text = text.toString();
              state.current.modified = true;
              onFilesUpdate?.();
            }
          },
        },
      };
    },
    ready: async (plugins) => {
      window.addEventListener('keydown', handleKeyDown);

      const value = await localforage.getItem<FileSystemHandle[]>(FILES_PLUGIN);
      if (Array.isArray(value)) {
        await Promise.all(
          value.map(async (handle, index) => {
            if (handle.kind === 'file') {
              const file = await handleToLocalFile(handle);
              state.files = [file, ...state.files];
            } else if (handle.kind === 'directory') {
              const directory = await handleToLocalDirectory(handle);
              state.files = [...state.files, directory];
            }
          }),
        );
      }

      const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      if (layoutPlugin && graphPlugin) {
        subscriptions.add(
          effect(() => {
            const active = layoutPlugin.provides.layout.active;
            const path =
              active &&
              graphPlugin.provides.graph.getPath(active)?.filter((id) => id.startsWith(FILES_PLUGIN_SHORT_ID));
            const current =
              (active?.startsWith(FILES_PLUGIN_SHORT_ID) && path && findFile(state.files, path)) || undefined;
            if (state.current !== current) {
              state.current = current;
            }
          }),
        );
      }
    },
    unload: async () => {
      onFilesUpdate = undefined;
      subscriptions.clear();
      window.removeEventListener('keydown', handleKeyDown);
    },
    provides: {
      translations,
      surface: {
        component: (data, role) => {
          if (!isLocalFile(data.active)) {
            return null;
          }

          switch (role) {
            case 'main': {
              return <LocalFileMain file={data.active} />;
            }
          }

          return null;
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.id !== 'root') {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          const [groupNode] = parent.addNode(FILES_PLUGIN, {
            id: 'all-files',
            label: ['plugin name', { ns: FILES_PLUGIN }],
            // TODO(burdon): Factor out palette constants.
            properties: { palette: 'yellow', role: 'branch' },
          });

          groupNode.addAction({
            id: 'open-file-handle',
            label: ['open file label', { ns: FILES_PLUGIN }],
            icon: (props) => <FilePlus {...props} />,
            invoke: () => [
              {
                plugin: FILES_PLUGIN,
                action: LocalFilesAction.OPEN_FILE,
              },
              { action: LayoutAction.ACTIVATE },
            ],
          });

          if ('showDirectoryPicker' in window) {
            groupNode.addAction({
              id: 'open-directory',
              label: ['open directory label', { ns: FILES_PLUGIN }],
              icon: (props) => <FolderPlus {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: FILES_PLUGIN,
                    action: LocalFilesAction.OPEN_DIRECTORY,
                  },
                  { action: LayoutAction.ACTIVATE },
                ]),
            });
          }

          onFilesUpdate = () => {
            const dispatch = intentPlugin?.provides.intent.dispatch;
            if (dispatch) {
              state.files.forEach((entity, index) => localEntityToGraphNode(entity, groupNode, dispatch));
            }
          };
          onFilesUpdate();

          const unsubscribe = state.$files!.subscribe(async (files) => {
            await localforage.setItem(FILES_PLUGIN, files.map((file) => file.handle).filter(Boolean));
            onFilesUpdate?.();
          });

          return () => unsubscribe();
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case LocalFilesAction.OPEN_FILE: {
              if ('showOpenFilePicker' in window) {
                const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker({
                  mode: 'readwrite',
                  types: [
                    {
                      description: 'Markdown',
                      accept: { 'text/markdown': ['.md'] },
                    },
                  ],
                });
                const file = await handleToLocalFile(handle);
                state.files = [file, ...state.files];

                return [file.id];
              }

              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.md,text/markdown';
              const result = new Trigger<string[]>();
              input.onchange = async () => {
                const [legacyFile] = input.files ? Array.from(input.files) : [];
                if (legacyFile) {
                  const file = await legacyFileToLocalFile(legacyFile);
                  state.files = [file, ...state.files];
                  result.wake([file.id]);
                }
              };
              input.click();
              return await result;
            }

            case LocalFilesAction.OPEN_DIRECTORY: {
              const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
              const directory = await handleToLocalDirectory(handle);
              state.files = [...state.files, directory];
              return [directory.id, directory.children[0]?.id];
            }

            case LocalFilesAction.RECONNECT: {
              const entity = state.files.find((entity) => entity.id === intent.data.id);
              if (!entity) {
                break;
              }

              if ('children' in entity) {
                const permission = await (entity.handle as any).requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                  entity.children = await getDirectoryChildren(entity.handle, entity.handle.name);
                  entity.permission = permission;
                  onFilesUpdate?.();
                }
              } else {
                const permission = await (entity.handle as any)?.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                  const text = await (entity.handle as any).getFile?.().then((file: any) => file.text());
                  entity.text = text;
                  entity.permission = permission;
                  onFilesUpdate?.();
                }
              }

              return true;
            }

            case LocalFilesAction.SAVE: {
              const file = findFile(state.files, intent.data.id);
              if (file) {
                await handleSave(file);
                onFilesUpdate?.();
                return true;
              }
              break;
            }

            case LocalFilesAction.CLOSE: {
              if (typeof intent.data.id === 'string') {
                state.files = state.files.filter((f) => f.id !== intent.data.id);
                onFilesUpdate?.();
                return true;
              }
              break;
            }
          }
        },
      },
    },
  };
};
