import * as JsonSchema from 'effect/JsonSchema';
import * as Schema from 'effect/Schema';
import * as SR from 'effect/SchemaRepresentation';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { EchoRevivers, toEffectSchema } from '../src/json-schema-compat';

const fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures-v3.json', import.meta.url)), 'utf-8'),
) as Record<string, any>;

/**
 * Round-trip the reconstructed schema back out through v4's own emitter to size the gap
 * between what v4 writes and what v3 wrote (i.e. how much post-processing ECHO's writer
 * still owes existing clients).
 */
test('v4 emitter output vs the v3-persisted document', () => {
  const schema = toEffectSchema(fixtures.Person);
  const doc = SR.toJsonSchemaDocument(SR.toRepresentation(schema.ast));
  const draft07 = JsonSchema.toDocumentDraft07(doc) as any;

  const root = draft07.definitions
    ? (draft07.definitions[Object.keys(draft07.definitions)[0]] ?? draft07.schema)
    : draft07.schema;

  // eslint-disable-next-line no-console
  console.log('v4 emitted root keys:', Object.keys(root).join(', '));
  // eslint-disable-next-line no-console
  console.log('v4 emitted envelope keys:', Object.keys(draft07).join(', '));
  // eslint-disable-next-line no-console
  console.log('v3 stored envelope keys:', Object.keys(fixtures.Person).join(', '));
  // eslint-disable-next-line no-console
  console.log('v4 age:', JSON.stringify(root.properties?.age));
  // eslint-disable-next-line no-console
  console.log('v3 age:', JSON.stringify(fixtures.Person.properties.age));
  // eslint-disable-next-line no-console
  console.log('v4 note:', JSON.stringify(root.properties?.note));
  // eslint-disable-next-line no-console
  console.log('v3 note:', JSON.stringify(fixtures.Person.properties.note));
  // eslint-disable-next-line no-console
  console.log('v4 employer:', JSON.stringify(root.properties?.employer));

  expect(draft07).toBeDefined();
});

/**
 * The representation format is v4's own persistable schema encoding — the candidate
 * replacement for storing JSON Schema at all.
 */
test('SchemaRepresentation survives a full persist/revive cycle', () => {
  const schema = toEffectSchema(fixtures.Person);
  const json = SR.toJson(SR.toRepresentation(schema.ast));
  const revived = SR.fromRepresentation(SR.fromJson(json), { revivers: EchoRevivers });

  expect(revived.ast._tag).toBe('Objects');
  // Annotations (including DXOS's own namespaced keys) survive verbatim.
  const annotations = (revived.ast as any).annotations;
  expect(annotations['@dxos/echo/Type']).toEqual({
    typename: 'com.example.type.Person',
    version: '0.1.0',
    kind: 'object',
  });
  expect(Schema.is(revived as any)).toBeTypeOf('function');
});
