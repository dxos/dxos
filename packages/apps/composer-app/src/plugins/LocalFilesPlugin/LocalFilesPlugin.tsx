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
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { EventSubscriptions } from '@dxos/async';
import { createSubscription } from '@dxos/echo-schema';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { LocalFileMain, LocalFileMainPermissions } from './components';
import translations from './translations';
import { LocalEntity, LocalFile, LocalFilesPluginProvides } from './types';
import {
  findFile,
  handleSave,
  handleToLocalDirectory,
  handleToLocalFile,
  isLocalFile,
  legacyFileToLocalFile,
  LOCAL_FILES_PLUGIN,
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

      const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
      if (treeViewPlugin) {
        const handleUpdate = () => {
          const current =
            (treeViewPlugin.provides.treeView.selected[0]?.startsWith(LOCAL_FILES_PLUGIN) &&
              findFile(state.files, treeViewPlugin.provides.treeView.selected)) ||
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
        nodes: (parent, emit) => {
          if (parent.id !== 'root') {
            return [];
          }

          onFilesUpdate = emit;
          const fileIndices = getIndices(state.files.length);
          return state.files.map((entity, index) =>
            localEntityToGraphNode(entity, fileIndices[index], emit, undefined, (file) => {
              state.files = state.files.filter((f) => f !== file);
            }),
          );
        },
        actions: (parent, _, plugins) => {
          if (parent.id !== 'root') {
            return [];
          }

          const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
          const actionIndices = getIndices(2);

          const actions: GraphNodeAction[] = [
            {
              id: 'open-file-handle',
              index: actionIndices[0],
              label: ['open file label', { ns: LOCAL_FILES_PLUGIN }],
              icon: (props) => <FilePlus {...props} />,
              invoke: async () => {
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
                  if (treeViewPlugin) {
                    treeViewPlugin.provides.treeView.selected = [file.id];
                  }

                  return;
                }

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.md,text/markdown';
                input.onchange = async () => {
                  const [legacyFile] = input.files ? Array.from(input.files) : [];
                  if (legacyFile) {
                    const file = await legacyFileToLocalFile(legacyFile);
                    state.files = [file, ...state.files];
                    if (treeViewPlugin) {
                      treeViewPlugin.provides.treeView.selected = [file.id];
                    }
                  }
                };
                input.click();
              },
            },
          ];

          if ('showDirectoryPicker' in window) {
            actions.push({
              id: 'open-directory',
              index: actionIndices[1],
              label: ['open directory label', { ns: LOCAL_FILES_PLUGIN }],
              icon: (props) => <FolderPlus {...props} />,
              invoke: async () => {
                const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                const directory = await handleToLocalDirectory(handle);
                state.files = [...state.files, directory];
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [directory.id, directory.children[0]?.id];
                }
              },
            });
          }

          return actions;
        },
      },
    },
  };
};
