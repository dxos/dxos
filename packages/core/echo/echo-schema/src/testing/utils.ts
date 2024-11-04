//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';

import { create } from '../handler';
import { toJsonSchema } from '../json';
import { MutableSchema, StoredSchema } from '../mutable';
import { type AbstractSchema } from '../object';
import { getTypeReference } from '../proxy';

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

// TODO(burdon): Move to util.
export const updateCounter = (touch: () => void) => {
  let updateCount = -1;
  const unsubscribe = effect(() => {
    touch();
    updateCount++;
  });

  return {
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: unsubscribe,
    get count() {
      return updateCount;
    },
  };
};
