//
// Copyright 2023 DXOS.org
//

import { FilePlus, FolderPlus } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { getIndices } from '@tldraw/indices';
import { deepSignal } from 'deepsignal/react';
import localforage from 'localforage';
import React from 'react';

import { Graph, GraphPluginProvides } from '@braneframe/plugin-graph';
import { MarkdownProvides } from '@braneframe/plugin-markdown';
import { TreeViewAction, TreeViewPluginProvides } from '@braneframe/plugin-treeview';
import { EventSubscriptions, Trigger } from '@dxos/async';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { LocalFileMain } from './components';
import translations from './translations';
import {
  FILES_PLUGIN,
  FILES_PLUGIN_SHORT_ID,
  LocalEntity,
  LocalFile,
  LocalFilesAction,
  LocalFilesPluginProvides,
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

// TODO(buron): Rename package plugin-file (singular).

export const FilesPlugin = (): PluginDefinition<LocalFilesPluginProvides, MarkdownProvides> => {
  let onFilesUpdate: ((node?: Graph.Node<LocalEntity>) => void) | undefined;
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

      const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, 'dxos.org/plugin/treeview');
      const graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');
      if (treeViewPlugin && graphPlugin) {
        subscriptions.add(
          effect(() => {
            const active = treeViewPlugin.provides.treeView.active;
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
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main': {
            if (isLocalFile(data)) {
              return LocalFileMain;
            }
            break;
          }
        }

        return null;
      },
      graph: {
        nodes: (parent) => {
          if (parent.id !== 'root') {
            return;
          }

          const [groupNode] = parent.add({
            id: 'all-files',
            label: ['plugin name', { ns: FILES_PLUGIN }],
            // TODO(burdon): Factor out palette constants.
            properties: { palette: 'yellow' },
          });

          groupNode.addAction({
            id: 'open-file-handle',
            label: ['open file label', { ns: FILES_PLUGIN }],
            icon: (props) => <FilePlus {...props} />,
            intent: [
              {
                plugin: FILES_PLUGIN,
                action: LocalFilesAction.OPEN_FILE,
              },
              { action: TreeViewAction.ACTIVATE },
            ],
          });

          if ('showDirectoryPicker' in window) {
            groupNode.addAction({
              id: 'open-directory',
              label: ['open directory label', { ns: FILES_PLUGIN }],
              icon: (props) => <FolderPlus {...props} />,
              intent: [
                {
                  plugin: FILES_PLUGIN,
                  action: LocalFilesAction.OPEN_DIRECTORY,
                },
                { action: TreeViewAction.ACTIVATE },
              ],
            });
          }

          const fileIndices = getIndices(state.files.length);
          onFilesUpdate = () => {
            state.files.forEach((entity, index) => localEntityToGraphNode(entity, fileIndices[index], groupNode));
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
        resolver: async (intent, plugins) => {
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
