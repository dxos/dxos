//
// Copyright 2024 DXOS.org
//

import md5 from 'md5';

import { type Space } from '@dxos/client/echo';
import { create, getEchoObjectAnnotation, getSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { serializers } from './serializers';
import { getSpaceProperty } from './space-properties';
import { type SerializedObject, type SerializedSpace, TypeOfExpando } from './types';
import { UniqueNames } from './util';
import { FolderType } from '../schema';

export class ObjectSerializer {
  private readonly _uniqueNames = new UniqueNames();

  async serializeSpace(space: Space): Promise<SerializedSpace> {
    const metadata = {
      name: space.properties.name ?? space.key.toHex(),
      version: 1,
      timestamp: new Date().toISOString(),
      spaceKey: space.key.toHex(),
    };

    const objects = await this.serializeObjects(space);

    return {
      metadata,
      objects,
    };
  }

  async serializeObjects(space: Space): Promise<SerializedObject[]> {
    const spaceRoot = getSpaceProperty<FolderType>(space, FolderType.typename);
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    // Skip root folder.
    const objects: SerializedObject[] = [];
    objects.push(...(await this._serializeFolder(spaceRoot)).children);
    return objects;
  }

  async deserializeObjects(space: Space, serializedSpace: SerializedSpace): Promise<Space> {
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
    for (const object of folder.objects) {
      if (!object) {
        continue;
      }

      if (object instanceof FolderType) {
        files.push(await this._serializeFolder(object));
        continue;
      }

      const schema = getSchema(object);
      if (!schema) {
        continue;
      }

      const typename = getEchoObjectAnnotation(schema)?.typename ?? TypeOfExpando;
      const serializer = serializers[typename] ?? serializers.default;

      const filename = serializer.filename(object);
      const content = await serializer.serialize({ object, serializers });
      files.push({
        type: 'file',
        id: object.id,
        // TODO(burdon): Extension is part of name.
        name: this._uniqueNames.unique(filename.name),
        extension: filename.extension,
        // TODO(wittjosiah): Content probably doesn't need to be in metadata.
        content,
        md5sum: md5(content),
        typename,
      });
    }

    return {
      type: 'folder',
      id: folder.id,
      // TODO(mykola): Use folder.name instead of folder.title.
      name: this._uniqueNames.unique(folder.name ?? (folder as any).title),
      children: files,
    };
  }

  private async _deserializeFolder(folder: FolderType, data: SerializedObject[]): Promise<void> {
    for (const file of data) {
      try {
        let child = folder.objects.find((item) => item?.id === file.id);
        switch (file.type) {
          case 'folder': {
            if (!child) {
              child = create(FolderType, { name: file.name, objects: [] });
              folder.objects.push(child);
            }

            await this._deserializeFolder(child as FolderType, file.children);
            break;
          }

          case 'file': {
            const object = folder.objects.find((item) => item?.id === file.id);
            const serializer = serializers[file.typename] ?? serializers.default;
            const deserialized = await serializer.deserialize({
              content: file.content!,
              file,
              object,
              serializers,
            });

            if (!object) {
              folder.objects.push(deserialized);
            }
            break;
          }
        }
      } catch (err) {
        log.catch(err);
      }
    }
  }
}
