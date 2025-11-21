//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type JsonSchemaType } from '../../json-schema';

import { getSnapshot } from './snapshot';

/**
 * Creates a composite schema from the source and projection schemas.
 */
// TODO(burdon): Use effect schema projections.
// TODO(burdon): Can avoid having to call this every time we modify any property on the view?
export const composeSchema = (source: JsonSchemaType, target: JsonSchemaType): JsonSchemaType => {
  const result: JsonSchemaType = getSnapshot(target);
  invariant('type' in result && result.type === 'object', 'source schema must be an object');
  invariant('type' in source && source.type === 'object', 'target schema must be an object');

  for (const prop in result.properties) {
    const propSchema = source.properties![prop]; // TODO(dmaretskyi): Find by json-path instead.
    const annotations = (propSchema as JsonSchemaType)?.annotations?.meta;
    if (annotations) {
      (result.properties[prop] as JsonSchemaType).annotations ??= {};
      (result.properties[prop] as JsonSchemaType).annotations!.meta ??= {};
      for (const key in annotations) {
        (result.properties[prop] as JsonSchemaType).annotations!.meta![key] ??= {};
        Object.assign((result.properties[prop] as JsonSchemaType).annotations!.meta![key], annotations[key], {
          ...(result.properties[prop] as JsonSchemaType).annotations!.meta![key],
        });
      }
    }
  }

  return result;
};
