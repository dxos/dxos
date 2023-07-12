//
// Copyright 2023 DXOS.org
//

import { File as FileIcon, FilePlus, FloppyDisk, FolderPlus, Plugs, X } from '@phosphor-icons/react';
import { getIndexBelow, getIndices } from '@tldraw/indices';
import localforage from 'localforage';

import { findGraphNode, GraphNode, GraphNodeAction, GraphProvides, isGraphNode } from '@braneframe/plugin-graph';
import { MarkdownProvides } from '@braneframe/plugin-markdown';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { createStore, createSubscription } from '@dxos/observable-object';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { LocalFileMain, LocalFileMainPermissions } from './components';
import translations from './translations';

export const LOCAL_FILES_PLUGIN = 'dxos:local';

export type LocalFile = {
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
  title: string;
  text?: string;
};

const handleSave = async (node: GraphNode<LocalFile>) => {
  const handle = node.data?.handle as any;
  if (handle) {
    const writeable = await handle.createWritable();
    await writeable.write(node.data!.text);
    await writeable.close();
  } else {
    handleLegacySave(node);
  }

  node.attributes = { ...node.attributes, modified: false };
};

const handleLegacySave = (node: GraphNode<LocalFile>) => {
  const filename = typeof node.label === 'string' ? node.label : 'untitled.md';
  const contents = node.data?.text || '';
  const blob = new Blob([contents], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.setAttribute('href', window.URL.createObjectURL(blob));
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const isLocalFile = (datum: unknown): datum is LocalFile =>
  datum && typeof datum === 'object' ? 'title' in datum : false;

export type LocalFilesPluginProvides = GraphProvides & TranslationsProvides;

export const LocalFilesPlugin = (): PluginDefinition<LocalFilesPluginProvides, MarkdownProvides> => {
  const nodes = createStore<GraphNode<LocalFile>[]>([]);
  const store = createStore<{ current: GraphNode<LocalFile> | undefined }>();

  const handleKeyDown = async (event: KeyboardEvent) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === 's' && modifier && store.current) {
      event.preventDefault();
      await handleSave(store.current);
    }
  };

  const handleDirectory = async (handle: any /* FileSystemDirectoryHandle */) => {
    const node = createStore<GraphNode<LocalFile>>({
      id: `${LOCAL_FILES_PLUGIN}/${handle.name.replaceAll(/\.| /g, '-')}`,
      index: getIndexBelow(getIndices(1)[0]),
      label: handle.name,
      data: {
        handle,
        title: handle.name,
      },
    });

    const actionIndices = getIndices(2);

    const closeAction: GraphNodeAction = {
      id: 'close-directory',
      index: actionIndices[0],
      label: ['close directory label', { ns: LOCAL_FILES_PLUGIN }],
      icon: X,
      invoke: async () => {
        const index = nodes.indexOf(node);
        nodes.splice(index, 1);
      },
    };

    const grantedActions = [closeAction];

    const defaultActions: GraphNodeAction[] = [
      {
        id: 're-open',
        index: actionIndices[1],
        label: ['re-open directory label', { ns: LOCAL_FILES_PLUGIN }],
        icon: Plugs,
        invoke: async () => {
          const result = await handle.requestPermission({ mode: 'readwrite' });
          if (result === 'granted' && node.actions) {
            node.actions = grantedActions;
            node.attributes = {};
            node.children = await handleDirectoryChildren(handle, node);
          }
        },
      },
      closeAction,
    ];

    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      node.actions = grantedActions;
      node.attributes = {};
      node.children = await handleDirectoryChildren(handle, node);
    } else {
      node.actions = defaultActions;
      node.attributes = { disabled: true };
      node.children = [];
    }

    return node;
  };

  const handleDirectoryChildren = async (handle: any /* FileSystemDirectoryHandle */, parent: GraphNode<LocalFile>) => {
    const children: GraphNode<LocalFile>[] = [];

    const values = await handle.values();
    const indices = getIndices(values.length);
    let cursor = 0;

    for (const child of values) {
      if (child.kind !== 'file' || !child.name.endsWith('.md')) {
        continue;
      }
      const file = await child.getFile();
      const node = createStore<GraphNode<LocalFile>>({
        id: child.name.replaceAll(/\.| /g, '-'),
        index: indices[cursor],
        label: child.name,
        icon: FileIcon,
        parent,
        data: {
          handle: child,
          title: child.name,
          text: await file.text(),
        },
        actions: [
          {
            id: 'save',
            index: getIndices(1)[0],
            label: ['save label', { ns: LOCAL_FILES_PLUGIN }],
            icon: FloppyDisk,
            invoke: async () => {
              await handleSave(node);
            },
          },
        ],
      });
      cursor += 1;
      children.push(node);
    }

    return children;
  };

  const handleFile = async (handle: any /* FileSystemFileHandle */, index: string) => {
    const id = `${LOCAL_FILES_PLUGIN}/${handle.name.replaceAll(/\.| /g, '-')}`;
    const actionIndices = getIndices(3);

    const permission = await handle.queryPermission({ mode: 'readwrite' });
    const data: LocalFile = {
      handle,
      title: handle.name,
    };

    const node = createStore<GraphNode<LocalFile>>({
      id,
      index,
      label: handle.name,
      icon: FileIcon,
      data,
    });

    const closeAction: GraphNodeAction = {
      id: 'close-directory',
      index: actionIndices[2],
      label: ['close file label', { ns: LOCAL_FILES_PLUGIN }],
      icon: X,
      invoke: async () => {
        const index = nodes.indexOf(node);
        nodes.splice(index, 1);
      },
    };

    const grantedActions: GraphNodeAction[] = [
      {
        id: 'save',
        index: actionIndices[1],
        label: ['save label', { ns: LOCAL_FILES_PLUGIN }],
        icon: FloppyDisk,
        invoke: async () => {
          await handleSave(node);
        },
      },
      closeAction,
    ];

    const defaultActions: GraphNodeAction[] = [
      {
        id: 're-open',
        index: actionIndices[0],
        label: ['re-open file label', { ns: LOCAL_FILES_PLUGIN }],
        icon: Plugs,
        invoke: async () => {
          const result = await handle.requestPermission({ mode: 'readwrite' });
          if (result === 'granted' && node.actions) {
            const file = await handle.getFile();
            node.data = { ...node.data!, text: await file.text() };
            node.actions = grantedActions;
            node.attributes = {};
            node.children = undefined;
          }
        },
      },
      closeAction,
    ];

    if (permission === 'granted') {
      const file = await handle.getFile();
      node.data = { ...node.data!, text: await file.text() };
      node.actions = grantedActions;
      node.attributes = {};
    } else {
      node.actions = defaultActions;
      node.attributes = { disabled: true };
      node.children = [];
    }

    return node;
  };

  const handleLegacyFile = async (file: File, index: string) => {
    const id = `${LOCAL_FILES_PLUGIN}/${file.name.replaceAll(/\.| /g, '-')}`;
    const actionIndices = getIndices(2);
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', (event) => {
        const text = event.target?.result;
        resolve(String(text));
      });
      reader.readAsText(file);
    });

    const node = createStore<GraphNode<LocalFile>>({
      id,
      index,
      label: file.name,
      icon: FileIcon,
      data: {
        title: file.name,
        text,
      },
      actions: [
        {
          id: 'save-as',
          index: actionIndices[0],
          label: ['save as label', { ns: LOCAL_FILES_PLUGIN }],
          icon: FloppyDisk,
          invoke: async () => {
            await handleSave(node);
          },
        },
        {
          id: 'close-directory',
          index: actionIndices[1],
          label: ['close file label', { ns: LOCAL_FILES_PLUGIN }],
          icon: X,
          invoke: async () => {
            const index = nodes.indexOf(node);
            nodes.splice(index, 1);
          },
        },
      ],
    });

    return node;
  };
  return {
    meta: {
      id: LOCAL_FILES_PLUGIN,
    },
    init: async () => {
      return {
        markdown: {
          onChange: (text) => {
            if (store.current) {
              store.current.data!.text = text.toString();
              store.current.attributes = { ...store.current.attributes, modified: true };
            }
          },
        },
      };
    },
    ready: async (plugins) => {
      window.addEventListener('keydown', handleKeyDown);

      const value = await localforage.getItem<FileSystemHandle[]>(LOCAL_FILES_PLUGIN);
      const indices = getIndices(value?.length ?? 1);
      if (Array.isArray(value)) {
        await Promise.all(
          value.map(async (handle, index) => {
            if (handle.kind === 'file') {
              const node = await handleFile(handle, indices[index]);
              nodes.unshift(node);
            } else if (handle.kind === 'directory') {
              const node = await handleDirectory(handle);
              nodes.push(node);
            }
          }),
        );
      }

      const handle = createSubscription(async () => {
        await localforage.setItem(
          LOCAL_FILES_PLUGIN,
          Array.from(nodes)
            .map((node) => node.data?.handle)
            .filter(Boolean),
        );
      });
      handle.update([nodes]);

      const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
      if (treeViewPlugin) {
        const handle = createSubscription(() => {
          store.current =
            (treeViewPlugin.provides.treeView.selected[0]?.startsWith(LOCAL_FILES_PLUGIN) &&
              findGraphNode(nodes, treeViewPlugin.provides.treeView.selected)) ||
            undefined;
        });
        handle.update([treeViewPlugin.provides.treeView, nodes, ...Array.from(nodes)]);
      }
    },
    unload: async () => {
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
        nodes: () => nodes,
        actions: (plugins) => {
          const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
          const actionIndices = getIndices(2);

          const actions: GraphNodeAction[] = [
            {
              id: 'open-file-handle',
              index: actionIndices[0],
              label: ['open file label', { ns: LOCAL_FILES_PLUGIN }],
              icon: FilePlus,
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
                  const node = await handleFile(handle, getIndexBelow(nodes[0].index));
                  nodes.unshift(node);
                  if (treeViewPlugin) {
                    treeViewPlugin.provides.treeView.selected = [node.id];
                  }

                  return;
                }

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.md,text/markdown';
                input.onchange = async () => {
                  const [file] = input.files ? Array.from(input.files) : [];
                  if (file) {
                    const node = await handleLegacyFile(file, getIndexBelow(nodes[0].index));
                    nodes.unshift(node);
                    if (treeViewPlugin) {
                      treeViewPlugin.provides.treeView.selected = [node.id];
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
              icon: FolderPlus,
              invoke: async () => {
                const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                const node = await handleDirectory(handle);
                nodes.push(node);
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [node.id, node.children![0]?.id];
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
