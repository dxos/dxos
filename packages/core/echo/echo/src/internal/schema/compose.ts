//
// Copyright 2024 DXOS.org
//

import type * as Types from 'effect/Types';

import { invariant } from '@dxos/invariant';

import { type JsonSchemaType } from '../json-schema';

/**
 * Creates a composite schema from the source and projection schemas.
 */
// TODO(burdon): Use effect schema projections.
// TODO(burdon): Can avoid having to call this every time we modify any property on the view?
export const composeSchema = (
  source: Types.Mutable<JsonSchemaType>,
  target: Types.Mutable<JsonSchemaType>,
): Types.Mutable<JsonSchemaType> => {
  const result = structuredClone(target);
  invariant('type' in result && result.type === 'object', 'source schema must be an object');
  invariant('type' in source && source.type === 'object', 'target schema must be an object');

  for (const prop in result.properties) {
    const propSchema = source.properties![prop]; // TODO(dmaretskyi): Find by json-path instead.
    const annotations = (propSchema as JsonSchemaType)?.annotations?.meta;
    if (annotations) {
      const resultProp = result.properties[prop] as Record<string, any>;
      resultProp.annotations ??= {};
      resultProp.annotations.meta ??= {};
      for (const key in annotations) {
        resultProp.annotations.meta[key] ??= {};
        Object.assign(resultProp.annotations.meta[key], annotations[key], {
          ...resultProp.annotations.meta[key],
        });
      }
    }
  }

  return result;
};
