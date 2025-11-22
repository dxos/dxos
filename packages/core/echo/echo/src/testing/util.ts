//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import { assertArgument } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import { EchoSchema, StoredSchema, getSchemaTypename, makeObject, toJsonSchema } from '../internal';

registerSignalsRuntime();

/**
 * Create a reactive mutable schema that updates when the JSON schema is updated.
 */
// TODO(dmaretskyi): Should be replaced by registration of typed object.
export const createEchoSchema = (schema: Schema.Schema.AnyNoContext, version = '0.1.0'): EchoSchema => {
  const jsonSchema = toJsonSchema(schema);
  const typename = getSchemaTypename(schema);
  assertArgument(typename, 'typename', 'Schema does not have a typename.');
  const echoSchema = new EchoSchema(makeObject(StoredSchema, { typename, version, jsonSchema }));

  // TODO(burdon): Unsubscribe is never called.
  effect(() => {
    const _ = echoSchema.jsonSchema;
    echoSchema._invalidate();
  });

  return echoSchema;
};

/**
 * Converts AST to a format that can be compared with test matchers.
 */
export const prepareAstForCompare = (obj: SchemaAST.AST): any =>
  deepMapValues(obj, (value: any, recurse: any) => {
    if (typeof value === 'function') {
      return null;
    }

    if (value instanceof RegExp) {
      return value;
    }

    // Convert symbols to strings.
    if (typeof value === 'object') {
      const clone = { ...value };
      for (const sym of Object.getOwnPropertySymbols(clone as any)) {
        clone[sym.toString()] = clone[sym];
        delete clone[sym];
      }

      return recurse(clone);
    }

    return recurse(value);
  });

// TODO(burdon): Use @dxos/util.
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
