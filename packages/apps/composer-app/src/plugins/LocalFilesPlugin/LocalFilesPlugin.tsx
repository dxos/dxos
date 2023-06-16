//
// Copyright 2023 DXOS.org
//

import { File, FolderNotchOpen, FolderOpen } from '@phosphor-icons/react';
import React from 'react';

import { createStore } from '@dxos/observable-object';
import { GraphNode, GraphProvides, RouterPluginProvides, Surface, definePlugin } from '@dxos/react-surface';

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
      actions: () => {
        return [
          {
            id: 'open-file',
            label: ['open file label', { ns: 'os' }],
            icon: FolderOpen,
            invoke: async () => {
              const input = document.createElement('input');
              input.type = 'file';
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
                  nodes.push({
                    id: `${LocalFilesPlugin.meta.id}/${file.name}`,
                    label: file.name,
                    data: createStore({
                      title: file.name,
                      text,
                    }),
                  });
                }
              };
              input.click();
            },
          },
          {
            id: 'open-file-handle',
            label: ['open file label', { ns: 'os' }],
            icon: File,
            invoke: async () => {
              if ('showOpenFilePicker' in window) {
                const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker();
                const file = await handle.getFile();
                nodes.push({
                  id: `${LocalFilesPlugin.meta.id}/${handle.name}`,
                  label: handle.name,
                  data: createStore({
                    handle,
                    title: handle.name,
                    text: await file.text(),
                  }),
                });
              }
            },
          },
          {
            id: 'open-directory',
            label: ['open directory label', { ns: 'os' }],
            icon: FolderNotchOpen,
            invoke: async () => {
              if ('showDirectoryPicker' in window) {
                const handle: FileSystemHandle = await (window as any).showDirectoryPicker();
                console.log({ handle });
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

        const splat = params['*'];
        return splat ? [`${LocalFilesPlugin.meta.id}/${splat}`] : null;
      },
    },
  },
});
