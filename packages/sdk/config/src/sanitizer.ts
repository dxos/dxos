//
// Copyright 2021 DXOS.org
//

import { schema } from './proto/gen';
import { Config as ConfigObject } from './proto/gen/dxos/config';

export type { ConfigObject };

const configRootType = schema.getCodecForType('dxos.config.Config');

export function sanitizeConfig (value: any): ConfigObject {
  const error = configRootType.protoType.verify(value);
  if (error) {
    console.warn(`Invalid config: ${error}`);
  }

  return value;
}
