//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Process, Trace } from '@dxos/compute';
import { EntityId } from '@dxos/keys';
import { LogLevel } from '@dxos/log';
import { type Commit, renderTimelineAscii } from '@dxos/react-ui-components';

import { CommitSelector, buildExecutionGraph } from './execution-graph';
import { collectTraceEvents, withMeta } from './testing';

EntityId.dangerouslyDisableRandomness();

const makeCommit = (id: string, opts: Partial<Commit> = {}): Commit => ({
  id,
  branch: opts.branch ?? 'main',
  message: opts.message ?? id,
  ...opts,
});

const ids = (commits: Commit[]) => commits.map((commit) => commit.id);

const renderGraph = (messages: Trace.Message[], collapseCompletedSpans = false) => {
  const { commits, branches } = buildExecutionGraph({ traceMessages: messages, collapseCompletedSpans });
  return renderTimelineAscii(commits, branches);
};

describe('CommitSelector', () => {
  describe('make', () => {
    test('wraps a select function', ({ expect }) => {
      const selector = CommitSelector.make((commits) => commits);
      const a = makeCommit('a');
      expect(selector.select([a])).toEqual([a]);
    });

    test('returns a pipeable selector', ({ expect }) => {
      const selector = CommitSelector.make((commits) => commits);
      expect(typeof selector.pipe).toBe('function');
    });

    test('does not mutate the input array', ({ expect }) => {
      const input = [makeCommit('a'), makeCommit('b')];
      const before = [...input];
      CommitSelector.identity().select(input);
      expect(input).toEqual(before);
    });
  });

  describe('identity', () => {
    test('returns all commits', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      expect(CommitSelector.identity().select([a, b])).toEqual([a, b]);
    });

    test('returns empty for empty input', ({ expect }) => {
      expect(CommitSelector.identity().select([])).toEqual([]);
    });
  });

  describe('filter', () => {
    test('keeps commits matching predicate', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b');
      const selector = CommitSelector.filter((commit) => commit.tags?.includes('x'));
      expect(selector.select([a, b])).toEqual([a]);
    });

    test('returns empty array on no match', ({ expect }) => {
      const a = makeCommit('a');
      expect(CommitSelector.filter(() => false).select([a])).toEqual([]);
    });
  });

  describe('id', () => {
    test('matches a single commit by id', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      expect(CommitSelector.id('b').select([a, b])).toEqual([b]);
    });

    test('returns empty when id is missing', ({ expect }) => {
      expect(CommitSelector.id('missing').select([makeCommit('a')])).toEqual([]);
    });
  });

  describe('tag', () => {
    test('matches commits whose tags include the tag', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b', { tags: ['y'] });
      expect(CommitSelector.tag('x').select([a, b])).toEqual([a]);
    });

    test('returns empty for falsy tag (undefined / null / false)', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      expect(CommitSelector.tag(undefined).select([a])).toEqual([]);
      expect(CommitSelector.tag(null).select([a])).toEqual([]);
      expect(CommitSelector.tag(false).select([a])).toEqual([]);
    });

    test('returns empty when commit has no tags', ({ expect }) => {
      expect(CommitSelector.tag('x').select([makeCommit('a')])).toEqual([]);
    });
  });

  describe('branch', () => {
    test('matches commits by branch', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      expect(CommitSelector.branch('feature').select([a, b])).toEqual([b]);
    });
  });

  describe('compose', () => {
    test('applies next selector after prev', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['keep'] });
      const b = makeCommit('b', { branch: 'main' });
      const c = makeCommit('c', { branch: 'feature', tags: ['keep'] });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.compose(CommitSelector.tag('keep')));
      expect(selector.select([a, b, c])).toEqual([a]);
    });
  });

  describe('orElse', () => {
    test('returns prev result when prev is non-empty', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.orElse(CommitSelector.branch('feature')));
      expect(selector.select([a, b])).toEqual([a]);
    });

    test('returns next result when prev is empty', ({ expect }) => {
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.orElse(CommitSelector.branch('feature')));
      expect(selector.select([b])).toEqual([b]);
    });
  });

  describe('last', () => {
    test('returns the last commit by default', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      const c = makeCommit('c');
      expect(ids(CommitSelector.last().select([a, b, c]))).toEqual(['c']);
    });

    test('produces the most recent commit on a branch when composed', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'main' });
      const c = makeCommit('c', { branch: 'main' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.compose(CommitSelector.last()));
      expect(ids(selector.select([a, b, c]))).toEqual(['c']);
    });
  });

  describe('unionAll', () => {
    test('combines results from multiple selectors', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.unionAll(CommitSelector.branch('main'), CommitSelector.branch('feature'));
      expect(ids(selector.select([a, b])).toSorted()).toEqual(['a', 'b']);
    });

    test('dedupes by id', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['x'] });
      const selector = CommitSelector.unionAll(CommitSelector.branch('main'), CommitSelector.tag('x'));
      expect(selector.select([a])).toHaveLength(1);
    });
  });
});

