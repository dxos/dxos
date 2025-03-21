//
// Copyright 2023 DXOS.org
//

import { type LocalDirectory, type LocalEntity, type LocalFile } from './types';

export const PREFIX = 'fs';

export const isLocalEntity = (data: unknown): data is LocalEntity => isLocalDirectory(data) || isLocalFile(data);

export const isLocalDirectory = (data: unknown): data is LocalDirectory =>
  data && typeof data === 'object' ? 'name' in data && 'handle' in data && 'children' in data : false;

export const isLocalFile = (data: unknown): data is LocalFile =>
  data && typeof data === 'object' ? 'name' in data && 'handle' in data && !('children' in data) : false;

export const handleToLocalDirectory = async (
  handle: any /* FileSystemDirectoryHandle */,
  path = '',
): Promise<LocalDirectory> => {
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  const childrenPath = path.length > 0 ? `${path}:${handle.name}` : handle.name;
  const children = permission === 'granted' ? await getDirectoryChildren(handle, childrenPath) : [];
  return {
    id: `${PREFIX}:${path}${handle.name.replaceAll(/\./g, '-')}`,
    name: handle.name,
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
    id: `${PREFIX}:${path}${handle.name.replaceAll(/\./g, '')}`,
    name: handle.name,
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
    name: file.name,
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

export const findFile = (files: LocalEntity[], [id, ...path]: readonly string[]): LocalFile | undefined => {
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
  a.setAttribute('download', file.name);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
