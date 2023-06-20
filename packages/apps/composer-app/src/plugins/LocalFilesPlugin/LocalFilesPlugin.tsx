//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, FolderOpen, LockSimpleOpen } from '@phosphor-icons/react';
import localforage from 'localforage';
import React from 'react';

import { createStore, createSubscription } from '@dxos/observable-object';
import {
  GraphNode,
  GraphNodeAction,
  GraphProvides,
  isGraphNode,
  RouterPluginProvides,
  Surface,
  TreeViewProvides,
  definePlugin,
  findPlugin,
  findGraphNode,
} from '@dxos/react-surface';

import { MarkdownProvides, isMarkdown, isMarkdownProperties } from '../MarkdownPlugin';
import { LocalFileMain, LocalFileMainPermissions } from './components';

export type LocalFile = {
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
  title: string;
  text?: string;
};

const nodes = createStore<GraphNode<LocalFile>[]>([]);
const store = createStore<{ current: GraphNode<LocalFile> | undefined }>();

export type LocalFilesPluginProvides = GraphProvides & RouterPluginProvides;

const isLocalFile = (datum: unknown): datum is LocalFile =>
  datum && typeof datum === 'object' ? 'title' in datum : false;

export const LocalFilesPlugin = definePlugin<LocalFilesPluginProvides, MarkdownProvides>({
  meta: {
    id: 'dxos:local',
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
    const value = await localforage.getItem<FileSystemDirectoryHandle[]>(LocalFilesPlugin.meta.id);
    if (Array.isArray(value)) {
      await Promise.all(
        value.map(async (handle) => {
          const node = await handleDirectory(handle);
          nodes.push(node);
        }),
      );
    }

    const handle = createSubscription(async () => {
      await localforage.setItem(
        LocalFilesPlugin.meta.id,
        Array.from(nodes)
          .map((node) => node.data?.handle)
          .filter(Boolean),
      );
    });
    handle.update([nodes]);

    const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:TreeViewPlugin');
    if (treeViewPlugin) {
      const handle = createSubscription(() => {
        store.current =
          (treeViewPlugin.provides.treeView.selected[0]?.startsWith(LocalFilesPlugin.meta.id) &&
            findGraphNode(nodes, treeViewPlugin.provides.treeView.selected)) ||
          undefined;
      });
      handle.update([treeViewPlugin.provides.treeView, nodes, ...Array.from(nodes)]);
    }
  },
  provides: {
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (isGraphNode(datum) && isLocalFile(datum.data) && datum.attributes?.disabled) {
            return LocalFileMainPermissions;
          }
          break;

        case 'menuitem':
          if (Array.isArray(datum) && isMarkdown(datum[0]) && isMarkdownProperties(datum[1]) && datum[1].readOnly) {
            return null;
          }
          break;
      }

      return null;
    },
    components: {
      LocalFileMain,
    },
    graph: {
      nodes: () => nodes,
      actions: (plugins) => {
        const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:TreeViewPlugin');

        return [
          // TODO(wittjosiah): Full support for individual files.
          // {
          //   id: 'open-file-handle',
          //   label: ['open file label', { ns: 'os' }],
          //   icon: File,
          //   invoke: async () => {
          //     if ('showOpenFilePicker' in window) {
          //       const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker({
          //         types: [
          //           {
          //             description: 'Markdown',
          //             accept: { 'text/markdown': ['.md'] },
          //           },
          //         ],
          //       });
          //       const file = await handle.getFile();
          //       const id = `${LocalFilesPlugin.meta.id}/${handle.name.replaceAll(/\.| /g, '-')}`;
          //       nodes.unshift({
          //         id,
          //         label: handle.name,
          //         icon: ArticleMedium,
          //         data: {
          //           handle,
          //           title: handle.name,
          //           text: await file.text(),
          //         },
          //       });
          //       if (treeViewPlugin) {
          //         treeViewPlugin.provides.treeView.selected = [id];
          //       }
          //       return;
          //     }

          //     const input = document.createElement('input');
          //     input.type = 'file';
          //     input.accept = '.md,text/markdown';
          //     input.onchange = async () => {
          //       const [file] = input.files ? Array.from(input.files) : [];
          //       if (file) {
          //         const text = await new Promise<string>((resolve) => {
          //           const reader = new FileReader();
          //           reader.addEventListener('loadend', (event) => {
          //             const text = event.target?.result;
          //             resolve(String(text));
          //           });
          //           reader.readAsText(file);
          //         });
          //         const id = `${LocalFilesPlugin.meta.id}/${file.name.replaceAll(/\.| /g, '-')}`;
          //         nodes.unshift({
          //           id,
          //           label: file.name,
          //           icon: ArticleMedium,
          //           data: {
          //             title: file.name,
          //             text,
          //           },
          //         });
          //         if (treeViewPlugin) {
          //           treeViewPlugin.provides.treeView.selected = [id];
          //         }
          //       }
          //     };
          //     input.click();
          //   },
          // },
          // TODO(wittjosiah): Only show this if supported by browser.
          {
            id: 'open-directory',
            label: ['open directory label', { ns: 'os' }],
            icon: FolderOpen,
            invoke: async () => {
              if ('showDirectoryPicker' in window) {
                const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                const node = await handleDirectory(handle);
                nodes.push(node);
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [node.id, node.children![0]?.id];
                }
              }
            },
          },
        ];
      },
    },
    router: {
      routes: () => [
        {
          path: '/dxos/local/*',
          element: (
            <Surface
              component='dxos:SplitViewPlugin/SplitView'
              surfaces={{
                sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
                main: { component: 'dxos:local/LocalFileMain' },
              }}
            />
          ),
        },
      ],
      current: (params): string[] | null => {
        const splat = params['*'];
        if (!splat) {
          return null;
        }

        const [directory, ...rest] = splat.split('/');
        return [`${LocalFilesPlugin.meta.id}/${directory}`, ...rest];
      },
      next: (path, params): string[] | null => {
        if (!path.startsWith('/dxos/local/')) {
          return null;
        }

        return LocalFilesPlugin.provides!.router.current!(params);
      },
    },
  },
});

