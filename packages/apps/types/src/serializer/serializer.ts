//
// Copyright 2024 DXOS.org
//

import { type Expando, getAutomergeObjectCore, getMeta, getTypeRef } from '@dxos/echo-schema';
import { createEchoReactiveObject, create } from '@dxos/echo-schema';

export type Filename = { name?: string; extension: string };

export interface TypedObjectSerializer {
  // TODO(burdon): Get filename from object.meta.keys.
  filename(object: Expando): Filename;

  serialize(object: Expando, serializers: SerializerMap): Promise<string>;

  /**
   * @param content
   * @param object Deserializing into an existing object. If not provided, a new object is created.
   * @param serializers
   */
  deserialize(content: string, object: Expando | undefined, serializers: SerializerMap): Promise<Expando>;
}

export type SerializerMap = Record<string, TypedObjectSerializer>;

export const validFilename = (title?: string) => title?.replace(/[^\w-_]/g, '_');

export const jsonSerializer: TypedObjectSerializer = {
  // TODO(burdon): Get name field from schema.
  filename: (object) => {
    return {
      name: validFilename(object.filename ?? object.title ?? object.name),
      extension: 'json',
    };
  },

  // TODO(burdon): Should we assume Expando?
  serialize: async (object: Expando) => {
    return JSON.stringify(object.toJSON(), null, 2);
  },

  deserialize: async (text: string, object?: Expando) => {
    const { '@id': id, '@type': type, '@meta': meta, ...data } = JSON.parse(text);
    if (!object) {
      const deserializedObject = createEchoReactiveObject(
        // TODO(burdon): Move to ECHO? Remove test for '@' properties.
        create(Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@')))),
      );

      // TODO(burdon): Should be immutable?
      getMeta(deserializedObject).keys = meta?.keys ?? getMeta(deserializedObject).keys;
      const core = getAutomergeObjectCore(deserializedObject);
      core.id = id;
      const typeRef = getTypeRef(type);
      if (typeRef) {
        core.setType(typeRef);
      }

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
