//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { AgentRequestBegin, AgentRequestEnd } from '@dxos/assistant';
import { Trace } from '@dxos/compute';

import { ROOT_SPAN_ID, buildSpanTree, collectSpanTreeEventsCategorically, flattenSpanTree } from './span-tree';
import { collectTraceEvents, withMeta } from './testing';

const NoteEvent = Trace.EventType('note', {
  schema: Schema.Struct({
    text: Schema.optional(Schema.String),
    index: Schema.optional(Schema.Number),
  }),
  isEphemeral: false,
});

const FooEvent = Trace.EventType('foo', {
  schema: Schema.Struct({}),
  isEphemeral: false,
});

describe('buildSpanTree', () => {
  test('returns a root span for empty input', ({ expect }) => {
    const tree = buildSpanTree([]);
    expect(tree.id).toBe(ROOT_SPAN_ID);
    expect(tree.children).toEqual([]);
    expect(tree.events).toEqual([]);
  });

  test('events without pid attach to root span', ({ expect }) => {
    const messages = collectTraceEvents(Trace.write(FooEvent, {}));
    const tree = buildSpanTree(messages);
    expect(tree.children).toEqual([]);
    expect(tree.events).toHaveLength(1);
    expect(tree.events[0].type).toBe('foo');
  });

  test('a single operation start/end pair produces one span under root', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'op-1' },
        Effect.gen(function* () {
          yield* Trace.write(Trace.OperationStart, { key: 'reply', name: 'Reply' });
          yield* Trace.write(Trace.OperationEnd, { key: 'reply', name: 'Reply', outcome: 'success' });
        }),
      ),
    );
    const tree = buildSpanTree(messages);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].meta.pid).toBe('op-1');
    expect(tree.children[0].events).toHaveLength(2);
    expect(tree.children[0].children).toEqual([]);
  });

  test('a nested operation attaches to its open parent', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestBegin, {}));
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
    const tree = buildSpanTree(messages);
    expect(tree.children).toHaveLength(1);
    const agentSpan = tree.children[0];
    expect(agentSpan.meta.pid).toBe('agent-1');
    expect(agentSpan.children).toHaveLength(1);
    expect(agentSpan.children[0].meta.pid).toBe('op-1');
    expect(agentSpan.children[0].events).toHaveLength(2);
  });

  test('sequential agent requests in one process become sibling spans', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
        }),
      ),
    );
    const tree = buildSpanTree(messages);
    expect(tree.children).toHaveLength(2);
    expect(tree.children.every((child) => child.meta.pid === 'agent-1')).toBe(true);
    // Span ids are distinct even though pids are shared.
    expect(tree.children[0].id).not.toBe(tree.children[1].id);
  });

  test('non-boundary events attach to the currently-open span', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(NoteEvent, {});
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
        }),
      ),
    );
    const tree = buildSpanTree(messages);
    expect(tree.children[0].events).toHaveLength(3);
    expect(tree.children[0].events.map((event) => event.type)).toEqual([
      AgentRequestBegin.key,
      'note',
      AgentRequestEnd.key,
    ]);
  });

  test('non-boundary event without an open span lands on root', ({ expect }) => {
    const messages = collectTraceEvents(withMeta({ pid: 'orphan-pid' }, Trace.write(NoteEvent, {})));
    const tree = buildSpanTree(messages);
    expect(tree.children).toEqual([]);
    expect(tree.events).toHaveLength(1);
    expect(tree.events[0].type).toBe('note');
  });

  test('end event without a matching begin attaches to root', ({ expect }) => {
    const messages = collectTraceEvents(
      withMeta({ pid: 'op-1' }, Trace.write(Trace.OperationEnd, { key: 'reply', name: 'Reply', outcome: 'success' })),
    );
    const tree = buildSpanTree(messages);
    expect(tree.children).toEqual([]);
    expect(tree.events).toHaveLength(1);
  });

  test('sorts sibling spans chronologically by their first event', ({ expect }) => {
    // Build events in chronological order, then reverse the message array before feeding
    // into `buildSpanTree` to verify that the algorithm orders siblings by their first
    // event's timestamp rather than by input order.
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta(
          { pid: 'op-early' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'a' });
            yield* Trace.write(Trace.OperationEnd, { key: 'a', outcome: 'success' });
          }),
        );
        yield* withMeta(
          { pid: 'op-late' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'b' });
            yield* Trace.write(Trace.OperationEnd, { key: 'b', outcome: 'success' });
          }),
        );
      }),
    );
    const tree = buildSpanTree([...messages].reverse());
    expect(tree.children.map((child) => child.meta.pid)).toEqual(['op-early', 'op-late']);
  });

  test('eventLimit drops oldest non-boundary events but always retains span boundaries', ({ expect }) => {
    // Three non-boundary events (`note 1..3`), all boundary events should be kept regardless.
    // With `eventLimit: 1`, only the most recent `note` should survive.
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent-1' },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(NoteEvent, { text: 'note 1' });
          yield* Trace.write(NoteEvent, { text: 'note 2' });
          yield* Trace.write(NoteEvent, { text: 'note 3' });
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
        }),
      ),
    );
    const tree = buildSpanTree(messages, { eventLimit: 1 });
    expect(tree.children).toHaveLength(1);
    const agentSpan = tree.children[0];
    expect(agentSpan.events.map((event) => event.type)).toEqual([AgentRequestBegin.key, 'note', AgentRequestEnd.key]);
    expect((agentSpan.events[1].data as { text: string }).text).toBe('note 3');
  });

  test('eventLimit preserves parent-child structure when the parent begin is older than the window', ({ expect }) => {
    // Regression: previously `events.slice(-eventLimit)` would drop the parent's begin event
    // when the limit fell mid-span, orphaning every child span onto root. The fix retains all
    // boundary events so the parent stays open and children remain nested.
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta(
          { pid: 'parent-1' },
          Effect.gen(function* () {
            yield* Trace.write(AgentRequestBegin, {});
            for (let index = 0; index < 20; index += 1) {
              yield* Trace.write(NoteEvent, { index });
            }
          }),
        );
        yield* withMeta(
          { pid: 'child-1', parentPid: 'parent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'lookup', name: 'Lookup' });
            yield* Trace.write(Trace.OperationEnd, { key: 'lookup', name: 'Lookup', outcome: 'success' });
          }),
        );
        yield* withMeta({ pid: 'parent-1' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );
    const tree = buildSpanTree(messages, {
      // Limit far below the 20 `note` events — naive slicing would drop the parent's begin.
      eventLimit: 2,
    });
    expect(tree.children).toHaveLength(1);
    const parentSpan = tree.children[0];
    expect(parentSpan.meta.pid).toBe('parent-1');
    expect(parentSpan.children).toHaveLength(1);
    expect(parentSpan.children[0].meta.pid).toBe('child-1');
    expect(parentSpan.children[0].events.map((event) => event.type)).toEqual([
      Trace.OperationStart.key,
      Trace.OperationEnd.key,
    ]);
  });

  test('flattenSpanTree returns root + all descendants in depth-first order', ({ expect }) => {
    const messages = collectTraceEvents(
      Effect.gen(function* () {
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestBegin, {}));
        yield* withMeta(
          { pid: 'op-1', parentPid: 'agent-1' },
          Effect.gen(function* () {
            yield* Trace.write(Trace.OperationStart, { key: 'a' });
            yield* Trace.write(Trace.OperationEnd, { key: 'a', outcome: 'success' });
          }),
        );
        yield* withMeta({ pid: 'agent-1' }, Trace.write(AgentRequestEnd, { status: 'success' }));
      }),
    );
    const tree = buildSpanTree(messages);
    const order = flattenSpanTree(tree);
    expect(order[0].id).toBe(ROOT_SPAN_ID);
    expect(order[1].meta.pid).toBe('agent-1');
    expect(order[2].meta.pid).toBe('op-1');
    expect(order).toHaveLength(3);
  });

  test('collectSpanTreeEventsCategorically emits begin, child subtrees, then remaining events', ({ expect }) => {
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

    const tree = buildSpanTree(messages);
    const order = collectSpanTreeEventsCategorically(tree).map(({ span, event }) => ({
      pid: span.meta.pid ?? ROOT_SPAN_ID,
      type: event.type,
    }));

    expect(order).toEqual([
      { pid: 'parent-1', type: Trace.OperationStart.key },
      { pid: 'child-1', type: Trace.OperationStart.key },
      { pid: 'child-1', type: Trace.OperationEnd.key },
      { pid: 'parent-1', type: Trace.OperationEnd.key },
    ]);
  });
});
