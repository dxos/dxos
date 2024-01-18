//
// Copyright 2024 DXOS.org
//

import md5 from 'md5';

import { Folder } from '@braneframe/types';
import { getTypeRef } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { TypedObject, type Space, base } from '@dxos/react-client/echo';

import { type TypedObjectSerializer, serializers } from './serializers';

export const TypeOfExpando = 'dxos.org/typename/expando';

export type SpaceMetadata = {
  name: string;
  version: number;
  timestamp: string;
  spaceKey: string;
};

export type SerializedObject =
  | {
      type: 'file';
      name: string;
      id: string;
      extension: string;
      typename: string;
      content?: string;
      md5sum: string;
    }
  | { type: 'folder'; name: string; children: SerializedObject[]; id: string };

export type SerializedSpace = {
  metadata: SpaceMetadata;
  data: SerializedObject[];
};

export class FileSerializer {
  async serializeSpace(space: Space): Promise<SerializedSpace> {
    await space.waitUntilReady();

    const serializedSpace: SerializedSpace = {
      metadata: {
        name: space.properties.name ?? space.key.toHex(),
        version: 1,
        timestamp: new Date().toUTCString(),
        spaceKey: space.key.toHex(),
      },
      data: [],
    };

    const spaceRoot = space.properties[Folder.schema.typename];
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    // Skip root folder.
    serializedSpace.data.push(...(await this._serializeFolder(spaceRoot)).children);

    return serializedSpace;
  }

  async deserializeSpace(space: Space, serializedSpace: SerializedSpace): Promise<Space> {
    await space.waitUntilReady();

    const spaceRoot = space.properties[Folder.schema.typename];
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }
    await this._deserializeFolder(spaceRoot, serializedSpace.data);

    await space.db.flush();
    return space;
  }

  private async _serializeFolder(folder: Folder): Promise<SerializedObject & { type: 'folder' }> {
    const files: SerializedObject[] = [];

    for (const child of folder.objects) {
      if (child instanceof Folder) {
        files.push(await this._serializeFolder(child));
        continue;
      }

      if (!child.__typename) {
        continue;
      }

      const serializer = serializers[child.__typename] ?? this.defaultSerializer;
      const typename = child.__typename ?? TypeOfExpando;

      const filename = serializer.filename(child);
      const content = await serializer.serialize(child);
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
      name: this._fixNamesCollisions((folder as any).title ?? 'New folder'),
      children: files,
    };
  }

  private async _deserializeFolder(folder: Folder, data: SerializedObject[]): Promise<void> {
    for (const object of data) {
      try {
        let child = folder.objects.find((item) => item.id === object.id);
        switch (object.type) {
          case 'folder': {
            if (!child) {
              child = new Folder({ name: object.name });
              child[base]._id = object.id;
              folder.objects.push(child);
            }

            await this._deserializeFolder(child as Folder, object.children);
            break;
          }
          case 'file': {
            const child = folder.objects.find((item) => item.id === object.id);
            const serializer = serializers[object.typename] ?? this.defaultSerializer;
            const deserialized = await serializer.deserialize(object.content!, child);

            if (!child) {
              deserialized[base]._id = object.id;
              folder.objects.push(deserialized);
            }
            break;
          }
        }
      } catch (err) {
        log.error('Failed to deserialize object:', object);
      }
    }
  }

  /**
   * Default serializer.
   */
  private defaultSerializer: TypedObjectSerializer = {
    filename: () => ({ name: 'Untitled', extension: 'json' }),
    serialize: async (object: TypedObject) => JSON.stringify(object.toJSON(), null, 2),
    deserialize: async (text: string, object?: TypedObject) => {
      const { '@id': id, '@type': type, '@meta': meta, ...data } = JSON.parse(text);
      if (!object) {
        const deserializedObject = new TypedObject(
          Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@'))),
          {
            meta,
            type: getTypeRef(type),
          },
        );
        deserializedObject[base]._id = id;
        return deserializedObject;
      } else {
        Object.entries(data)
          .filter(([key]) => !key.startsWith('@'))
          .forEach(([key, value]: any) => {
            object[key] = value;
          });
        return object;
      }
    },
  };

  private readonly _namesCount = new Map<string, number>();
  private _fixNamesCollisions = (name = 'Untitled') => {
    if (this._namesCount.has(name)) {
      const count = this._namesCount.get(name)!;
      this._namesCount.set(name, count + 1);
      return `${name} (${count})`;
    } else {
      this._namesCount.set(name, 1);
      return name;
    }
  };
}
