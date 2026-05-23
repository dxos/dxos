//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';

import { assertArgument } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import { PersistentSchema, StaticTypeSchemaSlot, getSchemaTypename, makeObject, subscribe, toJsonSchema } from '../internal';
import type * as TypeNs from '../Type';

/**
 * Create an in-memory `Type.Type` entity (a `PersistentSchema` object) for tests.
 * Accepts either a raw Effect Schema or a `Type.Type` entity (the entity's
 * underlying source schema is extracted via `StaticTypeSchemaSlot`).
 */
// TODO(dmaretskyi): Should be replaced by registration of typed object.
export const createEchoSchema = (
  input: Schema.Schema.AnyNoContext | { readonly [StaticTypeSchemaSlot]?: Schema.Schema.AnyNoContext },
  version = '0.1.0',
): TypeNs.Type => {
  const schema = ((input as any)[StaticTypeSchemaSlot] ?? input) as Schema.Schema.AnyNoContext;
  const jsonSchema = toJsonSchema(schema);
  const typename = getSchemaTypename(schema);
  assertArgument(typename, 'typename', 'Schema does not have a typename.');
  return makeObject(PersistentSchema, { typename, version, jsonSchema }) as unknown as TypeNs.Type;
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

/**
 * Creates an update counter that tracks changes to reactive objects.
 * @param objects - Reactive objects to subscribe to.
 * @returns An object with a count property and Symbol.dispose for cleanup.
 */
export const updateCounter = (...objects: object[]) => {
  let updateCount = 0;

  const unsubscribes = objects.map((obj) =>
    subscribe(obj, () => {
      updateCount++;
    }),
  );

  const unsubscribeAll = () => {
    for (const unsub of unsubscribes) {
      unsub();
    }
  };

  return {
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: unsubscribeAll,
    get count() {
      return updateCount;
    },
  };
};
