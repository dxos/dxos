//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, File, FolderOpen, FolderSimpleMinus, Plus } from '@phosphor-icons/react';
import React from 'react';

import { createStore } from '@dxos/observable-object';
import {
  GraphNode,
  GraphProvides,
  RouterPluginProvides,
  Surface,
  TreeViewProvides,
  definePlugin,
  findPlugin,
} from '@dxos/react-surface';

import { LocalFileMain } from './components';

export type LocalFile = {
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
  title: string;
  text?: string;
};

const nodes = createStore<GraphNode<LocalFile>[]>([]);
// const nodeAttributes = new Map<string, { [key: string]: any }>();
// const rootObjects = new Map<string, GraphNode[]>();

export type LocalFilesPluginProvides = GraphProvides & RouterPluginProvides;

export const LocalFilesPlugin = definePlugin<LocalFilesPluginProvides>({
  meta: {
    id: 'dxos:local',
  },
  provides: {
    component: (datum, role) => {
      if (datum?.id?.length === 1 && role === 'treeitem') {
        return () => <>{datum.label}</>;
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
          {
            id: 'open-file-handle',
            label: ['open file label', { ns: 'os' }],
            icon: File,
            invoke: async () => {
              if ('showOpenFilePicker' in window) {
                const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker({
                  types: [
                    {
                      description: 'Markdown',
                      accept: { 'text/markdown': ['.md'] },
                    },
                  ],
                });
                const file = await handle.getFile();
                const id = `${LocalFilesPlugin.meta.id}/${handle.name.replaceAll(/\.| /g, '-')}`;
                nodes.unshift({
                  id,
                  label: handle.name,
                  icon: ArticleMedium,
                  data: {
                    handle,
                    title: handle.name,
                    text: await file.text(),
                  },
                });
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [id];
                }
                return;
              }

              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.md,text/markdown';
              input.onchange = async () => {
                const [file] = input.files ? Array.from(input.files) : [];
                if (file) {
                  const text = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.addEventListener('loadend', (event) => {
                      const text = event.target?.result;
                      resolve(String(text));
                    });
                    reader.readAsText(file);
                  });
                  const id = `${LocalFilesPlugin.meta.id}/${file.name.replaceAll(/\.| /g, '-')}`;
                  nodes.unshift({
                    id,
                    label: file.name,
                    icon: ArticleMedium,
                    data: {
                      title: file.name,
                      text,
                    },
                  });
                  if (treeViewPlugin) {
                    treeViewPlugin.provides.treeView.selected = [id];
                  }
                }
              };
              input.click();
            },
          },
          {
            id: 'open-directory',
            label: ['open directory label', { ns: 'os' }],
            icon: FolderOpen,
            invoke: async () => {
              if ('showDirectoryPicker' in window) {
                const handle = await (window as any).showDirectoryPicker();
                const node: GraphNode<LocalFile> = {
                  id: `${LocalFilesPlugin.meta.id}/${handle.name.replaceAll(/\.| /g, '-')}`,
                  label: handle.name,
                  data: {
                    handle,
                    title: handle.name,
                  },
                  actions: [
                    {
                      id: 'new-file',
                      label: ['new file label', { ns: 'os' }],
                      icon: Plus,
                      invoke: async () => {},
                    },
                    {
                      id: 'close-directory',
                      label: ['close directory label', { ns: 'os' }],
                      icon: FolderSimpleMinus,
                      invoke: async () => {},
                    },
                  ],
                };

                const children: GraphNode<LocalFile>[] = [];
                for await (const child of handle.values()) {
                  if (child.kind !== 'file' || !child.name.endsWith('.md')) {
                    continue;
                  }

                  const file = await child.getFile();
                  children.push({
                    id: child.name.replaceAll(/\.| /g, '-'),
                    label: child.name,
                    icon: ArticleMedium,
                    parent: node,
                    data: {
                      handle,
                      title: child.name,
                      text: await file.text(),
                    },
                  });
                }
                node.children = children;
                nodes.push(node);
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [node.id, children[0]?.id];
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
        return splat ? [`${LocalFilesPlugin.meta.id}/${splat}`] : null;
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
