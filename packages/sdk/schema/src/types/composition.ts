//
// Copyright 2024 DXOS.org
//

import type { JsonSchemaType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

export const composeSchema = (source: JsonSchemaType, projection: JsonSchemaType): JsonSchemaType => {
  const result = structuredClone(projection);

  invariant('type' in result && result.type === 'object', 'source schema must be an object');
  invariant('type' in source && source.type === 'object', 'projection schema must be an object');

  for (const field in result.properties) {
    const fieldSchema = source.properties[field]; // TODO(dmaretskyi): Find by json-path instead.

    const annotations = (fieldSchema as any)?.$echo?.annotations;
    if (annotations) {
      (result.properties[field] as any).$echo ??= {};
      (result.properties[field] as any).$echo.annotations ??= {};
      for (const key in annotations) {
        (result.properties[field] as any).$echo.annotations[key] ??= {};
        Object.assign((result.properties[field] as any).$echo.annotations[key], annotations[key], {
          ...(result.properties[field] as any).$echo.annotations[key],
        });
      }
    }
  }

  return result;
};
