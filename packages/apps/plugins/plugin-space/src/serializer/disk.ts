//
// Copyright 2024 DXOS.org
//

import { type SpaceProxy } from '@dxos/client/echo';
import { log } from '@dxos/log';

import { FileSerializer, type SerializedObject, type SerializedSpace } from './file-serializer';

export type SerializerOptions = {
  space: SpaceProxy;
  directory: FileSystemDirectoryHandle;
};

export class Serializer {
  async save({ space, directory }: SerializerOptions) {
    return saveSpaceToDisk({ space, directory });
  }

  async load({ space, directory }: SerializerOptions) {
    return loadSpaceFromDisk({ space, directory });
  }
}

const saveSpaceToDisk = async ({ space, directory }: SerializerOptions) => {
  const serializer = new FileSerializer();
  const serializedSpace = await serializer.serializeSpace(space);

  const saveDir = await directory.getDirectoryHandle(
    serializedSpace.metadata.name ?? serializedSpace.metadata.spaceKey,
    { create: true },
  );

  await writeComposerMetadata({ space: serializedSpace, directory: saveDir });
  await saveObjectsToDisk({ data: serializedSpace.data, directory: saveDir });
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
    for (const item of data) {
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

const loadSpaceFromDisk = async ({ space, directory }: SerializerOptions) => {
  try {
    if (!('TextDecoder' in window)) {
      throw new Error('Sorry, this browser does not support TextDecoder...');
    }

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
      data: await loadContent(directory, metadataWithoutContent.data),
    };

    const serializer = new FileSerializer();
    return serializer.deserializeSpace(space, serializedSpace);
  } catch (err) {
    log.catch(err);
  }
};
