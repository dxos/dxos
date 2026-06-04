//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, test } from 'vitest';

import { Annotation } from '@dxos/echo';

import { resolveLayoutField } from './FormLayout';

const Place = Schema.Struct({
  name: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
}).pipe(Annotation.LabelAnnotation.set(['name']));

const Journey = Schema.Struct({
  number: Schema.optional(Schema.String),
  origin: Schema.optional(Place),
  destination: Schema.optional(Place),
});

describe('resolveLayoutField', () => {
  test('resolves a top-level scalar field', ({ expect }) => {
    const resolved = resolveLayoutField(Journey, 'number');
    expect(resolved).toBeDefined();
    expect(resolved!.segments).toEqual(['number']);
    expect(resolved!.leafName).toBe('number');
    expect(resolved!.labelType).toBeUndefined();
  });

  test('auto-labels a nested struct carrying a LabelAnnotation', ({ expect }) => {
    const resolved = resolveLayoutField(Journey, 'origin');
    expect(resolved).toBeDefined();
    expect(resolved!.segments).toEqual(['origin']);
    expect(resolved!.leafName).toBe('origin');
    expect(resolved!.labelType).toBeDefined();
    // The flagged type literal computes the place's label.
    const label = Annotation.getLabelWithSchema(Schema.make(resolved!.labelType!), { name: 'JFK', code: 'JFK' } as any);
    expect(label).toBe('JFK');
  });

  test('drills into a nested sub-field via a dotted name', ({ expect }) => {
    const resolved = resolveLayoutField(Journey, 'origin.code');
    expect(resolved).toBeDefined();
    expect(resolved!.segments).toEqual(['origin', 'code']);
    expect(resolved!.leafName).toBe('code');
    // The leaf is a scalar, not an auto-labelled struct.
    expect(resolved!.labelType).toBeUndefined();
    expect(SchemaAST.isStringKeyword(resolved!.type) || SchemaAST.isUnion(resolved!.type)).toBe(true);
  });

  test('returns undefined for an unknown field', ({ expect }) => {
    expect(resolveLayoutField(Journey, 'missing')).toBeUndefined();
    expect(resolveLayoutField(Journey, 'origin.missing')).toBeUndefined();
  });
});
