//
// Copyright 2025 DXOS.org
//

export type StructId = string;

/**
 * Present on structs to denote the type of the struct.
 */
export const StructTypeProperty = '@type';

interface StructSerializer<T> {
  typeId: StructId;
  serialize: (value: T) => unknown;
  deserialize: (value: unknown) => T;
}

export const registerSerializer = <T>(prototype: T, serializer: StructSerializer<T>) => {
  if (typeof prototype === 'function') {
    throw new TypeError('Prototype cannot be a function. Use `Class.prototype` when registering a serializer.');
  }

  const typeId = serializer.typeId;
  if (typeof typeId !== 'string') {
    throw new TypeError('[Struct.StructId] must be a string');
  }

  if (serializersById.has(typeId)) {
    throw new Error(`Struct serializer already registered: ${typeId}`);
  }

  if (serializers.has(prototype)) {
    throw new Error('Struct serializer already registered.');
  }

  serializers.set(prototype, serializer);
  serializersById.set(typeId, serializer);
};

const serializers = new Map<unknown, StructSerializer<any>>();
const serializersById = new Map<StructId, StructSerializer<any>>();

/**
 * Converts a value to a plain object.
 * Runs registered serializers for objects with custom prototypes.
 *
 * @param value - The value to convert.
 * @returns A plain object.
 * @throws {TypeError} If the value is a non-plain object without a registered serializer.
 */
export const serialize = (value: unknown): unknown => {
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    const serializer = serializers.get(proto);

    if (serializer) {
      const struct = serializer.serialize(value);
      if (typeof struct !== 'object' || struct === null || Object.getPrototypeOf(struct) !== Object.prototype) {
        throw new TypeError('Serializer must return a plain object');
      }

      return Object.assign(
        {
          [StructTypeProperty]: serializer.typeId,
        },
        struct,
      );
    }

    if (proto !== undefined && proto !== Object.prototype && proto !== Array.prototype) {
      throw new TypeError('Encountered a non-plain object without registered serializer');
    }

    if (Array.isArray(value)) {
      return value.map(serialize);
    }

    const res: any = {};
    for (const key in value) {
      res[key] = serialize((value as any)[key]);
    }

    return res;
  }

  return value;
};

/**
 * Converts a plain object to a value.
 * Runs registered deserializers for objects with type ids.
 *
 * @param value - The plain object to convert.
 * @returns A value.
 * @throws {TypeError} When encountering a type id that is not registered.
 */
export const deserialize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(deserialize);
  }

  if (typeof value === 'object' && value !== null) {
    if (StructTypeProperty in value) {
      const type = value[StructTypeProperty];
      if (typeof type !== 'string') {
        throw new TypeError('Struct type property ("@type") must be a string');
      }

      const serializer = serializersById.get(type);
      if (!serializer) {
        throw new TypeError(`Unknown struct type: ${type}`);
      }

      return serializer.deserialize(value);
    }

    const res: any = {};
    for (const key in value) {
      res[key] = deserialize((value as any)[key]);
    }

    return res;
  }

  return value;
};
