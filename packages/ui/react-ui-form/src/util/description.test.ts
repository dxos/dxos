//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { getFieldDescription } from './description';

// Every schema whose description Effect writes itself: the base scalars name their type, and each built-in
// refinement restates its constraint. Asserting against live schemas (rather than hard-coded strings) means a
// wording change in Effect fails here instead of silently leaking that text into the UI.
const GENERATED: Record<string, Schema.Schema.All> = {
  string: Schema.String,
  number: Schema.Number,
  boolean: Schema.Boolean,
  minLength: Schema.String.pipe(Schema.minLength(1)),
  maxLength: Schema.String.pipe(Schema.maxLength(5)),
  length: Schema.String.pipe(Schema.length(2)),
  nonEmptyString: Schema.String.pipe(Schema.nonEmptyString()),
  pattern: Schema.String.pipe(Schema.pattern(/^a/)),
  startsWith: Schema.String.pipe(Schema.startsWith('a')),
  endsWith: Schema.String.pipe(Schema.endsWith('z')),
  includes: Schema.String.pipe(Schema.includes('x')),
  lowercased: Schema.String.pipe(Schema.lowercased()),
  uppercased: Schema.String.pipe(Schema.uppercased()),
  trimmed: Schema.String.pipe(Schema.trimmed()),
  int: Schema.Number.pipe(Schema.int()),
  between: Schema.Number.pipe(Schema.between(1, 9)),
  greaterThan: Schema.Number.pipe(Schema.greaterThan(0)),
  greaterThanOrEqualTo: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
  lessThan: Schema.Number.pipe(Schema.lessThan(10)),
  lessThanOrEqualTo: Schema.Number.pipe(Schema.lessThanOrEqualTo(10)),
  positive: Schema.Number.pipe(Schema.positive()),
  nonNegative: Schema.Number.pipe(Schema.nonNegative()),
  finite: Schema.Number.pipe(Schema.finite()),
  multipleOf: Schema.Number.pipe(Schema.multipleOf(2)),
  minItems: Schema.Array(Schema.String).pipe(Schema.minItems(1)),
  maxItems: Schema.Array(Schema.String).pipe(Schema.maxItems(3)),
  itemsCount: Schema.Array(Schema.String).pipe(Schema.itemsCount(2)),
};

describe('getFieldDescription', () => {
  test('ignores the description Effect generates for a scalar or a refinement', ({ expect }) => {
    for (const [name, schema] of Object.entries(GENERATED)) {
      expect(getFieldDescription(schema.ast), `${name} leaked its constraint text`).toBeUndefined();
    }
  });

  test('keeps an authored description on a refined schema', ({ expect }) => {
    const schema = Schema.String.pipe(Schema.minLength(1)).annotations({
      title: 'Full name',
      description: 'The name shown on official documents.',
    });

    expect(getFieldDescription(schema.ast)).toEqual('The name shown on official documents.');
  });

  test('keeps an authored description on an unrefined schema', ({ expect }) => {
    const schema = Schema.String.annotations({ description: 'Any text.' });

    expect(getFieldDescription(schema.ast)).toEqual('Any text.');
  });

  test('returns undefined when the schema has no description at all', ({ expect }) => {
    expect(getFieldDescription(Schema.Any.ast)).toBeUndefined();
  });
});
