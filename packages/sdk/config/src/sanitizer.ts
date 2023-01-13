//
// Copyright 2021 DXOS.org
//

import { sanitize, SanitizeContext } from '@dxos/codec-protobuf';
import { InvalidConfigError } from '@dxos/errors';
import { schema } from '@dxos/protocols';
import { Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';

const configRootType = schema.getCodecForType('dxos.config.Config');

/**
 * Validate config object.
 * @deprecated
 */
// TODO(burdon): Remove?
export const sanitizeConfig = (config: ConfigProto): ConfigProto => {
  if (!('version' in config)) {
    throw new InvalidConfigError('Version not specified');
  }
  if (config?.version !== 1) {
    throw new InvalidConfigError(`Invalid config version: ${config.version}`);
  }

  // TODO(egorgripasov): Clean once old config deprecated.
  const ctx: SanitizeContext = { errors: [] };
  sanitize(configRootType.protoType, config, '', ctx);
  if (ctx.errors.length > 0) {
    throw new InvalidConfigError(ctx.errors.join('\n'));
  }

  const error = configRootType.protoType.verify(config);
  if (error) {
    throw new InvalidConfigError(error);
  }

  return config;
};
