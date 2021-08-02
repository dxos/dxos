
//
// Copyright 2021 DXOS.org
//

import Ajv from 'ajv';

import { InvalidConfigError } from './errors';
import schema from './schema.json';

const ajv = new Ajv();

const validateSchema = ajv.compile(schema);

export function validateConfig (config: unknown) {
  if (!validateSchema(config)) {
    throw new InvalidConfigError(ajv.errorsText(validateSchema.errors));
  }
}
