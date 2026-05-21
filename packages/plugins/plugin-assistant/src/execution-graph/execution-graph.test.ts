//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Trace } from '@dxos/compute';
import { ObjectId } from '@dxos/keys';
import { type Commit, renderTimelineAscii } from '@dxos/react-ui-components';

import { CommitSelector, buildExecutionGraph } from './execution-graph';
import { collectTraceEvents, withMeta } from './testing';

ObjectId.dangerouslyDisableRandomness();

const makeCommit = (id: string, opts: Partial<Commit> = {}): Commit => ({
  id,
  branch: opts.branch ?? 'main',
  message: opts.message ?? id,
  ...opts,
});

const ids = (commits: Commit[]) => commits.map((commit) => commit.id);

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
      ●  [function] Reply - Success
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
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, {}));
      }),
    );
    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    expect(branches).toEqual(['main', 'agent-1']);
    expect(`\n${renderTimelineAscii(commits, branches)}\n`).toMatchInlineSnapshot(`
      "
      ●     [atom] Agent processing request...
      ├──●  [user] hello
      │  ●  [function] Lookup - Success
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
    expect(commits[1].branch).toBe('agent-1');
    expect(commits[2].branch).toBe('agent-1');
    expect(commits[2].message).toBe('hello');
  });

  test('orders sub-spans chronologically under their parent', ({ expect }) => {
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
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, {}));
      }),
    );
    const { commits } = buildExecutionGraph({ traceMessages: messages });
    // After collapsing, expect: AgentBegin, Op1.End, Op2.End, AgentEnd → 4 commits.
    expect(commits.map((commit) => commit.message)).toEqual([
      'Agent processing request...',
      'A - Success',
      'B - Success',
      'Agent completed request',
    ]);
  });
});
