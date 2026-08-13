//
// Copyright 2026 DXOS.org
//

import { describe, expectTypeOf, test } from 'vitest';

import { type LocalId, isValidLocalId } from './local-id';

const ERROR = 'Error: the final segment of the id must be camelCase (no hyphens or underscores)';

describe('local id', () => {
  test('accepts a camelCase final segment, with or without a dotted prefix', ({ expect }) => {
    expectTypeOf<LocalId<'about'>>().toEqualTypeOf<'about'>();
    expectTypeOf<LocalId<'integrationArticle'>>().toEqualTypeOf<'integrationArticle'>();
    expectTypeOf<LocalId<'article.taskSet'>>().toEqualTypeOf<'article.taskSet'>();
    // Only the final segment is constrained; a prefix may carry a hyphenated typename.
    expectTypeOf<LocalId<'org.dxos.type.task-set.article'>>().toEqualTypeOf<'org.dxos.type.task-set.article'>();
    expectTypeOf<LocalId<'surface2'>>().toEqualTypeOf<'surface2'>();

    expect(
      ['about', 'integrationArticle', 'article.taskSet', 'org.dxos.type.task-set.article'].every(isValidLocalId),
    ).toBe(true);
  });

  test('rejects a final segment the surface manager would drop', ({ expect }) => {
    expectTypeOf<LocalId<'article.task-set'>>().toEqualTypeOf<typeof ERROR>();
    expectTypeOf<LocalId<'plugin-settings'>>().toEqualTypeOf<typeof ERROR>();
    expectTypeOf<LocalId<'plugin_settings'>>().toEqualTypeOf<typeof ERROR>();
    // Must start with a letter — the id becomes a DXN path segment.
    expectTypeOf<LocalId<'1article'>>().toEqualTypeOf<typeof ERROR>();
    expectTypeOf<LocalId<''>>().toEqualTypeOf<typeof ERROR>();

    expect(['article.task-set', 'plugin-settings', 'plugin_settings', '1article', ''].some(isValidLocalId)).toBe(false);
  });

  test('passes a widened string through for the runtime to check', () => {
    // A computed id (`${typename}.sectionObjects`) has no literal type to inspect.
    expectTypeOf<LocalId<string>>().toEqualTypeOf<string>();
  });

  test('accepts an interpolated segment, whose placeholder cannot be inspected', () => {
    expectTypeOf<LocalId<`beta${number}`>>().toEqualTypeOf<`beta${number}`>();
    expectTypeOf<LocalId<`r${number}s${number}`>>().toEqualTypeOf<`r${number}s${number}`>();
    expectTypeOf<LocalId<`prefix.item${number}`>>().toEqualTypeOf<`prefix.item${number}`>();
    // A separator around the placeholder is still caught.
    expectTypeOf<LocalId<`beta-${number}`>>().toEqualTypeOf<typeof ERROR>();
  });
});
