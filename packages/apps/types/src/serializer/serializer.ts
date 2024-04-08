//
// Copyright 2024 DXOS.org
//

import { type ExpandoType, getAutomergeObjectCore, getTypeRef } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { createEchoReactiveObject } from '@dxos/echo-schema';

export type Filename = { name?: string; extension: string };

export interface TypedObjectSerializer {
  // TODO(burdon): Get filename from object.meta.keys.
  filename(object: ExpandoType): Filename;

  serialize(object: ExpandoType, serializers: SerializerMap): Promise<string>;

  /**
   * @param content
   * @param object Deserializing into an existing object. If not provided, a new object is created.
   * @param serializers
   */
  deserialize(content: string, object: ExpandoType | undefined, serializers: SerializerMap): Promise<ExpandoType>;
}

export type SerializerMap = Record<string, TypedObjectSerializer>;

export const validFilename = (title?: string) => title?.replace(/[^\w-_]/g, '_');

export const jsonSerializer: TypedObjectSerializer = {
  // TODO(burdon): Get name from schema.
  filename: (object) => {
    return {
      name: validFilename(object.filename ?? object.title ?? object.name),
      extension: 'json',
    };
  },

  // TODO(burdon): Should we assume Expando?
  serialize: async (object: ExpandoType) => {
    return JSON.stringify(object.toJSON(), null, 2);
  },

  deserialize: async (text: string, object?: ExpandoType) => {
    const { '@id': id, '@type': type, '@meta': meta, ...data } = JSON.parse(text);
    if (!object) {
      const deserializedObject = createEchoReactiveObject(
        E.object(Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@')))),
      );

      // TODO(burdon): Hack.
      E.getMeta(deserializedObject).keys = meta?.keys ?? E.getMeta(deserializedObject).keys;
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
