//
// Copyright 2021 DXOS.org
//

import { sanitize, SanitizeContext } from '@dxos/codec-protobuf';
import { schema } from '@dxos/protocols';
import { Config as ConfigType } from '@dxos/protocols/proto/dxos/config';

import { InvalidConfigError } from './errors';

const configRootType = schema.getCodecForType('dxos.config.Config');

export const sanitizeConfig = (value: any): ConfigType => {
  if (!('version' in value)) {
    throw new InvalidConfigError('Version not specified');
  }
  if (value?.version !== 1) {
    throw new InvalidConfigError(`Invalid config version: ${value.version}`);
  }

  // TODO(egorgripasov): Clean once old config deprecated.
  const ctx: SanitizeContext = { errors: [] };
  sanitize(configRootType.protoType, value, '', ctx);
  if (ctx.errors.length > 0) {
    throw new InvalidConfigError(ctx.errors.join('\n'));
  }

  const error = configRootType.protoType.verify(value);
  if (error) {
    throw new InvalidConfigError(error);
  }

  return value;
};
