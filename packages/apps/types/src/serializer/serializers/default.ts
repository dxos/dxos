//
// Copyright 2024 DXOS.org
//

import { createEchoObject, getObjectCore, getMeta, internalDecodeReference } from '@dxos/client/echo';
import { create, Expando, type ReactiveObject } from '@dxos/echo-schema';

import { type SerializedObject } from '../types';

export type Filename = { name?: string; extension: string };

export interface TypedObjectSerializer<T extends Expando = Expando> {
  // TODO(burdon): Get filename from object.meta.keys.
  filename(object: Expando): Filename;

  serialize(params: { object: T; serializers: SerializerMap }): Promise<string>;

  /**
   * @param params.content
   * @param params.object Deserializing into an existing object. If not provided, a new object is created.
   * @param params.file File metadata.
   * @param params.serializers
   * @param params.newId Generate new ID for deserialized object.
   */
  deserialize(params: {
    content: string;
    file?: SerializedObject;
    object?: T;
    newId?: boolean;
    serializers: SerializerMap;
  }): Promise<T>;
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
  serialize: async ({ object }) => {
    return JSON.stringify(object.toJSON(), null, 2);
  },

  deserialize: async ({ content, object, newId }) => {
    const parsed = JSON.parse(content);
    if (!object) {
      return deserializeEchoObject(parsed, newId);
    } else {
      const { '@id': _, '@type': __, '@meta': ___, ...data } = parsed;
      Object.entries(data)
        .filter(([key]) => !key.startsWith('@'))
        .forEach(([key, value]: any) => {
          object[key] = isSerializedEchoObject(value) ? deserializeEchoObject(value, newId) : value;
        });
      return object;
    }
  },
};

const deserializeEchoObject = (parsed: any, newId?: boolean): Expando => {
  const { '@id': id, '@type': type, '@meta': meta, ...data } = parsed;
  const entries = Object.entries(data)
    .filter(([key]) => !key.startsWith('@'))
    .map(([key, value]) => {
      if (isSerializedEchoObject(value)) {
        return [key, deserializeEchoObject(value, newId)];
      }

      return [key, value];
    });

  const deserializedObject: ReactiveObject<Expando> = createEchoObject(
    // TODO(burdon): Move to ECHO? Remove test for '@' properties.
    create(Expando, Object.fromEntries(entries)),
  );

  const core = getObjectCore(deserializedObject);
  if (!newId) {
    core.id = id;
  }
  getMeta(deserializedObject).keys.push(...(meta?.keys ?? []));
  // TODO(dmaretskyi): Remove usage of this internal method.
  const typeRef = internalDecodeReference(type);
  if (typeRef) {
    core.setType(typeRef);
  }

  return deserializedObject;
};

const isSerializedEchoObject = (value: any): boolean => {
  return value != null && typeof value === 'object' && '@id' in value;
};
