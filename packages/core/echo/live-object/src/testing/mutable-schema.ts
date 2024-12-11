//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { EchoSchema, StoredSchema, toJsonSchema, type AbstractSchema } from '@dxos/echo-schema';
import { getTypeReference } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';

import { create } from '../object';

// NOTE: Registration is done here is this is the module that calls out to `effect`.
registerSignalsRuntime();

/**
 * Create a reactive mutable schema that updates when the JSON schema is updated.
 */
export const createEchoSchema = (schema: AbstractSchema): EchoSchema => {
  const typeReference = getTypeReference(schema);
  invariant(typeReference, 'Type reference not found.');

  const mutableSchema = new EchoSchema(
    create(StoredSchema, {
      typename: typeReference.objectId,
      version: '0.1.0',
      jsonSchema: toJsonSchema(schema),
    }),
  );

  effect(() => {
    const _ = mutableSchema.jsonSchema;
    mutableSchema._invalidate();
  });

  return mutableSchema;
};
