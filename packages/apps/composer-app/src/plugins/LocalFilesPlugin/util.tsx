//
// Copyright 2023 DXOS.org
//

import { File as FileIcon, FloppyDisk, Folder, Plugs, X } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { GraphNode, GraphNodeAction } from '@braneframe/plugin-graph';

import { LOCAL_FILES_PLUGIN, LocalDirectory, LocalEntity, LocalFile, LocalFilesAction } from './types';

export const isLocalFile = (datum: unknown): datum is LocalFile =>
  datum && typeof datum === 'object' ? 'title' in datum : false;

export const handleToLocalDirectory = async (handle: any /* FileSystemDirectoryHandle */): Promise<LocalDirectory> => {
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  const children = permission === 'granted' ? await getDirectoryChildren(handle) : [];
  return {
    id: `${LOCAL_FILES_PLUGIN}/${handle.name.replaceAll(/\./g, '-')}`,
    title: handle.name,
    handle,
    permission,
    children,
  };
};

export const handleToLocalFile = async (
  handle: any /* FileSystemFileHandle */,
  // TODO(wittjosiah): Unify id generation.
  hasParent = false,
): Promise<LocalFile> => {
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  const text = permission === 'granted' ? await handle.getFile().then((file: any) => file.text()) : undefined;
  const id = handle.name.replaceAll(/\./g, '-');
  return {
    id: hasParent ? id : `${LOCAL_FILES_PLUGIN}/${id}`,
    title: handle.name,
    handle,
    permission,
    text,
  };
};

export const legacyFileToLocalFile = async (file: File) => {
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (event) => {
      const text = event.target?.result;
      resolve(String(text));
    });
    reader.readAsText(file);
  });

  return {
    id: `${LOCAL_FILES_PLUGIN}/${file.name.replaceAll(/\.| /g, '-')}`,
    title: file.name,
    text,
  };
};

export const getDirectoryChildren = async (handle: any /* FileSystemDirectoryHandle */): Promise<LocalEntity[]> => {
  const children = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      children.push(await handleToLocalFile(entry, true));
    } else if (entry.kind === 'directory') {
      // TODO(wittjosiah): Handle subdirectories.
      // children.push(await handleToLocalDirectory(entry));
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

export const localEntityToGraphNode = (entity: LocalEntity, index: string, parent?: GraphNode<LocalDirectory>) => {
  if ('children' in entity) {
    return localDirectoryToGraphNode(entity, index, parent);
  } else {
    return localFileToGraphNode(entity, index, parent);
  }
};

const localDirectoryToGraphNode = (directory: LocalDirectory, index: string, parent?: GraphNode<LocalDirectory>) => {
  const node: GraphNode<LocalDirectory> = {
    id: directory.id,
    index,
    label: directory.title,
    icon: (props) => <Folder {...props} />,
    data: directory,
    parent,
    attributes: {
      disabled: directory.permission !== 'granted',
    },
  };

  const closeAction: GraphNodeAction = {
    id: 'close-directory',
    index: 'a1',
    label: ['close directory label', { ns: LOCAL_FILES_PLUGIN }],
    icon: (props) => <X {...props} />,
    intent: {
      plugin: LOCAL_FILES_PLUGIN,
      action: LocalFilesAction.CLOSE,
      data: { id: directory.id },
    },
  };

  const grantedActions = [closeAction];

  const defaultActions: GraphNodeAction[] = [
    {
      id: 're-open',
      index: 'a0',
      label: ['re-open directory label', { ns: LOCAL_FILES_PLUGIN }],
      icon: (props) => <Plugs {...props} />,
      disposition: 'toolbar',
      intent: {
        plugin: LOCAL_FILES_PLUGIN,
        action: LocalFilesAction.RECONNECT,
        data: { id: directory.id },
      },
    },
    closeAction,
  ];

  node.pluginActions = { [LOCAL_FILES_PLUGIN]: directory.permission === 'granted' ? grantedActions : defaultActions };
  const childIndices = getIndices(directory.children.length);
  node.pluginChildren = {
    [LOCAL_FILES_PLUGIN]: directory.children.map((entity, index) => {
      if ('children' in entity) {
        return localDirectoryToGraphNode(entity, childIndices[index], node);
      } else {
        return localFileToGraphNode(entity, childIndices[index], node);
      }
    }),
  };

  return node;
};

const localFileToGraphNode = (file: LocalFile, index: string, parent?: GraphNode<LocalDirectory>) => {
  const node: GraphNode<LocalFile> = {
    id: file.id,
    index,
    label: file.title,
    icon: (props) => <FileIcon {...props} />,
    data: file,
    parent,
    attributes: {
      disabled: file.permission !== 'granted',
      modified: file.modified,
    },
  };

  const closeAction: GraphNodeAction = {
    id: 'close-directory',
    index: 'a1',
    label: ['close file label', { ns: LOCAL_FILES_PLUGIN }],
    icon: (props) => <X {...props} />,
    intent: {
      plugin: LOCAL_FILES_PLUGIN,
      action: LocalFilesAction.CLOSE,
      data: { id: file.id },
    },
  };

  const grantedActions: GraphNodeAction[] = [
    {
      id: 'save',
      index: 'a2',
      label: [file.handle ? 'save label' : 'save as label', { ns: LOCAL_FILES_PLUGIN }],
      icon: (props) => <FloppyDisk {...props} />,
      intent: {
        plugin: LOCAL_FILES_PLUGIN,
        action: LocalFilesAction.SAVE,
        data: { id: file.id },
      },
    },
    closeAction,
  ];

  const defaultActions: GraphNodeAction[] = [
    {
      id: 're-open',
      index: 'a0',
      label: ['re-open file label', { ns: LOCAL_FILES_PLUGIN }],
      icon: (props) => <Plugs {...props} />,
      disposition: 'toolbar',
      intent: {
        plugin: LOCAL_FILES_PLUGIN,
        action: LocalFilesAction.RECONNECT,
        data: { id: file.id },
      },
    },
    closeAction,
  ];

  node.pluginActions = { [LOCAL_FILES_PLUGIN]: file.permission === 'granted' ? grantedActions : defaultActions };

  return node;
};
