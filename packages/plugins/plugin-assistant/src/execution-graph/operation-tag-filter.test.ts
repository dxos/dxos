//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AgentRequestBegin, AgentRequestEnd } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import { EntityId } from '@dxos/keys';
import { renderTimelineAscii } from '@dxos/react-ui-components';

import { UNTAGGED_OPERATION_TAG, buildExecutionGraph, collectOperationTags } from './execution-graph';
import { collectTraceEvents, withMeta } from './testing';

EntityId.dangerouslyDisableRandomness();

/** An operation span: start, end, and the tags both boundaries carry. */
const operation = (
  { pid, parentPid }: { pid: string; parentPid?: string },
  { key, name, tags }: { key: string; name: string; tags?: string[] },
  inner?: Effect.Effect<void, never, Trace.TraceService>,
) =>
  withMeta(
    { pid, parentPid },
    Effect.gen(function* () {
      yield* Trace.write(Trace.OperationStart, { key, name, tags });
      if (inner) {
        yield* inner;
      }
      yield* Trace.write(Trace.OperationEnd, { key, name, tags, outcome: 'success' });
    }),
  );

const render = (messages: Trace.Message[], operationTags?: readonly string[]) => {
  const { commits, branches } = buildExecutionGraph({ traceMessages: messages, operationTags });
  return `\n${renderTimelineAscii(commits, branches)}\n`;
};

describe('collectOperationTags', () => {
  test('collects the tags present in a trace', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* operation({ pid: 'op-1' }, { key: 'open', name: 'Open', tags: ['ui'] });
        yield* operation({ pid: 'op-2' }, { key: 'sync', name: 'Sync', tags: ['sync', 'tool'] });
      }),
    );
    expect(collectOperationTags(messages)).toEqual(['sync', 'tool', 'ui']);
  });

  test('an operation with no tags reports as untagged', ({ expect }) => {
    const messages = collectTraceEvents(operation({ pid: 'op-1' }, { key: 'legacy', name: 'Legacy' }));
    expect(collectOperationTags(messages)).toEqual([UNTAGGED_OPERATION_TAG]);
  });

  test('ignores non-operation events', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
        }),
      ),
    );
    expect(collectOperationTags(messages)).toEqual([]);
  });
});

describe('buildExecutionGraph operation tag filter', () => {
  test('omitting the filter keeps every operation', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* operation({ pid: 'op-1' }, { key: 'open', name: 'Open', tags: ['ui'] });
        yield* operation({ pid: 'op-2' }, { key: 'sync', name: 'Sync', tags: ['sync'] });
      }),
    );
    expect(render(messages)).toMatchInlineSnapshot(`
      "
      ●  [function] Open
      ●  [function] Sync
      "
    `);
  });

  test('operations outside the selection are dropped', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* operation({ pid: 'op-1' }, { key: 'open', name: 'Open', tags: ['ui'] });
        yield* operation({ pid: 'op-2' }, { key: 'sync', name: 'Sync', tags: ['sync'] });
      }),
    );
    expect(render(messages, ['sync'])).toMatchInlineSnapshot(`
      "
      ●  [function] Sync
      "
    `);
  });

  test('an operation matches when any of its tags is selected', ({ expect }) => {
    const messages = collectTraceEvents(
      operation({ pid: 'op-1' }, { key: 'sync', name: 'Sync', tags: ['sync', 'tool'] }),
    );
    expect(render(messages, ['tool'])).toContain('Sync');
    expect(render(messages, ['agent'])).not.toContain('Sync');
  });

  test('untagged operations are matched by the untagged pseudo-tag', ({ expect }) => {
    const messages = collectTraceEvents(operation({ pid: 'op-1' }, { key: 'legacy', name: 'Legacy' }));
    expect(render(messages, [UNTAGGED_OPERATION_TAG])).toContain('Legacy');
    expect(render(messages, ['sync'])).not.toContain('Legacy');
  });

  test('a hidden tag is shown when it is a subtask of a shown operation', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta(
          { pid: 'op-1' },
          Trace.write(Trace.OperationStart, { key: 'run', name: 'Run', tags: ['assistant'] }),
        );
        yield* operation({ pid: 'op-2', parentPid: 'op-1' }, { key: 'query', name: 'Query', tags: ['database'] });
        yield* withMeta(
          { pid: 'op-1' },
          Trace.write(Trace.OperationEnd, { key: 'run', name: 'Run', tags: ['assistant'], outcome: 'success' }),
        );
      }),
    );
    // `database` is not selected, but the agent's own run is — so what it kicked off comes with it.
    const filtered = render(messages, ['assistant']);
    expect(filtered).toContain('Run');
    expect(filtered).toContain('Query');
  });

  test('the same tag is still hidden at the top level', ({ expect }) => {
    const messages = collectTraceEvents(
      operation({ pid: 'op-1' }, { key: 'query', name: 'Query', tags: ['database'] }),
    );
    expect(render(messages, ['assistant'])).not.toContain('Query');
  });

  test('hiding a parent operation keeps the work it started', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta(
          { pid: 'op-1' },
          Trace.write(Trace.OperationStart, { key: 'open', name: 'Open', tags: ['ui'] }),
        );
        yield* operation({ pid: 'op-2', parentPid: 'op-1' }, { key: 'sync', name: 'Sync', tags: ['sync'] });
        yield* withMeta(
          { pid: 'op-1' },
          Trace.write(Trace.OperationEnd, { key: 'open', name: 'Open', tags: ['ui'], outcome: 'success' }),
        );
      }),
    );
    const filtered = render(messages, ['sync']);
    expect(filtered).toContain('Sync');
    expect(filtered).not.toContain('Open');
  });

  test('non-operation activity is never filtered', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestBegin, {}));
        yield* operation({ pid: 'op-1', parentPid: 'agent-1' }, { key: 'open', name: 'Open', tags: ['ui'] });
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );
    // The agent request is not an operation, so the filter never touches it — and its `ui` child is
    // a subtask of a shown span, so it comes along even though `ui` is not selected.
    const filtered = render(messages, ['sync']);
    expect(filtered).toContain('Agent processing request...');
    expect(filtered).toContain('Agent completed request');
    expect(filtered).toContain('Open');
  });

  test('an end event whose span never opened is filtered too', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'op-1' },
        Trace.write(Trace.OperationEnd, { key: 'open', name: 'Open', tags: ['ui'], outcome: 'success' }),
      ),
    );
    expect(render(messages, [UNTAGGED_OPERATION_TAG, 'sync'])).not.toContain('Open');
    expect(render(messages, ['ui'])).toContain('Open');
  });

  test('an empty selection hides every operation', ({ expect }) => {
    const messages = collectTraceEvents(operation({ pid: 'op-1' }, { key: 'sync', name: 'Sync', tags: ['sync'] }));
    expect(render(messages, [])).toMatchInlineSnapshot(`
      "

      "
    `);
  });
});
