import type { JsonSchemaType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { JSONSchema } from '@effect/schema';

export const composeSchema = (source: JsonSchemaType, projection: JsonSchemaType): JsonSchemaType => {
  const result = structuredClone(projection);

  invariant('type' in result && result.type === 'object', 'source schema must be an object');
  invariant('type' in projection && projection.type === 'object', 'projection schema must be an object');

  for(const field in projection.properties) {
    const fieldSchema = projection.properties[field];

    
  }

  return result;
};
