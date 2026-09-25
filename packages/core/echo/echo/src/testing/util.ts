//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import type { SchemaAST } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import {
  TypeSchema,
  getSchemaTypename,
  getStaticTypeSchema,
  makeObject,
  subscribe,
  toJsonSchema,
} from '../internal/index.ts';
import type * as Type from '../Type.ts';

/**
 * Create an in-memory `Type.Type` entity (a `TypeSchema` object) for tests.
 * Accepts a raw Effect Schema. Pass `Type.getSchema(entity)` to convert a
 * `Type.Type` entity to its underlying source schema first.
 */
// TODO(dmaretskyi): Should be replaced by registration of typed object.
export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0'): Type.Type => {
  const jsonSchema = toJsonSchema(schema);
  const typename = getSchemaTypename(schema);
  assertArgument(typename, 'typename', 'Schema does not have a typename.');
  // typename/version are routed via EntityMeta (the canonical registry-provenance
  // pair); they're no longer data fields on `TypeSchema`.
  return makeObject(
    getStaticTypeSchema(TypeSchema) as any,
    { jsonSchema },
    { keys: [], key: typename, version },
    TypeSchema,
  ) as unknown as Type.Type;
};

/**
 * Drops the `| undefined` member Effect 4's `Schema.optional` adds to a property type.
 *
 * ECHO's wire form states an absent property as the bare type omitted from `required`, so a
 * serialize/deserialize cycle cannot tell `Schema.optional` from `Schema.optionalKey` and always
 * rebuilds the latter. Applied repeatedly because `optional` is not idempotent in v4.
 */
const collapseOptionalUnion = (value: any): any => {
  let node = value;
  while (
    node?._tag === 'Union' &&
    node.context?.isOptional &&
    node.types?.length === 2 &&
    node.types[1]?._tag === 'Undefined'
  ) {
    node = { ...node.types[0], context: node.context };
  }
  return node;
};

/**
 * Clears the optionality Effect 4 also records on the last link of an encoding chain.
 *
 * Whether the flag lands there depends on which spelling declared the property, and ECHO's wire form
 * carries optionality once, in `required` -- so it is compared on the node and ignored below it.
 */
const stripEncodingContext = (value: any): any =>
  Array.isArray(value?.encoding)
    ? {
        ...value,
        encoding: value.encoding.map((link: any) => ({ ...link, to: { ...link.to, context: undefined } })),
      }
    : value;

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
      const clone = { ...stripEncodingContext(collapseOptionalUnion(value)) };
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
