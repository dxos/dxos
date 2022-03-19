//
// Copyright 2021 DXOS.org
//

import { Enum, Type } from 'protobufjs';

import { InvalidConfigError } from './errors';
import { schema, ConfigObject } from './proto';

const configRootType = schema.getCodecForType('dxos.config.Config');

export function sanitizeConfig (value: any): ConfigObject {
  if (!('version' in value)) {
    throw new InvalidConfigError('Version not specified');
  }
  if (value?.version !== 1) {
    throw new InvalidConfigError(`Invalid config version: ${value.version}`);
  }

  // TODO(egorgripasov): Clean once old config deprecated.
  const ctx: Context = { errors: [] };
  visitMessage(configRootType.protoType, value, '', ctx);
  if (ctx.errors.length > 0) {
    throw new InvalidConfigError(ctx.errors.join('\n'));
  }

  const error = configRootType.protoType.verify(value);
  if (error) {
    throw new InvalidConfigError(error);
  }

  return value;
}

interface Context {
  errors: string[]
}

function visitMessage (type: Type, value: any, path: string, context: Context) {
  for (const key of Object.keys(value)) {
    if (!type.fields[key]) {
      context.errors.push(`Unexpected key: ${path}.${key}`);
      continue;
    }

    const field = type.fields[key];
    if (field.repeated) {
      continue; // TODO(marik-d): Implement.
    }

    field.resolve();
    if (!field.resolvedType) {
      continue;
    }
    if (field.resolvedType instanceof Type) {
      visitMessage(field.resolvedType, value[key], `${path}.${key}`, context);
    } else if (field.resolvedType instanceof Enum) {
      value[key] = sanitizeEnum(field.resolvedType, value[key], `${path}.${key}`, context);
    }
  }
}

function sanitizeEnum (type: Enum, value: any, path: string, context: Context): any {
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

  context.errors.push(`Invalid enum value: value=${JSON.stringify(value)} enum=${type.fullName} path=${path}`);

  return value;
}
