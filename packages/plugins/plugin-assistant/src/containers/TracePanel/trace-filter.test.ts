//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as OperationTag from '@dxos/app-toolkit/OperationTag';

import { UNTAGGED_OPERATION_TAG } from '#execution-graph';

import { DEFAULT_OPERATION_TAGS, availableOperationTags } from './trace-filter';

describe('DEFAULT_OPERATION_TAGS', () => {
  test('starts on agentic runs and external sync only', ({ expect }) => {
    expect(DEFAULT_OPERATION_TAGS).toEqual([OperationTag.Assistant, OperationTag.Connector]);
  });
});

describe('availableOperationTags', () => {
  test('offers nothing for an empty trace with no selection', ({ expect }) => {
    expect(availableOperationTags([], [])).toEqual([]);
  });

  test('offers only what the trace contains, not the whole vocabulary', ({ expect }) => {
    expect(availableOperationTags([OperationTag.Database], [])).toEqual([OperationTag.Database]);
  });

  test('orders known tags by the vocabulary and sorts untagged last', ({ expect }) => {
    const tags = availableOperationTags([UNTAGGED_OPERATION_TAG, OperationTag.Database, OperationTag.Layout], []);
    expect(tags).toEqual([OperationTag.Layout, OperationTag.Database, UNTAGGED_OPERATION_TAG]);
  });

  test('includes a selected tag the trace has not produced, so it can be cleared', ({ expect }) => {
    expect(availableOperationTags([], ['custom'])).toContain('custom');
  });

  test('sorts unknown tags after the vocabulary, alphabetically', ({ expect }) => {
    const tags = availableOperationTags(['zebra', 'custom', OperationTag.System, UNTAGGED_OPERATION_TAG], []);
    expect(tags).toEqual([OperationTag.System, 'custom', 'zebra', UNTAGGED_OPERATION_TAG]);
  });

  test('does not duplicate tags', ({ expect }) => {
    const tags = availableOperationTags([OperationTag.Connector, OperationTag.Connector], [OperationTag.Connector]);
    expect(tags.filter((tag) => tag === OperationTag.Connector)).toHaveLength(1);
  });
});
