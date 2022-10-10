//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import { default as protobufjs } from 'protobufjs';

import { Substitutions } from './common.js';

export type MapingDescriptors = Partial<Record<string, (value: any, ...extraArgs: any) => any>>

export interface BidirectionalMapingDescriptors {
  encode: MapingDescriptors
  decode: MapingDescriptors
}

export const createMappingDescriptors = (substitutions: Substitutions): BidirectionalMapingDescriptors => {
  const encode: MapingDescriptors = {};
  const decode: MapingDescriptors = {};
  for (const type of Object.keys(substitutions)) {
    encode[type] = substitutions[type].encode;
    decode[type] = substitutions[type].decode;
  }
  return {
    encode,
    decode
  };
};

export type FieldMapper = (value: any, typeName: string) => Promise<any>;

export const mapMessage = async (type: protobufjs.Type, mapper: FieldMapper, obj: any) => {
  const res: any = {};
  for (const field of type.fieldsArray) {
    if (!(field.name in obj)) {
      continue;
    }
    res[field.name] = await mapField(field, mapper, obj[field.name]);
  }

  return res;
};

const mapField = async (field: protobufjs.Field, mapper: FieldMapper, value: any) => {
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
};

const mapScalarField = async (field: protobufjs.Field, mapper: FieldMapper, value: any) => {
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
};

const asyncObjectMap = async <K extends keyof any, T, U>(
  map: (value: T, key: K) => Promise<U>,
  record: Record<K, T>
): Promise<Record<K, U>> => {
  const res: Record<K, U> = {} as any;

  await Promise.all(Object.entries(record).map(async ([key, value]) => {
    res[key as keyof typeof res] = await map(value as T, key as K);
  }));

  return res;
};
