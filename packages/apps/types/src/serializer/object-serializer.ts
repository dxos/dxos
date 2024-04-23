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
import { Collection } from '../schema';

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
    const spaceRoot = getSpaceProperty<Collection>(space, Collection.typename);
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    // Skip root collection.
    const objects: SerializedObject[] = [];
    objects.push(...(await this._serializeFolder(spaceRoot)).children);
    return objects;
  }

  async deserializeObjects(space: Space, serializedSpace: SerializedSpace): Promise<Space> {
    const spaceRoot = getSpaceProperty<Collection>(space, Collection.typename);
    if (!spaceRoot) {
      throw new Error('No root folder.');
    }

    await this._deserializeFolder(spaceRoot, serializedSpace.objects);
    await space.db.flush();
    return space;
  }

  private async _serializeFolder(collection: Collection): Promise<SerializedObject & { type: 'folder' }> {
    const files: SerializedObject[] = [];
    for (const object of collection.objects) {
      if (!object) {
        continue;
      }

      if (object instanceof Collection) {
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
      id: collection.id,
      name: this._uniqueNames.unique(collection.name),
      children: files,
    };
  }

  private async _deserializeFolder(collection: Collection, data: SerializedObject[]): Promise<void> {
    for (const file of data) {
      try {
        let object = collection.objects.find((item) => item?.id === file.id);
        switch (file.type) {
          case 'folder': {
            if (!object) {
              object = create(Collection, { name: file.name, objects: [], views: {} });
              collection.objects.push(object);
            }

            await this._deserializeFolder(object as Collection, file.children);
            break;
          }

          case 'file': {
            const object = collection.objects.find((item) => item?.id === file.id);
            const serializer = serializers[file.typename] ?? serializers.default;
            const deserialized = await serializer.deserialize({
              content: file.content!,
              file,
              object,
              serializers,
            });

            if (!object) {
              collection.objects.push(deserialized);
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
