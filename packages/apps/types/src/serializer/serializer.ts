//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { FileSerializer, type SerializedObject, type SerializedSpace } from './file-serializer';

export type SerializerOptions = {
  space: Space;
  directory: FileSystemDirectoryHandle;
};

export class Serializer {
  async save({ space, directory }: SerializerOptions): Promise<void> {
    const serializer = new FileSerializer();
    const serializedSpace = await serializer.serializeSpace(space);

    console.log(serializedSpace);

    const saveDir = await directory.getDirectoryHandle(
      serializedSpace.metadata.name ?? serializedSpace.metadata.spaceKey,
      { create: true },
    );

    await saveMetadata({ space: serializedSpace, directory: saveDir });
    await saveObjects({ objects: serializedSpace.objects, directory: saveDir });
  }

  async load({ space, directory }: SerializerOptions): Promise<Space | void> {
    invariant('TextDecoder' in window, 'This browser does not support TextDecoder...');
    const composerDir = await directory.getDirectoryHandle('.composer', { create: false });
    const metadataFile = await composerDir.getFileHandle('space.json', { create: false });
    const metadataWithoutContent: SerializedSpace = JSON.parse(
      new TextDecoder().decode(await (await metadataFile.getFile()).arrayBuffer()),
    );

    const loadContent = async (
      directory: FileSystemDirectoryHandle,
      data: SerializedObject[],
    ): Promise<SerializedObject[]> => {
      const result: SerializedObject[] = [];
      for (const item of data) {
        if (item.type === 'folder') {
          const childDirectory = await directory.getDirectoryHandle(item.name, { create: false });
          result.push({ ...item, children: await loadContent(childDirectory, item.children) });
        } else {
          const fileHandle = await directory.getFileHandle(`${item.name}.${item.extension}`, { create: false });
          const content = await (await fileHandle.getFile()).text();
          result.push({ ...item, content });
        }
      }
      return result;
    };

    const serializedSpace: SerializedSpace = {
      ...metadataWithoutContent,
      objects: await loadContent(directory, metadataWithoutContent.objects),
    };

    const serializer = new FileSerializer();
    return serializer.deserializeSpace(space, serializedSpace);
  }
}

const saveMetadata = async ({ space, directory }: { space: SerializedSpace; directory: FileSystemDirectoryHandle }) => {
  // TODO(burdon): Do not use "composer" in file names.
  const composerDir = await directory.getDirectoryHandle('.composer', { create: true });
  const metadataFile = await composerDir.getFileHandle('space.json', { create: true });
  const writable = await metadataFile.createWritable();

  const serialize = (data: SerializedObject[]) => {
    const result: SerializedObject[] = [];
    for (const item of data) {
      if (item.type === 'folder') {
        result.push({ ...item, children: serialize(item.children) });
      } else {
        result.push({ ...item });
      }
    }

    return result;
  };

  await writable.write(JSON.stringify({ ...space, data: serialize(space.objects) }, undefined, 2));
  await writable.close();
};

const saveObjects = async ({
  objects,
  directory,
}: {
  objects: SerializedObject[];
  directory: FileSystemDirectoryHandle;
}) => {
  for (const child of objects) {
    if (child.type === 'folder') {
      const childDirectory = await directory.getDirectoryHandle(child.name, { create: true });
      await saveObjects({ objects: child.children, directory: childDirectory });
      continue;
    }

    const fileHandle = await directory.getFileHandle(`${child.name}.${child.extension}`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(child.content ?? '');
    await writable.close();
  }
};
