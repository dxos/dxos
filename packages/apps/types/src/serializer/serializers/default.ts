//
// Copyright 2024 DXOS.org
//

import { createEchoObject, getObjectCore, getMeta, getTypeRef } from '@dxos/client/echo';
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
   */
  deserialize(params: { content: string; file?: SerializedObject; object?: T; serializers: SerializerMap }): Promise<T>;
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

  deserialize: async ({ content, object }) => {
    const parsed = JSON.parse(content);
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

  const deserializedObject: ReactiveObject<Expando> = createEchoObject(
    // TODO(burdon): Move to ECHO? Remove test for '@' properties.
    create(Expando, Object.fromEntries(entries)),
  );

  const core = getObjectCore(deserializedObject);
  core.id = id;
  getMeta(core).keys.push(...(meta?.keys ?? []));
  const typeRef = getTypeRef(type);
  if (typeRef) {
    core.setType(typeRef);
  }

  return deserializedObject;
};

const isSerializedEchoObject = (value: any): boolean => {
  return value != null && typeof value === 'object' && '@id' in value;
};
