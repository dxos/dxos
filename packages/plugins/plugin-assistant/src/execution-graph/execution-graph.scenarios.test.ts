//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Trace } from '@dxos/compute';
import { ObjectId } from '@dxos/keys';
import { renderTimelineAscii } from '@dxos/react-ui-components';

import { buildExecutionGraph } from './execution-graph';
import { collectTraceEvents, withMeta } from './testing';

ObjectId.dangerouslyDisableRandomness();

const MESSAGE_ID = '01HQ0000000000000000000000';

const renderGraph = (messages: Trace.Message[]) => {
  const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
  return renderTimelineAscii(commits, branches);
};

describe('buildExecutionGraph scenarios', () => {
  /**
   * Single top-level operation invocation. With no inner activity the span is collapsible
   * and renders as a single end commit on `main`.
   */
  test('single top-level operation collapses to one commit on main', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'op-1' },
        Effect.gen(function* () {
          yield* Trace.write(Trace.OperationStart, { key: 'reply', name: 'Reply' });
          yield* Trace.write(Trace.OperationEnd, { key: 'reply', name: 'Reply', outcome: 'success' });
        }),
      ),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●  [function] Reply - Success
      "
    `);
  });

  /**
   * Top-level operation containing one nested operation. The parent has a child so it cannot
   * collapse — it forks to its own branch on begin and merges back on end. The nested op is
   * still collapsible so it emits a single end commit on the parent's branch.
   */
  test('top-level operation with one child forks then merges', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'parent-1' }, Trace.write(Trace.OperationStart, { key: 'parent', name: 'Parent' }));
        yield* withMeta(
          { pid: 'child-1', parentPid: 'parent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'child', name: 'Child' });
            yield* Trace.write(Trace.OperationEnd, { key: 'child', name: 'Child', outcome: 'success' });
          }),
        );
        yield* withMeta(
          { pid: 'parent-1' },
          Trace.write(Trace.OperationEnd, { key: 'parent', name: 'Parent', outcome: 'success' }),
        );
      }),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [function] Parent
      ├──●  [function] Child - Success
      ◆──╯  [function] Parent - Success
      "
    `);
  });

  /**
   * Top-level operation with three sequential collapsible children. Each child renders one
   * commit on the parent's own branch in chronological order, then the parent merges back.
   */
  test('top-level operation with N sequential children renders one commit per child', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'parent-1' }, Trace.write(Trace.OperationStart, { key: 'parent', name: 'Parent' }));
        for (const name of ['Alpha', 'Beta', 'Gamma']) {
          yield* withMeta(
            { pid: `child-${name}`, parentPid: 'parent-1' },
            Effect.gen(function* () {
              yield* Trace.write(Trace.OperationStart, { key: name.toLowerCase(), name });
              yield* Trace.write(Trace.OperationEnd, { key: name.toLowerCase(), name, outcome: 'success' });
            }),
          );
        }
        yield* withMeta(
          { pid: 'parent-1' },
          Trace.write(Trace.OperationEnd, { key: 'parent', name: 'Parent', outcome: 'success' }),
        );
      }),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [function] Parent
      ├──●  [function] Alpha - Success
      │  ●  [function] Beta - Success
      │  ●  [function] Gamma - Success
      ◆──╯  [function] Parent - Success
      "
    `);
  });

  /**
   * Two overlapping top-level operations (different pids, both parented at root). R2 starts
   * before R1 ends. Each routine has a nested sub-operation so they cannot collapse — they
   * occupy their own branches off main. Regression: end commits must anchor to the immediate
   * predecessor on main rather than skipping back to their matching begin commit.
   */
  test('two overlapping top-level operations stay on independent branches without skip-back edges', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'r1' }, Trace.write(Trace.OperationStart, { key: 'routine', name: 'Run Routine 1' }));
        yield* withMeta({ pid: 'r2' }, Trace.write(Trace.OperationStart, { key: 'routine', name: 'Run Routine 2' }));
        yield* withMeta(
          { pid: 'lookup-1', parentPid: 'r1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'lookup', name: 'Lookup A' });
            yield* Trace.write(Trace.OperationEnd, { key: 'lookup', name: 'Lookup A', outcome: 'success' });
          }),
        );
        yield* withMeta(
          { pid: 'lookup-2', parentPid: 'r2' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'lookup', name: 'Lookup B' });
            yield* Trace.write(Trace.OperationEnd, { key: 'lookup', name: 'Lookup B', outcome: 'success' });
          }),
        );
        yield* withMeta(
          { pid: 'r1' },
          Trace.write(Trace.OperationEnd, { key: 'routine', name: 'Run Routine 1', outcome: 'success' }),
        );
        yield* withMeta(
          { pid: 'r2' },
          Trace.write(Trace.OperationEnd, { key: 'routine', name: 'Run Routine 2', outcome: 'success' }),
        );
      }),
    );

    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    // Sanity check the regression invariant: every parent edge on main connects to the
    // immediate predecessor on main, never to an older commit (which would render as a
    // skip-back edge crossing intervening commits).
    const mainCommits = commits.filter((commit) => commit.branch === 'main');
    const mainIndexById = new Map(mainCommits.map((commit, index) => [commit.id, index]));
    for (let index = 1; index < mainCommits.length; index += 1) {
      const onMainParents = (mainCommits[index].parents ?? []).filter((id) => mainIndexById.has(id));
      expect(onMainParents.length).toBeGreaterThan(0);
      for (const parentId of onMainParents) {
        expect(mainIndexById.get(parentId)).toBe(index - 1);
      }
    }

    expect(`\n${renderTimelineAscii(commits, branches)}\n`).toMatchInlineSnapshot(`
      "
      ●        [function] Run Routine 1
      ●        [function] Run Routine 2
      ├──●     [function] Lookup A - Success
      ├──┼──●  [function] Lookup B - Success
      ◆──╯  │  [function] Run Routine 1 - Success
      ◆─────╯  [function] Run Routine 2 - Success
      "
    `);
  });

  /**
   * Two sequential agent sessions sharing the same pid. Each request is an independent span
   * but they share a branch (both pid="session-1"), so middle events chain across the gap
   * between sessions. Matches the existing `'sequential prompts in a session'` ASCII snapshot
   * style produced by real conversations.
   */
  test('two sequential agent sessions sharing a pid chain on the same branch', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'session-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'First question', pending: false },
          });
          yield* Trace.write(AgentRequestEnd, {});
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'Follow-up question', pending: false },
          });
          yield* Trace.write(AgentRequestEnd, {});
        }),
      ),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [user] First question
      ◆──╯  [atom] Agent completed request
      ●  │  [atom] Agent processing request...
      │  ●  [user] Follow-up question
      ◆──╯  [atom] Agent completed request
      "
    `);
  });

  /**
   * Top-level operation interleaved with several status updates between begin and end.
   * Status events are middle events: they render on the operation's own branch and the end
   * commit merges them back into main.
   */
  test('mixed boundary and status events keep statuses on the op branch and merge at end', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'op-1' },
        Effect.gen(function* () {
          yield* Trace.write(Trace.OperationStart, { key: 'work', name: 'Work' });
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: { _tag: 'status', statusText: 'thinking', pending: false },
          });
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: { _tag: 'status', statusText: 'searching', pending: false },
          });
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: { _tag: 'status', statusText: 'writing', pending: false },
          });
          yield* Trace.write(Trace.OperationEnd, { key: 'work', name: 'Work', outcome: 'success' });
        }),
      ),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [function] Work
      ├──●  [info] thinking
      │  ●  [info] searching
      │  ●  [info] writing
      ◆──╯  [function] Work - Success
      "
    `);
  });

  /**
   * Orphan `OperationEnd` event — no matching `OperationStart` was captured. The span tree
   * attaches it to the synthetic root rather than crashing, so the renderer produces a
   * single commit on main.
   */
  test('orphan end event without a matching begin attaches to root without crashing', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta({ pid: 'ghost' }, Trace.write(Trace.OperationEnd, { key: 'lost', name: 'Lost', outcome: 'failure' })),
    );

    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    expect(commits).toHaveLength(1);
    expect(commits[0].branch).toBe('main');
    expect(`\n${renderTimelineAscii(commits, branches)}\n`).toMatchInlineSnapshot(`
      "
      ●  [function] Lost - Error
      "
    `);
  });
});
