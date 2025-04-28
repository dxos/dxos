//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { type Schema as S } from 'effect';

import { EchoSchema, getSchemaTypename, StoredSchema, toJsonSchema } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { assertArgument } from '@dxos/invariant';

import { live } from '../object';

// NOTE: Registration is done here is this is the module that calls out to `effect`.
registerSignalsRuntime();

/**
 * Create a reactive mutable schema that updates when the JSON schema is updated.
 */
// TODO(dmaretskyi): Should be replaced by registration of typed object.
export const createEchoSchema = (schema: S.Schema.AnyNoContext): EchoSchema => {
  const typename = getSchemaTypename(schema);
  assertArgument(typename, 'Schema does not have a typename.');

  const echoSchema = new EchoSchema(
    live(StoredSchema, {
      typename,
      version: '0.1.0',
      jsonSchema: toJsonSchema(schema),
    }),
  );

  effect(() => {
    const _ = echoSchema.jsonSchema;
    echoSchema._invalidate();
  });

  return echoSchema;
};
