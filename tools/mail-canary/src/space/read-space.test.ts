//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { runInNewContext } from 'node:vm';
import { describe, test } from 'vitest';

import { GMAIL_SOURCE, SYNC_OPERATION_KEY, readSpaceProgram } from './read-space.ts';

type Row = Record<string, any>;

/**
 * Runs the program the way the code-mode Effect dialect does (a generator body with the dialect's
 * bindings in scope), against in-memory stand-ins for the space.
 */
const evaluate = (
  program: string,
  space: { mailbox: Row[]; mailboxFeed: Row[]; traceFeed: Row[]; triggers: Row[] },
) => {
  const printed: string[] = [];
  // State lives under `state` so the builder's own `skip`/`limit` methods cannot shadow its values.
  const query = (state: Row = {}): Row => ({
    state,
    orderBy: (order: Row) => query({ ...state, order }),
    skip: (skip: number) => query({ ...state, skip }),
    limit: (limit: number) => query({ ...state, limit }),
    from: (feed: Row) => query({ ...state, feed }),
  });
  const rowsFor = (state: Row): Row[] => {
    if (state.feed) {
      const rows = [...(state.feed === space.mailbox[0]?.feedObject ? space.mailboxFeed : space.traceFeed)].reverse();
      return rows.slice(state.skip ?? 0, (state.skip ?? 0) + (state.limit ?? rows.length));
    }
    const typename = state.filter?.typename ?? state.typename;
    if (typename === 'org.dxos.type.mailbox') {
      return space.mailbox;
    }
    if (typename === 'org.dxos.type.trigger') {
      return space.triggers;
    }
    return typename === 'org.dxos.type.feed' ? [{ id: 'trace-feed' }] : [];
  };
  const bindings = {
    Effect,
    Database: {
      query: (selection: Row) => ({ run: Effect.succeed(rowsFor(selection.state ?? { filter: selection })) }),
      load: () => Effect.succeed(space.mailbox[0]?.feedObject),
    },
    Filter: { type: (dxn: Row, props?: Row) => ({ typename: dxn.typename, props }) },
    Query: { select: (filter: Row) => query({ filter }) },
    Order: { natural: (direction: string) => ({ direction }) },
    Obj: { getMeta: (row: Row) => ({ keys: row.keys ?? [] }) },
    DXN: { make: (typename: string) => ({ typename }) },
    print: (value: string) => Effect.sync(() => printed.push(value)),
  };
  const run = runInNewContext(`Effect.gen(function* () {\n${program}\n})`, bindings);
  Effect.runSync(run);
  return JSON.parse(printed[0]);
};

const SINCE = 1_000_000;

const message = (index: number) => ({
  keys: [{ source: GMAIL_SOURCE, id: `g${index}` }],
  properties: { subject: `subject ${index}` },
  sender: { email: `sender${index}@enron.com` },
});

const traceMessage = (pid: string, type: string, timestamp: number, data: Row = {}) => ({
  id: `${pid}-${type}`,
  meta: { pid },
  events: [{ type, timestamp, data: { key: `dxn:${SYNC_OPERATION_KEY}`, ...data } }],
});

describe('readSpaceProgram', () => {
  const feedObject = { id: 'mailbox-feed' };
  const space = {
    mailbox: [{ id: 'mailbox', feed: 'ref', feedObject }],
    mailboxFeed: [...Array.from({ length: 120 }, (_, index) => message(index)), { keys: [] }],
    traceFeed: [
      traceMessage('old', 'operation.start', SINCE - 5),
      traceMessage('old', 'operation.end', SINCE - 4, { outcome: 'success' }),
      ...Array.from({ length: 60 }, (_, index) => [
        traceMessage(`run-${index}`, 'operation.start', SINCE + index * 10),
        traceMessage(`run-${index}`, 'operation.end', SINCE + index * 10 + 5, {
          outcome: index === 7 ? 'failure' : 'success',
          error: index === 7 ? 'RepoClosedError' : undefined,
        }),
      ]).flat(),
      {
        id: 'other',
        meta: { pid: 'other' },
        events: [{ type: 'operation.start', timestamp: SINCE + 1, data: { key: 'org.dxos.operation.other' } }],
      },
    ],
    triggers: [
      { id: 'sync', spec: { kind: 'timer' }, remote: true, enabled: true },
      { id: 'local', spec: { kind: 'timer' }, enabled: true },
    ],
  };

  test('reads every keyed mailbox message across pages', ({ expect }) => {
    const snapshot = evaluate(readSpaceProgram({ since: SINCE, maxMessages: 1_000 }), space);
    expect(snapshot.mailboxFound).toBe(true);
    expect(snapshot.messages).toHaveLength(120);
    expect(snapshot.messages).toContainEqual({ gmailId: 'g7', subject: 'subject 7', sender: 'sender7@enron.com' });
  });

  test('stops after maxMessages rows, counting rows without a Gmail key', ({ expect }) => {
    const snapshot = evaluate(readSpaceProgram({ since: SINCE, maxMessages: 50 }), space);
    expect(snapshot.messages).toHaveLength(49);
    expect(snapshot.messages[0].gmailId).toBe('g119');
  });

  test('reads mail sync events inside the window only', ({ expect }) => {
    const snapshot = evaluate(readSpaceProgram({ since: SINCE, maxMessages: 10 }), space);
    expect(snapshot.events).toHaveLength(120);
    expect(snapshot.events.some((event: Row) => event.pid === 'old' || event.pid === 'other')).toBe(false);
    expect(snapshot.events).toContainEqual({
      pid: 'run-7',
      type: 'end',
      timestamp: SINCE + 75,
      outcome: 'failure',
      error: 'RepoClosedError',
    });
  });

  test('reports the remote timer trigger only', ({ expect }) => {
    const snapshot = evaluate(readSpaceProgram({ since: SINCE, maxMessages: 10 }), space);
    expect(snapshot.triggers).toEqual([{ id: 'sync', enabled: true }]);
  });
});
