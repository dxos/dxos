//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { MutableSchema, StoredSchema, toJsonSchema, type AbstractSchema } from '@dxos/echo-schema';
import { getTypeReference } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';

import { create } from '../object';

registerSignalsRuntime();

/**
 * Create a reactive mutable schema that updates when the JSON schema is updated.
 */
export const createMutableSchema = (schema: AbstractSchema): MutableSchema => {
  const typeReference = getTypeReference(schema);
  invariant(typeReference, 'Type reference not found.');

  const mutableSchema = new MutableSchema(
    create(StoredSchema, {
      typename: typeReference.objectId,
      version: '0.1.0',
      jsonSchema: toJsonSchema(schema),
    }),
  );

  effect(() => {
    const _ = mutableSchema.jsonSchema;
    mutableSchema.invalidate();
  });

  return mutableSchema;
};
