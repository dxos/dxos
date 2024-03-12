//
// Copyright 2024 DXOS.org
//

import md5 from 'md5';

import * as E from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type Space, base } from '@dxos/react-client/echo';

import { serializers } from './serializers';
import { FolderSchema, type FolderType } from '../types';

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

    const spaceRoot = space.properties[E.getEchoObjectAnnotation(FolderSchema)!.typename];
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    // Skip root folder.
    serializedSpace.data.push(...(await this._serializeFolder(spaceRoot)).children);

    return serializedSpace;
  }

  async deserializeSpace(space: Space, serializedSpace: SerializedSpace): Promise<Space> {
    await space.waitUntilReady();

    const spaceRoot = space.properties[E.getEchoObjectAnnotation(FolderSchema)!.typename];
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }
    await this._deserializeFolder(spaceRoot, serializedSpace.data);

    await space.db.flush();
    return space;
  }

  private async _serializeFolder(folder: FolderType): Promise<SerializedObject & { type: 'folder' }> {
    const files: SerializedObject[] = [];

    for (const child of folder.objects) {
      if (isFolder(child)) {
        files.push(await this._serializeFolder(child));
        continue;
      }

      if (!child.__typename) {
        continue;
      }

      const serializer = serializers[child.__typename] ?? serializers.default;
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

  private async _deserializeFolder(folder: FolderType, data: SerializedObject[]): Promise<void> {
    for (const object of data) {
      try {
        let child = folder.objects.find((item) => item.id === object.id);
        switch (object.type) {
          case 'folder': {
            if (!child) {
              child = E.object(FolderSchema, { name: object.name });
              child[base]._id = object.id;
              folder.objects.push(child);
            }

            await this._deserializeFolder(child as FolderType, object.children);
            break;
          }
          case 'file': {
            const child = folder.objects.find((item) => item.id === object.id);
            const serializer = serializers[object.typename] ?? serializers.default;
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