const MESSAGE_ID = '01HQ0000000000000000000000';

const SHIMMER_EFFECT_TAG = 'effect:shimmer';

const makeActiveProcess = (
  overrides: Partial<Process.Info> & Pick<Process.Info, 'pid' | 'key' | 'state'>,
): Process.Info => ({
  parentPid: null,
  params: { name: null, annotations: {} },
  error: null,
  startedAt: 0,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
  ...overrides,
});

describe('buildExecutionGraph (span-tree based)', () => {
  test('empty input → no commits', ({ expect }) => {
    const { commits, branches } = buildExecutionGraph({ traceMessages: [] });
    expect(commits).toEqual([]);
    expect(branches).toEqual(['main']);
  });

  test('top-level operation with no inner events → collapsed to single end commit on main', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'op-1' },
        Effect.gen(function* () {
          yield* Trace.write(Trace.OperationStart, { key: 'reply', name: 'Reply' });
          yield* Trace.write(Trace.OperationEnd, { key: 'reply', name: 'Reply', outcome: 'success' });
        }),
      ),
    );
    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    expect(branches).toEqual(['main']);
    expect(commits).toHaveLength(1);
    expect(commits[0].branch).toBe('main');
    expect(`\n${renderTimelineAscii(commits, branches)}\n`).toMatchInlineSnapshot(`
      "
      ●  [function] Reply
      "
    `);
  });

  test('nested operation under an agent → collapsed to a single end commit', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta(
          { pid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(AgentRequestBegin, {});
            yield* Trace.write(CompleteBlock, {
              messageId: MESSAGE_ID,
              role: 'user',
              block: { _tag: 'text', text: 'hello', pending: false },
            });
          }),
        );
        yield* withMeta(
          { pid: 'op-1', parentPid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'lookup', name: 'Lookup' });
            yield* Trace.write(Trace.OperationEnd, { key: 'lookup', name: 'Lookup', outcome: 'success' });
          }),
        );
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );
    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    expect(branches).toEqual(['main', 'agent-1']);
    expect(`\n${renderTimelineAscii(commits, branches)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [function] Lookup
      │  ●  [user] hello
      ◆──╯  [atom] Agent completed request
      "
    `);
  });

  test('nested operation with its own inner status message → expanded fork/merge', ({ expect }) => {
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
          yield* Trace.write(Trace.OperationEnd, { key: 'work', name: 'Work', outcome: 'success' });
        }),
      ),
    );
    const { commits } = buildExecutionGraph({ traceMessages: messages });
    // Three commits: begin on main, status on op-1 branch, end on main as merge.
    expect(commits).toHaveLength(3);
    expect(commits[0].branch).toBe('main');
    expect(commits[1].branch).toBe('op-1');
    expect(commits[2].branch).toBe('main');
    expect(commits[2].parents?.length).toBe(2);
  });

  test('child process (sub-agent) forks onto its own branch from its first event', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'supervisor' }, Trace.write(AgentRequestBegin, {}));
        // A delegated sub-agent runs as a separate process: its own pid, parented to the supervisor.
        // With an inner status event the span is non-collapsible, so its begin event is emitted as a
        // real fork — and because it crosses a process boundary it forks onto its OWN branch.
        yield* withMeta(
          { pid: 'sub', parentPid: 'supervisor' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'routine', name: 'Run Routine' });
            yield* Trace.write(CompleteBlock, {
              messageId: MESSAGE_ID,
              role: 'assistant',
              block: { _tag: 'status', statusText: 'working', pending: false },
            });
            yield* Trace.write(Trace.OperationEnd, { key: 'routine', name: 'Run Routine', outcome: 'success' });
          }),
        );
        yield* withMeta({ pid: 'supervisor' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );
    const { commits } = buildExecutionGraph({ traceMessages: messages });
    // The sub-agent's begin ("Run Routine") lands on its OWN branch ('sub'), not the supervisor's —
    // so a concurrent sub-agent gets its own lane from its first event rather than sharing the
    // parent lane until its first middle commit.
    const begin = commits.find((commit) => commit.message === 'Run Routine');
    expect(begin?.branch).toBe('sub');
  });

  test('pending span with user message → user lands on own branch, not parent', ({ expect }) => {
    const messages = collectTraceEvents(
      // Agent has begun and emitted a user message, but has NOT yet completed.
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'hello', pending: false },
          });
        }),
      ),
    );
    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    // Two commits: AgentBegin on main (fork), user "hello" on agent-1 branch (middle).
    // No end commit yet — the span is pending.
    expect(commits).toHaveLength(2);
    expect(commits[0].branch).toBe('main');
    expect(commits[0].message).toBe('Agent processing request...');
    expect(commits[1].branch).toBe('agent-1');
    expect(commits[1].message).toBe('hello');
    expect(`\n${renderTimelineAscii(commits, branches)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [user] hello
      "
    `);
  });

  test('pending span with collapsed sub-span then user message → user on own branch', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestBegin, {}));
        // Sub-span completes (will be collapsed).
        yield* withMeta(
          { pid: 'op-1', parentPid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'lookup', name: 'Lookup' });
            yield* Trace.write(Trace.OperationEnd, { key: 'lookup', name: 'Lookup', outcome: 'success' });
          }),
        );
        // User message arrives after the sub-span; agent is still pending.
        yield* withMeta(
          { pid: 'agent-1' },
          Trace.write(CompleteBlock, {
            messageId: '01HQ0000000000000000000001',
            role: 'user',
            block: { _tag: 'text', text: 'hello', pending: false },
          }),
        );
      }),
    );
    const { commits } = buildExecutionGraph({ traceMessages: messages });
    // AgentBegin on main, Lookup-Success on agent branch, user "hello" on agent branch.
    expect(commits).toHaveLength(3);
    expect(commits[0].branch).toBe('main');
    expect(commits[1].message).toBe('Lookup');
    expect(commits[1].branch).toBe('agent-1');
    expect(commits[2].branch).toBe('agent-1');
    expect(commits[2].message).toBe('hello');
  });

  test('orders sub-spans categorically under their parent', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestBegin, {}));
        yield* withMeta(
          { pid: 'op-1', parentPid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'a', name: 'A' });
            yield* Trace.write(Trace.OperationEnd, { key: 'a', name: 'A', outcome: 'success' });
          }),
        );
        yield* withMeta(
          { pid: 'op-2', parentPid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'b', name: 'B' });
            yield* Trace.write(Trace.OperationEnd, { key: 'b', name: 'B', outcome: 'success' });
          }),
        );
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );
    const { commits } = buildExecutionGraph({ traceMessages: messages });
    // After collapsing, expect: AgentBegin, Op1.End, Op2.End, AgentEnd → 4 commits.
    expect(commits.map((commit) => commit.message)).toEqual([
      'Agent processing request...',
      'A',
      'B',
      'Agent completed request',
    ]);
  });
});

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
      ●  [function] Reply
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
      ├──●  [function] Child
      ◆──╯  [function] Parent
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
      ├──●  [function] Alpha
      │  ●  [function] Beta
      │  ●  [function] Gamma
      ◆──╯  [function] Parent
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
      ●     [function] Run Routine 1
      ├──●  [function] Lookup A
      ◆──╯  [function] Run Routine 1
      ●  │  [function] Run Routine 2
      ├──●  [function] Lookup B
      ◆──╯  [function] Run Routine 2
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
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'Follow-up question', pending: false },
          });
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
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
      ◆──╯  [function] Work
      "
    `);
  });

  /**
   * Plain (non-operation) tool calls — e.g. a toolkit handler or an MCP tool — render as a
   * single auto-collapsed commit on the agent's branch so the timeline shows that work
   * happened without forking a dedicated routine span.
   */
  test('non-operation tool call renders as a single commit on the agent branch', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: {
              _tag: 'toolCall',
              toolCallId: 'call-1',
              name: 'web-search',
              input: '{"query":"hello"}',
              providerExecuted: false,
              pending: false,
            },
          });
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
        }),
      ),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [wrench] web-search
      ◆──╯  [atom] Agent completed request
      "
    `);
  });

  /**
   * Completed (toolCall + toolResult) pair collapses to a single result commit, mirroring how
   * an operation begin/end span with no inner activity collapses to its end commit. The
   * pending toolCall is suppressed once the result arrives because the result commit carries
   * the final success/error state.
   */
  test('tool call + tool result pair collapses to a single result commit', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: {
              _tag: 'toolCall',
              toolCallId: 'call-1',
              name: 'web-search',
              input: '{"query":"hello"}',
              providerExecuted: false,
              pending: false,
            },
          });
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'tool',
            block: {
              _tag: 'toolResult',
              toolCallId: 'call-1',
              name: 'web-search',
              result: '"ok"',
              providerExecuted: false,
              pending: false,
            },
          });
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
        }),
      ),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [wrench] web-search
      ◆──╯  [atom] Agent completed request
      "
    `);
  });

  /**
   * Error results render as a single commit with an error level and an " - Error" suffix —
   * matches the operation-end error convention.
   */
  test('tool call with failing tool result renders as a single error commit', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: {
              _tag: 'toolCall',
              toolCallId: 'call-1',
              name: 'flaky',
              input: '{}',
              providerExecuted: false,
              pending: false,
            },
          });
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'tool',
            block: {
              _tag: 'toolResult',
              toolCallId: 'call-1',
              name: 'flaky',
              error: 'boom',
              providerExecuted: false,
              pending: false,
            },
          });
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
        }),
      ),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [wrench] flaky - Error
      ◆──╯  [atom] Agent completed request
      "
    `);
  });

  /**
   * Operation-backed tool calls (those carrying an `operationKey`) are suppressed in the
   * timeline because the surrounding `Trace.OperationStart` / `Trace.OperationEnd` span
   * already produces a routine commit. Otherwise the user would see two entries for the
   * same logical invocation.
   */
  test('operation-backed tool call is suppressed in favor of the routine span', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta(
          { pid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(AgentRequestBegin, {});
            yield* Trace.write(CompleteBlock, {
              messageId: MESSAGE_ID,
              role: 'assistant',
              block: {
                _tag: 'toolCall',
                toolCallId: 'call-1',
                name: 'lookup-something',
                input: '{}',
                providerExecuted: false,
                pending: false,
                operationKey: 'lookup',
                operationName: 'Lookup',
              },
            });
          }),
        );
        yield* withMeta(
          { pid: 'op-1', parentPid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'lookup', name: 'Lookup' });
            yield* Trace.write(Trace.OperationEnd, { key: 'lookup', name: 'Lookup', outcome: 'success' });
          }),
        );
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );

    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [function] Lookup
      ◆──╯  [atom] Agent completed request
      "
    `);
  });

  /**
   * Failed agent requests surface as an error-level end commit with the failure message.
   */
  test('agent request end with error status renders as error commit', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'hello', pending: false },
          });
          yield* Trace.write(AgentRequestEnd, {
            status: 'error',
            error: 'Unsupported schema AST: UnknownKeyword',
          });
        }),
      ),
    );

    const { commits } = buildExecutionGraph({ traceMessages: messages });
    const endCommit = commits.at(-1);
    expect(endCommit?.message).toBe('Agent request failed: Unsupported schema AST: UnknownKeyword');
    expect(endCommit?.level).toBe(LogLevel.ERROR);
    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [user] hello
      ◆──╯  [atom] Agent request failed: Unsupported schema AST: UnknownKeyword
      "
    `);
  });

  /**
   * Interrupted agent requests surface as a warning-level end commit.
   */
  test('agent request end with interrupted status renders as interrupted commit', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(AgentRequestEnd, { status: 'interrupted' });
        }),
      ),
    );

    const { commits } = buildExecutionGraph({ traceMessages: messages });
    const endCommit = commits.at(-1);
    expect(endCommit?.message).toBe('Agent request interrupted');
    expect(endCommit?.level).toBe(LogLevel.WARN);
    // Begin/end only — collapsible span renders a single end commit on main.
    expect(`\n${renderGraph(messages)}\n`).toMatchInlineSnapshot(`
      "
      ●  [atom] Agent request interrupted
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

describe('buildExecutionGraph collapseCompletedSpans', () => {
  test('completed span with middle status events collapses to a single end commit', ({ expect }) => {
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
            block: { _tag: 'status', statusText: 'writing', pending: false },
          });
          yield* Trace.write(Trace.OperationEnd, { key: 'work', name: 'Work', outcome: 'success' });
        }),
      ),
    );

    const { commits } = buildExecutionGraph({ traceMessages: messages, collapseCompletedSpans: true });
    expect(commits).toHaveLength(1);
    expect(commits[0].message).toBe('Work');
    expect(commits[0].branch).toBe('main');
  });

  test('completed agent span with user message and nested op collapses inner noise', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta(
          { pid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(AgentRequestBegin, {});
            yield* Trace.write(CompleteBlock, {
              messageId: MESSAGE_ID,
              role: 'user',
              block: { _tag: 'text', text: 'hello', pending: false },
            });
          }),
        );
        yield* withMeta(
          { pid: 'op-1', parentPid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'lookup', name: 'Lookup' });
            yield* Trace.write(Trace.OperationEnd, { key: 'lookup', name: 'Lookup', outcome: 'success' });
          }),
        );
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );

    expect(`\n${renderGraph(messages, true)}\n`).toMatchInlineSnapshot(`
      "
      ●  [atom] Agent completed request
      "
    `);
  });

  test('pending span is not collapsed even when collapseCompletedSpans is enabled', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'hello', pending: false },
          });
        }),
      ),
    );

    const { commits } = buildExecutionGraph({ traceMessages: messages, collapseCompletedSpans: true });
    expect(commits).toHaveLength(2);
    expect(commits[0].message).toBe('Agent processing request...');
    expect(commits[1].message).toBe('hello');
  });
});

describe('buildExecutionGraph in-progress shimmer tags', () => {
  test('pending agent begin → effect:shimmer', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
        }),
      ),
    );

    const { commits } = buildExecutionGraph({ traceMessages: messages });
    expect(commits).toHaveLength(1);
    expect(commits[0]?.tags).toContain(SHIMMER_EFFECT_TAG);
  });

  test('pending tool call → effect:shimmer', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: {
              _tag: 'toolCall',
              toolCallId: 'call-1',
              name: 'web-search',
              input: '{"query":"hello"}',
              providerExecuted: false,
              pending: false,
            },
          });
        }),
      ),
    );

    const { commits } = buildExecutionGraph({ traceMessages: messages });
    const toolCall = commits.find((commit) => commit.message === 'web-search');
    expect(toolCall?.tags).toContain(SHIMMER_EFFECT_TAG);
  });

  test('completed operation end → no effect:shimmer', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'worker' },
        Effect.gen(function* () {
          yield* Trace.write(Trace.OperationStart, { key: 'routine', name: 'Lookup' });
          yield* Trace.write(Trace.OperationEnd, { key: 'routine', name: 'Lookup', outcome: 'success' });
        }),
      ),
    );

    const { commits } = buildExecutionGraph({ traceMessages: messages });
    expect(commits.every((commit) => !commit.tags?.includes(SHIMMER_EFFECT_TAG))).toBe(true);
  });

  test('active running process → Running... has effect:shimmer after span subtree', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'worker' },
        Effect.gen(function* () {
          yield* Trace.write(Trace.OperationStart, { key: 'routine', name: 'Lookup' });
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'assistant',
            block: { _tag: 'status', statusText: 'searching', pending: false },
          });
        }),
      ),
    );

    const { commits } = buildExecutionGraph({
      traceMessages: messages,
      activeProcesses: [
        makeActiveProcess({
          pid: Process.ID.make('worker'),
          key: 'worker',
          state: Process.State.RUNNING,
        }),
      ],
    });

    const running = commits.find((commit) => commit.message === 'Running...');
    expect(running?.tags).toContain(SHIMMER_EFFECT_TAG);
    expect(commits.at(-1)).toBe(running);
  });
});
