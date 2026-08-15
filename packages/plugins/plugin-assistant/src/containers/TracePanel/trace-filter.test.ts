//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';

import { UNTAGGED_OPERATION_TAG } from '#execution-graph';

import { DEFAULT_OPERATION_TAGS, availableOperationTags } from './trace-filter';

describe('DEFAULT_OPERATION_TAGS', () => {
  test('hides the high-volume tags and keeps untagged visible', ({ expect }) => {
    expect(DEFAULT_OPERATION_TAGS).toContain(UNTAGGED_OPERATION_TAG);
    expect(DEFAULT_OPERATION_TAGS).toContain(Operation.Tag.Agent);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(Operation.Tag.UI);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(Operation.Tag.Edit);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(Operation.Tag.Query);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(Operation.Tag.System);
  });
});

describe('availableOperationTags', () => {
  test('offers the well-known vocabulary even for an empty trace', ({ expect }) => {
    expect(availableOperationTags([], [])).toEqual([
      Operation.Tag.Space,
      Operation.Tag.Identity,
      Operation.Tag.Sync,
      Operation.Tag.Agent,
      Operation.Tag.Automation,
      Operation.Tag.Tool,
      UNTAGGED_OPERATION_TAG,
    ]);
  });

  test('orders known tags by the vocabulary and sorts untagged last', ({ expect }) => {
    const tags = availableOperationTags([UNTAGGED_OPERATION_TAG, Operation.Tag.Tool, Operation.Tag.UI], []);
    expect(tags[0]).toBe(Operation.Tag.UI);
    expect(tags[tags.length - 1]).toBe(UNTAGGED_OPERATION_TAG);
  });

  test('includes a selected tag the trace has not produced, so it can be cleared', ({ expect }) => {
    expect(availableOperationTags([], ['custom'])).toContain('custom');
  });

  test('sorts unknown tags after the vocabulary, alphabetically', ({ expect }) => {
    const tags = availableOperationTags(['zebra', 'custom'], []);
    const known = tags.indexOf(Operation.Tag.Tool);
    expect(tags.indexOf('custom')).toBeGreaterThan(known);
    expect(tags.indexOf('custom')).toBeLessThan(tags.indexOf('zebra'));
    expect(tags.indexOf('zebra')).toBeLessThan(tags.indexOf(UNTAGGED_OPERATION_TAG));
  });

  test('does not duplicate tags', ({ expect }) => {
    const tags = availableOperationTags([Operation.Tag.Sync, Operation.Tag.Sync], [Operation.Tag.Sync]);
    expect(tags.filter((tag) => tag === Operation.Tag.Sync)).toHaveLength(1);
  });
});
