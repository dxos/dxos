import type { JsonSchemaType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { JSONSchema } from '@effect/schema';

export const composeSchema = (source: JsonSchemaType, projection: JsonSchemaType): JsonSchemaType => {
  const result = structuredClone(projection);

  invariant('type' in result && result.type === 'object', 'source schema must be an object');
  invariant('type' in source && source.type === 'object', 'projection schema must be an object');

  for (const field in result.properties) {
    const fieldSchema = source.properties[field]; // TODO(dmaretskyi): Find by json-path instead.

    const fieldMeta = (fieldSchema as any)?.['$echo']?.fieldMeta;
    if (fieldMeta) {
      (result.properties[field] as any)['$echo'] ??= {};
      (result.properties[field] as any)['$echo'].fieldMeta ??= {};
      for (const key in fieldMeta) {
        (result.properties[field] as any)['$echo'].fieldMeta[key] ??= {};
        Object.assign((result.properties[field] as any)['$echo'].fieldMeta[key], fieldMeta[key], {
          ...(result.properties[field] as any)['$echo'].fieldMeta[key],
        });
      }
    }
  }

  return result;
};
