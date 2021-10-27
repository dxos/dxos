//
// Copyright 2021 DXOS.org
//

import { Type } from 'protobufjs';

import { schema } from './proto/gen';
import { Config as ConfigObject } from './proto/gen/dxos/config';

export type { ConfigObject };

const configRootType = schema.getCodecForType('dxos.config.Config');

export function sanitizeConfig (value: any): ConfigObject {
  const error = configRootType.protoType.verify(value);
  if (error) {
    console.warn(`Invalid config: ${error}`);
  }

  const ctx: Context = { errors: [] };
  visitMessage(configRootType.protoType, value, '', ctx);
  if (ctx.errors.length > 0) {
    console.warn(`Invalid config:\n${ctx.errors.join('\n')}`);
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
    if (!field.resolvedType || !(field.resolvedType instanceof Type)) {
      continue;
    }
    visitMessage(field.resolvedType, value[key], `${path}.${key}`, context);
  }
}
