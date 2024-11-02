//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type JsonSchemaType } from '../ast';

/*
TODO(dima)
- echo -> echo
- echo.annotations -> annotations?
- anyOf: ReactiveArray(2) [ { type: 'object' }, { type: 'array' } ], on toJsonSchema(S.Struct({}))
- FieldMeta -> PropertyMeta
*/

/**
 * Creates a composite schema from the source and projection schemas.
 */
// TODO(burdon): Can avoid having to call this every time we modify any property on the view?
export const composeSchema = (source: JsonSchemaType, target: JsonSchemaType): JsonSchemaType => {
  // TODO(dmaretskyi): Better way to clone echo proxies.
  const result = JSON.parse(JSON.stringify(target));
  invariant('type' in result && result.type === 'object', 'source schema must be an object');
  invariant('type' in source && source.type === 'object', 'target schema must be an object');

  for (const prop in result.properties) {
    const propSchema = source.properties[prop]; // TODO(dmaretskyi): Find by json-path instead.
    const annotations = (propSchema as any)?.echo?.annotations;
    if (annotations) {
      (result.properties[prop] as any).echo ??= {};
      (result.properties[prop] as any).echo.annotations ??= {};
      for (const key in annotations) {
        (result.properties[prop] as any).echo.annotations[key] ??= {};
        Object.assign((result.properties[prop] as any).echo.annotations[key], annotations[key], {
          ...(result.properties[prop] as any).echo.annotations[key],
        });
      }
    }
  }

  return result;
};
