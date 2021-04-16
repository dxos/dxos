//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import protobufjs from 'protobufjs';

import { Substitutions } from './common';

export type MapingDescriptors = Partial<Record<string, (value: any, ...extraArgs: any) => any>>

export interface BidirectionalMapingDescriptors {
  encode: MapingDescriptors,
  decode: MapingDescriptors,
}

export function createMappingDescriptors (substitutions: Substitutions): BidirectionalMapingDescriptors {
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
}

export function mapMessage (type: protobufjs.Type, substitutions: MapingDescriptors, obj: any, extraArgs: any[]) {
  const res: any = {};
  for (const field of type.fieldsArray) {
    if (!(field.name in obj)) {
      continue;
    }
    res[field.name] = mapField(field, substitutions, obj[field.name], extraArgs);
  }
  return res;
}

export function mapField (field: protobufjs.Field, substitutions: MapingDescriptors, value: any, extraArgs: any[]) {
  if (!field.required && (value === null || value === undefined)) {
    return value;
  } else if (field.repeated) {
    return value.map((value: any) => mapScalarField(field, substitutions, value, extraArgs));
  } else if (field.map) {
    assert(field instanceof protobufjs.MapField);
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, value]) => [key, mapScalarField(field, substitutions, value, extraArgs)])
    );
  } else {
    return mapScalarField(field, substitutions, value, extraArgs);
  }
}

export function mapScalarField (field: protobufjs.Field, substitutions: MapingDescriptors, value: any, extraArgs: any[]) {
  if (!field.resolved) {
    field.resolve();
  }
  const substitution = field.resolvedType && substitutions[field.resolvedType.fullName.slice(1)];
  if (substitution) {
    return substitution(value, ...extraArgs); // TODO: handle recursive substitutions
  } else if (field.resolvedType && field.resolvedType instanceof protobufjs.Type) {
    return mapMessage(field.resolvedType, substitutions, value, extraArgs);
  } else {
    return value;
  }
}
