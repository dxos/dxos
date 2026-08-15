//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as OperationTag from '@dxos/app-toolkit/OperationTag';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { DXN } from '@dxos/keys';

import {
  DEFAULT_OPERATION_TAGS,
  UNTAGGED_OPERATION_TAG,
  availableOperationTags,
  filterProcesses,
  operationTagsByProcessKey,
} from './trace-filter';

const definition = (name: string, tags?: string[]) =>
  Operation.make({
    meta: { key: DXN.make(name), name, ...(tags ? { tags } : {}) },
    input: Schema.Void,
    output: Schema.Void,
  });

/** Only the fields the filter reads; the rest of `Process.Info` is irrelevant to it. */
const process = (key: string): Process.Info => ({ pid: Process.ID.make(`pid-${key}`), key }) as unknown as Process.Info;

const tagsByKey = operationTagsByProcessKey([
  definition('org.dxos.operation.run', [OperationTag.Assistant]),
  definition('org.dxos.operation.query', [OperationTag.Database]),
  definition('org.dxos.operation.sync', [OperationTag.Connector, OperationTag.Database]),
  definition('org.dxos.operation.legacy'),
]);

describe('DEFAULT_OPERATION_TAGS', () => {
  test('starts on agentic runs and external sync only', ({ expect }) => {
    expect(DEFAULT_OPERATION_TAGS).toEqual([OperationTag.Assistant, OperationTag.Connector]);
  });
});

describe('operationTagsByProcessKey', () => {
  test('indexes by the process key, which drops the DXN scheme', ({ expect }) => {
    expect(tagsByKey.get('org.dxos.operation.run')).toEqual([OperationTag.Assistant]);
    expect(tagsByKey.get(DXN.make('org.dxos.operation.run').toString())).toBeUndefined();
  });

  test('an operation declaring no tags reports as untagged', ({ expect }) => {
    expect(tagsByKey.get('org.dxos.operation.legacy')).toEqual([UNTAGGED_OPERATION_TAG]);
  });
});

describe('filterProcesses', () => {
  test('keeps a process whose operation carries a selected tag', ({ expect }) => {
    const kept = filterProcesses([process('org.dxos.operation.run')], tagsByKey, [OperationTag.Assistant]);
    expect(kept).toHaveLength(1);
  });

  test('drops a process whose operation carries none of them', ({ expect }) => {
    const kept = filterProcesses([process('org.dxos.operation.query')], tagsByKey, [OperationTag.Assistant]);
    expect(kept).toEqual([]);
  });

  test('a process matches when any one of its tags is selected', ({ expect }) => {
    const processes = [process('org.dxos.operation.sync')];
    expect(filterProcesses(processes, tagsByKey, [OperationTag.Database])).toHaveLength(1);
    expect(filterProcesses(processes, tagsByKey, [OperationTag.Connector])).toHaveLength(1);
    expect(filterProcesses(processes, tagsByKey, [OperationTag.Identity])).toEqual([]);
  });

  test('an untagged operation is matched by the untagged pseudo-tag', ({ expect }) => {
    const processes = [process('org.dxos.operation.legacy')];
    expect(filterProcesses(processes, tagsByKey, [UNTAGGED_OPERATION_TAG])).toHaveLength(1);
    expect(filterProcesses(processes, tagsByKey, [OperationTag.Assistant])).toEqual([]);
  });

  test('a process that is not an operation is never filtered', ({ expect }) => {
    // Agents, trigger dispatchers and the like have no definition to judge them by — and dropping
    // the agent rows would gut the panel this list belongs to.
    const kept = filterProcesses([process('org.dxos.agent')], tagsByKey, [OperationTag.Assistant]);
    expect(kept).toHaveLength(1);
  });

  test('an empty selection still keeps the non-operation processes', ({ expect }) => {
    const processes = [process('org.dxos.agent'), process('org.dxos.operation.run')];
    expect(filterProcesses(processes, tagsByKey, []).map((each) => each.key)).toEqual(['org.dxos.agent']);
  });
});

describe('availableOperationTags', () => {
  test('offers nothing when no process is listed and nothing is selected', ({ expect }) => {
    expect(availableOperationTags([], tagsByKey, [])).toEqual([]);
  });

  test('offers only what the listed processes carry, not the whole vocabulary', ({ expect }) => {
    expect(availableOperationTags([process('org.dxos.operation.query')], tagsByKey, [])).toEqual([
      OperationTag.Database,
    ]);
  });

  test('ignores processes that are not operations', ({ expect }) => {
    expect(availableOperationTags([process('org.dxos.agent')], tagsByKey, [])).toEqual([]);
  });

  test('orders known tags by the vocabulary and sorts untagged last', ({ expect }) => {
    const tags = availableOperationTags(
      [process('org.dxos.operation.legacy'), process('org.dxos.operation.query'), process('org.dxos.operation.run')],
      tagsByKey,
      [],
    );
    expect(tags).toEqual([OperationTag.Assistant, OperationTag.Database, UNTAGGED_OPERATION_TAG]);
  });

  test('includes a selected tag no listed process carries, so it can be cleared', ({ expect }) => {
    expect(availableOperationTags([], tagsByKey, ['custom'])).toContain('custom');
  });

  test('sorts unknown tags after the vocabulary, alphabetically', ({ expect }) => {
    const tags = availableOperationTags([], tagsByKey, [
      'zebra',
      'custom',
      OperationTag.System,
      UNTAGGED_OPERATION_TAG,
    ]);
    expect(tags).toEqual([OperationTag.System, 'custom', 'zebra', UNTAGGED_OPERATION_TAG]);
  });

  test('does not duplicate tags', ({ expect }) => {
    const processes = [process('org.dxos.operation.sync'), process('org.dxos.operation.query')];
    const tags = availableOperationTags(processes, tagsByKey, [OperationTag.Database]);
    expect(tags.filter((tag) => tag === OperationTag.Database)).toHaveLength(1);
  });
});
