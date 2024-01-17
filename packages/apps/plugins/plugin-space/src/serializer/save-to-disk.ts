//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/react-client/echo';

import { type SerializedObject, type SerializedSpace } from './serializer';

export const TypeOfExpando = 'dxos.org/typename/expando';

export const saveSpaceToDisk = async ({
  space,
  directory,
}: {
  space: SerializedSpace;
  directory: FileSystemDirectoryHandle;
}) => {
  const saveDir = await directory.getDirectoryHandle(space.metadata.name ?? space.metadata.spaceKey, { create: true });
  await writeComposerMetadata({ space, directory: saveDir });
  await saveObjectsToDisk({ data: space.data, directory: saveDir });
};

const writeComposerMetadata = async ({
  space,
  directory,
}: {
  space: SerializedSpace;
  directory: FileSystemDirectoryHandle;
}) => {
  const composerDir = await directory.getDirectoryHandle('.composer', { create: true });
  const metadataFile = await composerDir.getFileHandle('space.json', { create: true });
  const writable = await metadataFile.createWritable();

  const dropContent = (data: SerializedObject[]) => {
    const result: SerializedObject[] = [];
    for (const item of space.data) {
      if (item.type === 'folder') {
        result.push({ ...item, children: dropContent(item.children) });
      } else {
        result.push({
          ...item,
          content: undefined,
        });
      }
    }
    return result;
  };

  await writable.write(JSON.stringify({ ...space, data: dropContent(space.data) }, null, 2));
  await writable.close();
};

const saveObjectsToDisk = async ({
  data,
  directory,
}: {
  data: SerializedObject[];
  directory: FileSystemDirectoryHandle;
}) => {
  for (const child of data) {
    if (child.type === 'folder') {
      const childDirectory = await directory.getDirectoryHandle(child.name, { create: true });
      await saveObjectsToDisk({ data: child.children, directory: childDirectory });
      continue;
    }

    const fileHandle = await directory.getFileHandle(`${child.name}.${child.extension}`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(child.content ?? '');
    await writable.close();
  }
};

export const loadSpaceFromDisk = async ({
  space,
  directory,
}: {
  space: Space;
  directory: FileSystemDirectoryHandle;
}) => {};
