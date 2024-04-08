//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { ObjectSerializer, type SerializedObject, type SerializedSpace } from './object-serializer';

// TODO(burdon): Change to .dxos (do not use "composer" in file names.)
const META_DIR = '.composer';
const SPACE_FILE = 'space.json';

export type SpaceSerializerOptions = {
  space: Space;
  directory: FileSystemDirectoryHandle;
};

export class SpaceSerializer {
  async save({ space, directory }: SpaceSerializerOptions): Promise<void> {
    const serializer = new ObjectSerializer();
    const serializedSpace = await serializer.serializeSpace(space);

    const saveDir = await directory.getDirectoryHandle(
      serializedSpace.metadata.name ?? serializedSpace.metadata.spaceKey,
      { create: true },
    );

    await saveMetadata({ space: serializedSpace, directory: saveDir });
    await saveObjects({ objects: serializedSpace.objects, directory: saveDir });
  }

  async load({ space, directory }: SpaceSerializerOptions): Promise<Space | void> {
    invariant('TextDecoder' in window, 'This browser does not support TextDecoder...');
    const composerDir = await directory.getDirectoryHandle(META_DIR, { create: false });
    const metadataFile = await composerDir.getFileHandle(SPACE_FILE, { create: false });
    const metadata: SerializedSpace = JSON.parse(
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

    const serializer = new ObjectSerializer();
    return serializer.deserializeSpace(space, {
      ...metadata,
      objects: await loadContent(directory, metadata.objects),
    });
  }
}

const saveMetadata = async ({ space, directory }: { space: SerializedSpace; directory: FileSystemDirectoryHandle }) => {
  const composerDir = await directory.getDirectoryHandle(META_DIR, { create: true });
  const metadataFile = await composerDir.getFileHandle(SPACE_FILE, { create: true });
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
