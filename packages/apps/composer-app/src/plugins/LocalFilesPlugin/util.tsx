//
// Copyright 2023 DXOS.org
//

import { File as FileIcon, FloppyDisk, Folder, Plugs, X } from '@phosphor-icons/react';
import React from 'react';

import { GraphNode, GraphNodeAction } from '@braneframe/plugin-graph';

import { LocalDirectory, LocalEntity, LocalFile } from './types';

export const LOCAL_FILES_PLUGIN = 'dxos:local';

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

export const localEntityToGraphNode = (
  entity: LocalEntity,
  emit: () => void,
  parent?: GraphNode<LocalDirectory>,
  removeEntity?: (entity: LocalEntity) => void,
) => {
  if ('children' in entity) {
    return localDirectoryToGraphNode(entity, emit, parent, removeEntity);
  } else {
    return localFileToGraphNode(entity, emit, parent, removeEntity);
  }
};

const localDirectoryToGraphNode = (
  directory: LocalDirectory,
  emit: () => void,
  parent?: GraphNode<LocalDirectory>,
  removeEntity?: (entity: LocalEntity) => void,
) => {
  const node: GraphNode<LocalDirectory> = {
    id: directory.id,
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
    label: ['close directory label', { ns: LOCAL_FILES_PLUGIN }],
    icon: (props) => <X {...props} />,
    invoke: async () => {
      removeEntity!(directory);
      emit();
    },
  };

  const grantedActions = removeEntity ? [closeAction] : [];

  const defaultActions: GraphNodeAction[] = [
    {
      id: 're-open',
      label: ['re-open directory label', { ns: LOCAL_FILES_PLUGIN }],
      icon: (props) => <Plugs {...props} />,
      disposition: 'toolbar',
      invoke: async () => {
        const permission = await (directory.handle as any).requestPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          directory.children = await getDirectoryChildren(directory.handle);
          directory.permission = permission;
          emit();
        }
      },
    },
    ...(removeEntity ? [closeAction] : []),
  ];

  node.pluginActions = { [LOCAL_FILES_PLUGIN]: directory.permission === 'granted' ? grantedActions : defaultActions };
  node.pluginChildren = {
    [LOCAL_FILES_PLUGIN]: directory.children.map((entity) => {
      if ('children' in entity) {
        return localDirectoryToGraphNode(entity, emit, node);
      } else {
        return localFileToGraphNode(entity, emit, node);
      }
    }),
  };

  return node;
};

const localFileToGraphNode = (
  file: LocalFile,
  emit: () => void,
  parent?: GraphNode<LocalDirectory>,
  removeEntity?: (entity: LocalEntity) => void,
) => {
  const node: GraphNode<LocalFile> = {
    id: file.id,
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
    label: ['close file label', { ns: LOCAL_FILES_PLUGIN }],
    icon: (props) => <X {...props} />,
    invoke: async () => {
      removeEntity!(file);
      emit();
    },
  };

  const grantedActions: GraphNodeAction[] = [
    {
      id: 'save',
      label: [file.handle ? 'save label' : 'save as label', { ns: LOCAL_FILES_PLUGIN }],
      icon: (props) => <FloppyDisk {...props} />,
      invoke: async () => {
        await handleSave(file);
        emit();
      },
    },
    ...(removeEntity ? [closeAction] : []),
  ];

  const defaultActions: GraphNodeAction[] = [
    {
      id: 're-open',
      label: ['re-open file label', { ns: LOCAL_FILES_PLUGIN }],
      icon: (props) => <Plugs {...props} />,
      disposition: 'toolbar',
      invoke: async () => {
        const permission = await (file.handle as any).requestPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          const text = await (file.handle as any).getFile?.().then((file: any) => file.text());
          file.text = text;
          file.permission = permission;
          emit();
        }
      },
    },
    ...(removeEntity ? [closeAction] : []),
  ];

  node.pluginActions = { [LOCAL_FILES_PLUGIN]: file.permission === 'granted' ? grantedActions : defaultActions };

  return node;
};
