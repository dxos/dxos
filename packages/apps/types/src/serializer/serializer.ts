//
// Copyright 2024 DXOS.org
//

import { Expando, getAutomergeObjectCore, getTypeRef, type ReactiveObject } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { createEchoReactiveObject } from '@dxos/echo-schema';

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
    const parsed = JSON.parse(text);
    if (!object) {
      return deserializeEchoObject(parsed);
    } else {
      const { '@id': _, '@type': __, '@meta': ___, ...data } = parsed;
      Object.entries(data)
        .filter(([key]) => !key.startsWith('@'))
        .forEach(([key, value]: any) => {
          object[key] = isSerializedEchoObject(value) ? deserializeEchoObject(value) : value;
        });
      return object;
    }
  },
};

const deserializeEchoObject = (parsed: any): Expando => {
  const { '@id': id, '@type': type, '@meta': meta, ...data } = parsed;
  const entries = Object.entries(data)
    .filter(([key]) => !key.startsWith('@'))
    .map(([key, value]) => {
      if (isSerializedEchoObject(value)) {
        return [key, deserializeEchoObject(value)];
      }
      return [key, value];
    });

  const deserializedObject: ReactiveObject<Expando> = createEchoReactiveObject(
    // TODO(burdon): Move to ECHO? Remove test for '@' properties.
    E.object(Expando, Object.fromEntries(entries)),
  );

  // TODO(burdon): Should be immutable?
  E.getMeta(deserializedObject).keys = meta?.keys ?? E.getMeta(deserializedObject).keys;
  const core = getAutomergeObjectCore(deserializedObject);
  core.id = id;
  const typeRef = getTypeRef(type);
  if (typeRef) {
    core.setType(typeRef);
  }

  return deserializedObject;
};

const isSerializedEchoObject = (value: any): boolean => {
  return value != null && typeof value === 'object' && '@id' in value;
};
