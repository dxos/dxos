//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import protobufjs from 'protobufjs';

// This code is an async version of the code copied over from @dxos/codec-protobuf.

export type FieldMapper = (value: any, typeName: string) => Promise<any>;

export async function mapMessage (type: protobufjs.Type, mapper: FieldMapper, obj: any) {
  const res: any = {};
  for (const field of type.fieldsArray) {
    if (!(field.name in obj)) {
      continue;
    }
    res[field.name] = await mapField(field, mapper, obj[field.name]);
  }
  return res;
}

async function mapField (field: protobufjs.Field, mapper: FieldMapper, value: any) {
  if (!field.required && (value === null || value === undefined)) {
    return value;
  } else if (field.repeated) {
    return await Promise.all(value.map((value: any) => mapScalarField(field, mapper, value)));
  } else if (field.map) {
    assert(field instanceof protobufjs.MapField);
    return await asyncObjectMap((value) => mapScalarField(field, mapper, value), value);
  } else {
    return mapScalarField(field, mapper, value);
  }
}

async function mapScalarField (field: protobufjs.Field, mapper: FieldMapper, value: any) {
  if (!field.resolved) {
    field.resolve();
  }

  const typeName = field.resolvedType?.fullName.slice(1); // Name of the protobuf message type if the field type is not primitive.
  if (typeName) {
    return await mapper(value, typeName);
  }

  if (field.resolvedType && field.resolvedType instanceof protobufjs.Type) {
    return await mapMessage(field.resolvedType, mapper, value);
  }

  return value;
}

async function asyncObjectMap<K extends keyof any, T, U> (map: (value: T, key: K) => Promise<U>, record: Record<K, T>): Promise<Record<K, U>> {
  const res: Record<K, U> = {} as any;

  await Promise.all(Object.entries(record).map(async ([key, value]) => {
    res[key] = await map(value as T, key as K);
  }));

  return res;
}
