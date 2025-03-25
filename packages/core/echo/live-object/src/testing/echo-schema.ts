//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { effect } from '@preact/signals-core';

import { EchoSchema, getSchemaTypename, StoredSchema, toJsonSchema, type TypedObject } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { assertArgument } from '@dxos/invariant';

import { create } from '../object';

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
    create(StoredSchema, {
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
