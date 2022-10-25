//
// Copyright 2022 DXOS.org
//

import { Enum, Type } from 'protobufjs';

export interface SanitizeContext {
  errors: string[];
}

/**
 * Sanitiaze all enum fields in object based on protobuf type.
 * @param type
 * @param value
 * @param path
 * @param context
 */
export const sanitize = (
  type: Type,
  value: any,
  path: string,
  context: SanitizeContext
) => {
  for (const key of Object.keys(value)) {
    if (!type.fields[key]) {
      context.errors.push(`Unexpected key: ${path}.${key}`);
      continue;
    }

    const field = type.fields[key];
    if (field.repeated) {
      continue; // TODO(dmaretskyi): Implement.
    }

    field.resolve();
    if (!field.resolvedType) {
      continue;
    }
    if (field.resolvedType instanceof Type) {
      sanitize(field.resolvedType, value[key], `${path}.${key}`, context);
    } else if (field.resolvedType instanceof Enum) {
      value[key] = sanitizeEnum(
        field.resolvedType,
        value[key],
        `${path}.${key}`,
        context
      );
    }
  }
};

const sanitizeEnum = (
  type: Enum,
  value: any,
  path: string,
  context: SanitizeContext
): any => {
  if (type.valuesById[value]) {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.toLowerCase();
    for (const [name, tag] of Object.entries(type.values)) {
      if (name.toLowerCase() === normalizedValue) {
        return tag;
      }
    }
  }

  context.errors.push(
    `Invalid enum value: value=${JSON.stringify(value)} enum=${
      type.fullName
    } path=${path}`
  );

  return value;
};
