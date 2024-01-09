//
// Copyright 2024 DXOS.org
//

import { Folder, Document } from '@braneframe/types';
import { AutomergeObject } from '@dxos/echo-schema';
import { type TypedObject, TextObject, type Space } from '@dxos/react-client/echo';

export const saveSpaceToDisk = async ({ space, directory }: { space: Space; directory: FileSystemDirectoryHandle }) => {
  await space.waitUntilReady();

  const spaceRoot = space.properties[Folder.schema.typename];
  if (!spaceRoot) {
    throw new Error('No root folder.');
  }

  const root = await directory.getDirectoryHandle(space.properties.name || space.key.toHex(), { create: true });
  await saveFolderToDisk(spaceRoot, root);
};

const saveFolderToDisk = async (echoFolder: Folder, directory: FileSystemDirectoryHandle) => {
  const namesCount = new Map<string, number>();
  const getFileName = (title: string) => {
    const displayTitle = title?.replace(/[/\\?%*:|"<>]/g, '-') || 'Untitled';
    if (namesCount.has(displayTitle)) {
      const count = namesCount.get(displayTitle)!;
      namesCount.set(displayTitle, count + 1);
      return `${displayTitle} (${count})`;
    } else {
      namesCount.set(displayTitle, 1);
      return displayTitle;
    }
  };

  for (const child of echoFolder.objects) {
    if (child instanceof Folder) {
      const childDirectory = await directory.getDirectoryHandle(child.name, { create: true });
      await saveFolderToDisk(child, childDirectory);
    } else if (child instanceof Document) {
      const fileHandle = await directory.getFileHandle(getFileName(child.title) + '.md', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(await Serializer.serialize(child));
      await writable.close();
    }
  }
};

/**
 * Serializes ECHO object into human readable file and deserializes it back.
 */
class Serializer {
  /**
   * Serialize ECHO object into human readable file.
   *
   * NOTE: Only supports documents for now.
   */
  static async serialize(echoObject: TypedObject): Promise<Blob> {
    if (echoObject instanceof Document) {
      const content = echoObject.content;
      if (content instanceof TextObject) {
        return new Blob([content.text], { type: 'text/plain' });
      } else if ((content as any) instanceof AutomergeObject) {
        return new Blob([content[(content as TypedObject).field]], { type: 'text/plain' });
      }
    }

    throw new Error('Not implemented.');
  }

  static async deserialize(blob: Blob): Promise<TypedObject> {
    throw new Error('Not implemented.');
  }
}
