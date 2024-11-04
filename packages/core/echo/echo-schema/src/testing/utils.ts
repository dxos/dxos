//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import { type S } from '@dxos/effect';

import { create } from '../handler';
import { toJsonSchema } from '../json';
import { MutableSchema, StoredSchema } from '../mutable';
import { getTypeReference } from '../proxy';

registerSignalsRuntime();

/**
 * Create a reactive mutable schema that updates when the JSON schema is updated.
 */
export const createMutableSchema = (schema: S.Schema<any>): MutableSchema => {
  const mutableSchema = new MutableSchema(
    create(StoredSchema, {
      typename: getTypeReference(schema)!.objectId,
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

export const updateCounter = (touch: () => void) => {
  let updateCount = -1;
  const clear = effect(() => {
    touch();
    updateCount++;
  });

  return {
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: clear,
    get count() {
      return updateCount;
    },
  };
};
