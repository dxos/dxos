//
// Copyright 2023 DXOS.org
//

import { FilePlus, FolderPlus } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import { deepSignal } from 'deepsignal/react';
import localforage from 'localforage';
import React from 'react';

import { GraphNode, GraphNodeAction, isGraphNode } from '@braneframe/plugin-graph';
import { MarkdownProvides } from '@braneframe/plugin-markdown';
import { TreeViewAction, TreeViewPluginProvides } from '@braneframe/plugin-treeview';
import { EventSubscriptions, Trigger } from '@dxos/async';
import { createSubscription } from '@dxos/echo-schema';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { LocalFileMain, LocalFileMainPermissions } from './components';
import translations from './translations';
import { LOCAL_FILES_PLUGIN, LocalEntity, LocalFile, LocalFilesAction, LocalFilesPluginProvides } from './types';
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

export const LocalFilesPlugin = (): PluginDefinition<LocalFilesPluginProvides, MarkdownProvides> => {
  let onFilesUpdate: ((node?: GraphNode<LocalEntity>) => void) | undefined;
  const state = deepSignal<{ files: LocalEntity[]; current: LocalFile | undefined }>({
    files: [],
    current: undefined,
  });
  const subscriptions = new EventSubscriptions();
  const fileSubs = new EventSubscriptions();

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
      id: LOCAL_FILES_PLUGIN,
    },
    init: async () => {
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

      const value = await localforage.getItem<FileSystemHandle[]>(LOCAL_FILES_PLUGIN);
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

      subscriptions.add(
        state.$files!.subscribe(async (files) => {
          await localforage.setItem(LOCAL_FILES_PLUGIN, files.map((file) => file.handle).filter(Boolean));
          onFilesUpdate?.();
        }),
      );

      const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, 'dxos:treeview');
      if (treeViewPlugin) {
        const handleUpdate = () => {
          const current =
            (treeViewPlugin.provides.treeView.active[0]?.startsWith(LOCAL_FILES_PLUGIN) &&
              findFile(state.files, treeViewPlugin.provides.treeView.active)) ||
            undefined;

          if (state.current !== current) {
            state.current = current;
          }
        };

        subscriptions.add(state.$files!.subscribe(handleUpdate));
        const handle = createSubscription(handleUpdate);
        handle.update([treeViewPlugin.provides.treeView]);
        subscriptions.add(handle.unsubscribe);
      }
    },
    unload: async () => {
      onFilesUpdate = undefined;
      fileSubs.clear();
      subscriptions.clear();
      window.removeEventListener('keydown', handleKeyDown);
    },
    provides: {
      translations,
      component: (datum, role) => {
        switch (role) {
          case 'main':
            if (isGraphNode(datum) && isLocalFile(datum.data) && datum.attributes?.disabled) {
              return LocalFileMainPermissions;
            }
            break;
        }

        return null;
      },
      components: {
        Main: LocalFileMain,
      },
      graph: {
        nodes: (parent, invalidate) => {
          if (parent.id !== 'root') {
            return [];
          }

          onFilesUpdate = invalidate;
          const fileIndices = getIndices(state.files.length);
          return state.files.map((entity, index) => localEntityToGraphNode(entity, fileIndices[index]));
        },
        actions: (parent) => {
          if (parent.id !== 'root') {
            return [];
          }

          const actionIndices = getIndices(2);
          const actions: GraphNodeAction[] = [
            {
              id: 'open-file-handle',
              index: actionIndices[0],
              label: ['open file label', { ns: LOCAL_FILES_PLUGIN }],
              icon: (props) => <FilePlus {...props} />,
              intent: [
                {
                  plugin: LOCAL_FILES_PLUGIN,
                  action: LocalFilesAction.OPEN_FILE,
                },
                { action: TreeViewAction.ACTIVATE },
              ],
            },
          ];

          if ('showDirectoryPicker' in window) {
            actions.push({
              id: 'open-directory',
              index: actionIndices[1],
              label: ['open directory label', { ns: LOCAL_FILES_PLUGIN }],
              icon: (props) => <FolderPlus {...props} />,
              intent: [
                {
                  plugin: LOCAL_FILES_PLUGIN,
                  action: LocalFilesAction.OPEN_DIRECTORY,
                },
                { action: TreeViewAction.ACTIVATE },
              ],
            });
          }

          return actions;
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
                  entity.children = await getDirectoryChildren(entity.handle);
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
