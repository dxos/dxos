//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as OperationTag from '@dxos/app-toolkit/OperationTag';

import { UNTAGGED_OPERATION_TAG } from '#execution-graph';

import { DEFAULT_OPERATION_TAGS, availableOperationTags } from './trace-filter';

describe('DEFAULT_OPERATION_TAGS', () => {
  test('hides the high-volume tags and keeps untagged visible', ({ expect }) => {
    expect(DEFAULT_OPERATION_TAGS).toContain(UNTAGGED_OPERATION_TAG);
    expect(DEFAULT_OPERATION_TAGS).toContain(OperationTag.Assistant);
    expect(DEFAULT_OPERATION_TAGS).toContain(OperationTag.Connector);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(OperationTag.Layout);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(OperationTag.Navigation);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(OperationTag.Database);
    expect(DEFAULT_OPERATION_TAGS).not.toContain(OperationTag.System);
  });
});

describe('availableOperationTags', () => {
  test('offers the common vocabulary even for an empty trace', ({ expect }) => {
    expect(availableOperationTags([], [])).toEqual([...OperationTag.all, UNTAGGED_OPERATION_TAG]);
  });

  test('orders known tags by the vocabulary and sorts untagged last', ({ expect }) => {
    const tags = availableOperationTags([UNTAGGED_OPERATION_TAG, OperationTag.Database, OperationTag.Layout], []);
    expect(tags[0]).toBe(OperationTag.Layout);
    expect(tags[tags.length - 1]).toBe(UNTAGGED_OPERATION_TAG);
  });

  test('includes a selected tag the trace has not produced, so it can be cleared', ({ expect }) => {
    expect(availableOperationTags([], ['custom'])).toContain('custom');
  });

  test('sorts unknown tags after the vocabulary, alphabetically', ({ expect }) => {
    const tags = availableOperationTags(['zebra', 'custom'], []);
    const known = tags.indexOf(OperationTag.System);
    expect(tags.indexOf('custom')).toBeGreaterThan(known);
    expect(tags.indexOf('custom')).toBeLessThan(tags.indexOf('zebra'));
    expect(tags.indexOf('zebra')).toBeLessThan(tags.indexOf(UNTAGGED_OPERATION_TAG));
  });

  test('does not duplicate tags', ({ expect }) => {
    const tags = availableOperationTags([OperationTag.Connector, OperationTag.Connector], [OperationTag.Connector]);
    expect(tags.filter((tag) => tag === OperationTag.Connector)).toHaveLength(1);
  });
});
