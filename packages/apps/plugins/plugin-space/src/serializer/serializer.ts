//
// Copyright 2024 DXOS.org
//

import md5 from 'md5';

import { Folder } from '@braneframe/types';
import { invariant } from '@dxos/invariant';
import { TypedObject, type Space } from '@dxos/react-client/echo';

import { serializers } from './object-serializers';

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

export class Serializer {
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

  async deserializeSpace(space: Space, serializedSpace: SerializedSpace): Promise<void> {
    await space.waitUntilReady();

    const spaceRoot = space.properties[Folder.schema.typename];
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    const objects: TypedObject[] = [];
    for (const file of serializedSpace.data) {
      if (file.type === 'folder') {
        objects.push(await this._deserializeFolder(file));
        continue;
      }

      if (file.content) {
        const serializer = serializers[file.typename] ?? this.defaultSerializer;
        const object = await serializer.deserialize(file.content);
        objects.push(object);
      }
    }
    spaceRoot.objects = objects;
    await space.db.flush();
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
      name: this._fixNamesCollisions(folder.name ?? 'New folder'),
      children: files,
    };
  }

  private async _deserializeFolder(file: SerializedObject): Promise<TypedObject> {
    invariant(file.type === 'folder', `Invalid file type: ${file.type}`);
    throw new Error('Not implemented.');
  }

  /**
   * Default serializer.
   */
  private defaultSerializer = {
    filename: () => ({ name: 'Untitled', extension: 'json' }),
    serialize: async (object: TypedObject) => JSON.stringify(object.toJSON(), null, 2),
    deserialize: async (text: string) => new TypedObject(JSON.parse(text)),
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