const handleDirectory = async (handle: any /* FileSystemDirectoryHandle */) => {
  const node = createStore<GraphNode<LocalFile>>({
    id: `${LocalFilesPlugin.meta.id}/${handle.name.replaceAll(/\.| /g, '-')}`,
    label: handle.name,
    data: {
      handle,
      title: handle.name,
    },
  });

  const grantedActions: GraphNodeAction[] = [
    // TODO(wittjosiah): Implement actions.
    // {
    //   id: 'new-file',
    //   label: ['new file label', { ns: 'os' }],
    //   icon: Plus,
    //   invoke: async () => {},
    // },
    // {
    //   id: 'close-directory',
    //   label: ['close directory label', { ns: 'os' }],
    //   icon: FolderSimpleMinus,
    //   invoke: async () => {},
    // },
  ];

  const defaultActions: GraphNodeAction[] = [
    {
      id: 're-open',
      label: ['re-open directory label', { ns: 'os' }],
      icon: LockSimpleOpen,
      invoke: async () => {
        const result = await handle.requestPermission({ mode: 'readwrite' });
        if (result === 'granted' && node.actions) {
          node.actions = grantedActions;
          node.attributes = {};
          node.children = await handleDirectoryChildren(handle, node);
        }
      },
    },
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

  for await (const child of handle.values()) {
    if (child.kind !== 'file' || !child.name.endsWith('.md')) {
      continue;
    }

    const file = await child.getFile();
    children.push(
      createStore<GraphNode<LocalFile>>({
        id: child.name.replaceAll(/\.| /g, '-'),
        label: child.name,
        icon: ArticleMedium,
        parent,
        data: {
          handle,
          title: child.name,
          text: await file.text(),
        },
      }),
    );
  }

  return children;
};
