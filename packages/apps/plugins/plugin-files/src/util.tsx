//
// Copyright 2023 DXOS.org
//

import { File as FileIcon, FloppyDisk, Folder, type IconProps, Plugs, X } from '@phosphor-icons/react';
import React from 'react';

import { type Graph, manageNodes } from '@braneframe/plugin-graph';
import { type IntentDispatcher } from '@dxos/app-framework';

import { FILES_PLUGIN } from './meta';
import { type LocalDirectory, type LocalEntity, type LocalFile, LocalFilesAction } from './types';

export const PREFIX = 'fs';

export const isLocalFile = (data: unknown): data is LocalFile =>
  data && typeof data === 'object' ? 'title' in data && 'handle' in data : false;

export const handleToLocalDirectory = async (
  handle: any /* FileSystemDirectoryHandle */,
  path = '',
): Promise<LocalDirectory> => {
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  const childrenPath = path.length > 0 ? `${path}:${handle.name}` : handle.name;
  const children = permission === 'granted' ? await getDirectoryChildren(handle, childrenPath) : [];
  return {
    id: `${PREFIX}:${path}${handle.name.replaceAll(/\./g, '-')}`,
    title: handle.name,
    handle,
    permission,
    children,
  };
};

export const handleToLocalFile = async (handle: any /* FileSystemFileHandle */, path = ''): Promise<LocalFile> => {
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  const text = permission === 'granted' ? await handle.getFile().then((file: any) => file.text()) : undefined;
  path = path.length > 0 ? `${path}:` : path;
  return {
    id: `${PREFIX}:${path}${handle.name.replaceAll(/\./g, '-')}`,
    title: handle.name,
    handle,
    permission,
    text,
  };
};

export const legacyFileToLocalFile = async (file: File): Promise<LocalFile> => {
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (event) => {
      const text = event.target?.result;
      resolve(String(text));
    });
    reader.readAsText(file);
  });

  return {
    id: `${PREFIX}:${file.name.replaceAll(/\.| /g, '-')}`,
    title: file.name,
    handle: false,
    permission: 'granted',
    text,
  };
};

export const getDirectoryChildren = async (
  handle: any /* FileSystemDirectoryHandle */,
  path: string,
): Promise<LocalEntity[]> => {
  const children = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      children.push(await handleToLocalFile(entry, path));
    } else if (entry.kind === 'directory') {
      // TODO(wittjosiah): Handle subdirectories.
      // children.push(await handleToLocalDirectory(entry, path));
    }
  }
  return children;
};

export const findFile = (files: LocalEntity[], [id, ...path]: string[]): LocalFile | undefined => {
  const file = files.find((n) => n.id === id);
  if (file && !('children' in file)) {
    return file;
  } else if (!file || path.length === 0) {
    return undefined;
  }

  return findFile(file.children, path);
};

export const handleSave = async (file: LocalFile) => {
  const handle = file.handle as any;
  if (handle) {
    const writeable = await handle.createWritable();
    await writeable.write(file.text);
    await writeable.close();
  } else {
    handleLegacySave(file);
  }

  file.modified = false;
};

const handleLegacySave = (file: LocalFile) => {
  const contents = file.text || '';
  const blob = new Blob([contents], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.setAttribute('href', window.URL.createObjectURL(blob));
  a.setAttribute('download', file.title);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// TODO(wittjosiah): Handle remove.
export const localEntityToGraphNode = (entity: LocalEntity, graph: Graph, dispatch: IntentDispatcher) => {
  if ('children' in entity) {
    return localDirectoryToGraphNode(entity, graph, dispatch);
  } else {
    return localFileToGraphNode(entity, graph, dispatch);
  }
};

const localDirectoryToGraphNode = (directory: LocalDirectory, graph: Graph, dispatch: IntentDispatcher) => {
  graph.addNodes({
    id: directory.id,
    data: directory,
    properties: {
      label: directory.title,
      icon: (props: IconProps) => <Folder {...props} />,
      role: 'branch',
    },
    nodes: [
      {
        id: `${LocalFilesAction.CLOSE}:${directory.id}`,
        data: () =>
          dispatch({
            plugin: FILES_PLUGIN,
            action: LocalFilesAction.CLOSE,
            data: { id: directory.id },
          }),
        properties: {
          label: ['close directory label', { ns: FILES_PLUGIN }],
          icon: (props: IconProps) => <X {...props} />,
        },
      },
    ],
  });

  manageNodes({
    graph,
    condition: directory.permission !== 'granted',
    nodes: [
      {
        id: `${LocalFilesAction.RECONNECT}:${directory.id}`,
        data: () =>
          dispatch({
            plugin: FILES_PLUGIN,
            action: LocalFilesAction.RECONNECT,
            data: { id: directory.id },
          }),
        properties: {
          label: ['re-open directory label', { ns: FILES_PLUGIN }],
          icon: (props: IconProps) => <Plugs {...props} />,
          disposition: 'default',
        },
      },
    ],
  });

  directory.children.forEach((entity) => localEntityToGraphNode(entity, graph, dispatch));
};

const localFileToGraphNode = (file: LocalFile, graph: Graph, dispatch: IntentDispatcher) => {
  graph.addNodes({
    id: file.id,
    data: file,
    properties: {
      label: file.title,
      icon: (props: IconProps) => <FileIcon {...props} />,
      modified: file.modified,
    },
    nodes: [
      {
        id: `${LocalFilesAction.CLOSE}:${file.id}`,
        data: () =>
          dispatch({
            plugin: FILES_PLUGIN,
            action: LocalFilesAction.CLOSE,
            data: { id: file.id },
          }),
        properties: {
          label: ['close file label', { ns: FILES_PLUGIN }],
          icon: (props: IconProps) => <X {...props} />,
        },
      },
    ],
  });

  manageNodes({
    graph,
    condition: file.permission === 'granted',
    nodes: [
      {
        id: `${LocalFilesAction.SAVE}:${file.id}`,
        data: () =>
          dispatch({
            plugin: FILES_PLUGIN,
            action: LocalFilesAction.SAVE,
            data: { id: file.id },
          }),
        properties: {
          label: [file.handle ? 'save label' : 'save as label', { ns: FILES_PLUGIN }],
          icon: (props: IconProps) => <FloppyDisk {...props} />,
        },
      },
    ],
  });

  manageNodes({
    graph,
    condition: file.permission !== 'granted',
    nodes: [
      {
        id: `${LocalFilesAction.RECONNECT}:${file.id}`,
        data: () =>
          dispatch({
            plugin: FILES_PLUGIN,
            action: LocalFilesAction.RECONNECT,
            data: { id: file.id },
          }),
        properties: {
          label: ['re-open file label', { ns: FILES_PLUGIN }],
          icon: (props: IconProps) => <Plugs {...props} />,
          disposition: 'default',
        },
      },
    ],
  });
};
