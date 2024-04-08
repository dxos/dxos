//
// Copyright 2024 DXOS.org
//

import md5 from 'md5';

import { type Space } from '@dxos/client/echo';
import * as E from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { jsonSerializer } from './serializer';
import { serializers } from './serializers';
import { getSpaceProperty } from './space-properties';
import { FolderType } from '../schema';

// TODO(burdon): Why is this defined here?
export const TypeOfExpando = 'dxos.org/typename/expando';

export type SpaceMetadata = {
  name: string;
  version: number;
  timestamp: string;
  spaceKey: string;
};

export type SerializedObject =
  | {
      // Object.
      type: 'file';
      name: string;
      id: string;
      extension: string;
      typename: string;
      md5sum: string;
      content?: string;
    }
  | {
      // Folder.
      type: 'folder';
      name: string;
      id: string;
      children: SerializedObject[];
    };

export type SerializedSpace = {
  metadata: SpaceMetadata;
  objects: SerializedObject[];
};

export class ObjectSerializer {
  async serializeSpace(space: Space): Promise<SerializedSpace> {
    await space.waitUntilReady();

    const serializedSpace: SerializedSpace = {
      metadata: {
        name: space.properties.name ?? space.key.toHex(),
        version: 1,
        timestamp: new Date().toUTCString(),
        spaceKey: space.key.toHex(),
      },
      objects: [],
    };

    const spaceRoot = getSpaceProperty<FolderType>(space, FolderType.typename);
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    // Skip root folder.
    serializedSpace.objects.push(...(await this._serializeFolder(spaceRoot)).children);
    return serializedSpace;
  }

  async deserializeSpace(space: Space, serializedSpace: SerializedSpace): Promise<Space> {
    await space.waitUntilReady();

    const spaceRoot = getSpaceProperty<FolderType>(space, FolderType.typename);
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    await this._deserializeFolder(spaceRoot, serializedSpace.objects);
    await space.db.flush();
    return space;
  }

  private async _serializeFolder(folder: FolderType): Promise<SerializedObject & { type: 'folder' }> {
    const files: SerializedObject[] = [];
    for (const child of folder.objects) {
      if (!child) {
        continue;
      }

      if (child instanceof FolderType) {
        files.push(await this._serializeFolder(child));
        continue;
      }

      const schema = E.getSchema(child);
      if (!schema) {
        continue;
      }

      const typename = E.getEchoObjectAnnotation(schema)?.typename ?? TypeOfExpando;
      const serializer = serializers[typename] ?? jsonSerializer;

      const filename = serializer.filename(child);
      const content = await serializer.serialize(child, serializers);
      files.push({
        type: 'file',
        id: child.id,
        name: this._fixNamesCollisions(filename.name),
        extension: filename.extension,
        content,
        md5sum: md5(content),
        typename,
      });
    }

    return {
      type: 'folder',
      id: folder.id,
      // TODO(mykola): Use folder.name instead of folder.title.
      name: this._fixNamesCollisions(folder.name ?? (folder as any).title ?? 'New folder'),
      children: files,
    };
  }

  private async _deserializeFolder(folder: FolderType, data: SerializedObject[]): Promise<void> {
    for (const object of data) {
      try {
        let child = folder.objects.find((item) => item?.id === object.id);
        switch (object.type) {
          case 'folder': {
            if (!child) {
              child = E.object(FolderType, { name: object.name, objects: [] });

              // TODO(dmaretskyi): This won't work.
              // child[base]._id = object.id;
              folder.objects.push(child);
            }

            await this._deserializeFolder(child as FolderType, object.children);
            break;
          }
          case 'file': {
            const child = folder.objects.find((item) => item?.id === object.id);
            const serializer = serializers[object.typename] ?? serializers.default;
            const deserialized = await serializer.deserialize(object.content!, child, serializers);

            if (!child) {
              // TODO(dmaretskyi): This won't work.
              // deserialized[base]._id = object.id;
              folder.objects.push(deserialized);
            }
            break;
          }
        }
      } catch (err) {
        log.error('Failed to deserialize object.', { object });
      }
    }
  }

  private readonly _namesCount = new Map<string, number>();

  // TODO(burdon): Factor out.
  private _fixNamesCollisions = (name = 'untitled') => {
    if (this._namesCount.has(name)) {
      const count = this._namesCount.get(name)!;
      this._namesCount.set(name, count + 1);
      // TODO(burdon): Don't assume spaces?
      return `${name} (${count})`;
    } else {
      this._namesCount.set(name, 1);
      return name;
    }
  };
}
