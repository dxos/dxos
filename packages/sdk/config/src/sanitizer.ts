//
// Copyright 2021 DXOS.org
//

import { Enum, Type } from 'protobufjs';

import { schema } from './proto/gen';
import { Config as ConfigObject } from './proto/gen/dxos/config';
import { Config as ConfigV1Object } from './proto/gen/dxos/configv1';

export type { ConfigObject, ConfigV1Object };

const configRootType = schema.getCodecForType('dxos.config.Config');
const configV1RootType = schema.getCodecForType('dxos.configv1.Config');

export function sanitizeConfig (value: any): ConfigObject | ConfigV1Object {
  // TODO(egorgripasov): Clean once old config deprecated.
  const confRootType = value?.version === 1 ? configV1RootType : configRootType;

  const ctx: Context = { errors: [] };
  visitMessage(confRootType.protoType, value, '', ctx);
  if (ctx.errors.length > 0) {
    console.warn(`Invalid config:\n${ctx.errors.join('\n')}`);
  }

  const error = confRootType.protoType.verify(value);
  if (error) {
    console.warn(`Invalid config: ${error}`);
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
