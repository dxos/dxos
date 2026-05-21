//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AgentRequestBegin, AgentRequestEnd } from '@dxos/assistant';
import { Trace } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { ROOT_SPAN_ID, buildSpanTree, flattenSpanTree } from './span-tree';

const makeMessage = (
  meta: Trace.Meta,
  events: Array<{ type: string; timestamp: number; data?: unknown }>,
  isEphemeral = false,
): Trace.Message =>
  Obj.make(Trace.Message, {
    meta,
    isEphemeral,
    events: events.map((event) => ({
      type: event.type,
      timestamp: event.timestamp,
      data: event.data ?? {},
    })),
  });

const opStart = (key: string, name?: string) => ({
  type: Trace.OperationStart.key,
  data: { key, name },
});
const opEnd = (key: string, name?: string, outcome: 'success' | 'failure' = 'success') => ({
  type: Trace.OperationEnd.key,
  data: { key, name, outcome },
});
const agentBegin = () => ({ type: AgentRequestBegin.key, data: {} });
const agentEnd = () => ({ type: AgentRequestEnd.key, data: {} });

describe('buildSpanTree', () => {
  test('returns a root span for empty input', ({ expect }) => {
    const tree = buildSpanTree([]);
    expect(tree.id).toBe(ROOT_SPAN_ID);
    expect(tree.children).toEqual([]);
    expect(tree.events).toEqual([]);
  });

  test('events without pid attach to root span', ({ expect }) => {
    const tree = buildSpanTree([makeMessage({}, [{ type: 'foo', timestamp: 1 }])]);
    expect(tree.children).toEqual([]);
    expect(tree.events).toHaveLength(1);
    expect(tree.events[0].type).toBe('foo');
  });

  test('a single operation start/end pair produces one span under root', ({ expect }) => {
    const tree = buildSpanTree([
      makeMessage({ pid: 'op-1' }, [{ ...opStart('reply', 'Reply'), timestamp: 1 }]),
      makeMessage({ pid: 'op-1' }, [{ ...opEnd('reply', 'Reply'), timestamp: 2 }]),
    ]);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].meta.pid).toBe('op-1');
    expect(tree.children[0].events).toHaveLength(2);
    expect(tree.children[0].children).toEqual([]);
  });

  test('a nested operation attaches to its open parent', ({ expect }) => {
    const tree = buildSpanTree([
      makeMessage({ pid: 'agent-1' }, [{ ...agentBegin(), timestamp: 1 }]),
      makeMessage({ pid: 'op-1', parentPid: 'agent-1' }, [{ ...opStart('lookup', 'Lookup'), timestamp: 2 }]),
      makeMessage({ pid: 'op-1', parentPid: 'agent-1' }, [{ ...opEnd('lookup', 'Lookup'), timestamp: 3 }]),
      makeMessage({ pid: 'agent-1' }, [{ ...agentEnd(), timestamp: 4 }]),
    ]);
    expect(tree.children).toHaveLength(1);
    const agentSpan = tree.children[0];
    expect(agentSpan.meta.pid).toBe('agent-1');
    expect(agentSpan.children).toHaveLength(1);
    expect(agentSpan.children[0].meta.pid).toBe('op-1');
    expect(agentSpan.children[0].events).toHaveLength(2);
  });

  test('sequential agent requests in one process become sibling spans', ({ expect }) => {
    const tree = buildSpanTree([
      makeMessage({ pid: 'agent-1' }, [{ ...agentBegin(), timestamp: 1 }]),
      makeMessage({ pid: 'agent-1' }, [{ ...agentEnd(), timestamp: 2 }]),
      makeMessage({ pid: 'agent-1' }, [{ ...agentBegin(), timestamp: 3 }]),
      makeMessage({ pid: 'agent-1' }, [{ ...agentEnd(), timestamp: 4 }]),
    ]);
    expect(tree.children).toHaveLength(2);
    expect(tree.children.every((child) => child.meta.pid === 'agent-1')).toBe(true);
    // Span ids are distinct even though pids are shared.
    expect(tree.children[0].id).not.toBe(tree.children[1].id);
  });

  test('non-boundary events attach to the currently-open span', ({ expect }) => {
    const tree = buildSpanTree([
      makeMessage({ pid: 'agent-1' }, [{ ...agentBegin(), timestamp: 1 }]),
      makeMessage({ pid: 'agent-1' }, [{ type: 'note', timestamp: 2 }]),
      makeMessage({ pid: 'agent-1' }, [{ ...agentEnd(), timestamp: 3 }]),
    ]);
    expect(tree.children[0].events).toHaveLength(3);
    expect(tree.children[0].events.map((event) => event.type)).toEqual([
      AgentRequestBegin.key,
      'note',
      AgentRequestEnd.key,
    ]);
  });

  test('non-boundary event without an open span lands on root', ({ expect }) => {
    const tree = buildSpanTree([makeMessage({ pid: 'orphan-pid' }, [{ type: 'note', timestamp: 1 }])]);
    expect(tree.children).toEqual([]);
    expect(tree.events).toHaveLength(1);
    expect(tree.events[0].type).toBe('note');
  });

  test('end event without a matching begin attaches to root', ({ expect }) => {
    const tree = buildSpanTree([makeMessage({ pid: 'op-1' }, [{ ...opEnd('reply', 'Reply'), timestamp: 1 }])]);
    expect(tree.children).toEqual([]);
    expect(tree.events).toHaveLength(1);
  });

  test('sorts sibling spans chronologically by their first event', ({ expect }) => {
    const tree = buildSpanTree([
      makeMessage({ pid: 'op-late' }, [
        { ...opStart('b'), timestamp: 10 },
        { ...opEnd('b'), timestamp: 11 },
      ]),
      makeMessage({ pid: 'op-early' }, [
        { ...opStart('a'), timestamp: 1 },
        { ...opEnd('a'), timestamp: 2 },
      ]),
    ]);
    expect(tree.children.map((child) => child.meta.pid)).toEqual(['op-early', 'op-late']);
  });

  test('eventLimit drops oldest non-boundary events but always retains span boundaries', ({ expect }) => {
    // Three non-boundary events (`note 1..3`), all boundary events should be kept regardless.
    // With `eventLimit: 1`, only the most recent `note` should survive.
    const tree = buildSpanTree(
      [
        makeMessage({ pid: 'agent-1' }, [
          { ...agentBegin(), timestamp: 1 },
          { type: 'note', timestamp: 2, data: { text: 'note 1' } },
          { type: 'note', timestamp: 3, data: { text: 'note 2' } },
          { type: 'note', timestamp: 4, data: { text: 'note 3' } },
          { ...agentEnd(), timestamp: 5 },
        ]),
      ],
      { eventLimit: 1 },
    );
    expect(tree.children).toHaveLength(1);
    const agentSpan = tree.children[0];
    expect(agentSpan.events.map((event) => event.type)).toEqual([
      AgentRequestBegin.key,
      'note',
      AgentRequestEnd.key,
    ]);
    expect((agentSpan.events[1].data as { text: string }).text).toBe('note 3');
  });

  test('eventLimit preserves parent-child structure when the parent begin is older than the window', ({ expect }) => {
    // Regression: previously `events.slice(-eventLimit)` would drop the parent's begin event
    // when the limit fell mid-span, orphaning every child span onto root. The fix retains all
    // boundary events so the parent stays open and children remain nested.
    const noise = Array.from({ length: 20 }, (_, index) => ({
      type: 'note',
      timestamp: 2 + index,
      data: { index },
    }));
    const tree = buildSpanTree(
      [
        makeMessage({ pid: 'parent-1' }, [{ ...agentBegin(), timestamp: 1 }, ...noise]),
        makeMessage({ pid: 'child-1', parentPid: 'parent-1' }, [
          { ...opStart('lookup', 'Lookup'), timestamp: 100 },
          { ...opEnd('lookup', 'Lookup'), timestamp: 101 },
        ]),
        makeMessage({ pid: 'parent-1' }, [{ ...agentEnd(), timestamp: 200 }]),
      ],
      // Limit far below the 20 `note` events — naive slicing would drop the parent's begin.
      { eventLimit: 2 },
    );
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
    const tree = buildSpanTree([
      makeMessage({ pid: 'agent-1' }, [{ ...agentBegin(), timestamp: 1 }]),
      makeMessage({ pid: 'op-1', parentPid: 'agent-1' }, [
        { ...opStart('a'), timestamp: 2 },
        { ...opEnd('a'), timestamp: 3 },
      ]),
      makeMessage({ pid: 'agent-1' }, [{ ...agentEnd(), timestamp: 4 }]),
    ]);
    const order = flattenSpanTree(tree);
    expect(order[0].id).toBe(ROOT_SPAN_ID);
    expect(order[1].meta.pid).toBe('agent-1');
    expect(order[2].meta.pid).toBe('op-1');
    expect(order).toHaveLength(3);
  });
});
