//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LogLevel } from './config';
import { LogEntry, getContextFromEntry } from './context';

const meta = { F: 'test.ts', L: 1, S: undefined };

const entry = (init: { context?: any; error?: Error }) =>
  new LogEntry({ level: LogLevel.ERROR, message: 'test', meta, ...init });

describe('getContextFromEntry', () => {
  test('lifts context from an error passed as the entry context', ({ expect }) => {
    const error = Object.assign(new Error('boom'), { context: { phase: 'awaiting-lock' } });
    expect(getContextFromEntry(entry({ context: error }))).toMatchObject({ phase: 'awaiting-lock' });
  });

  test('lifts context from an error passed inside the context object', ({ expect }) => {
    const error = Object.assign(new Error('boom'), { context: { phase: 'session-failed' } });
    const context = getContextFromEntry(entry({ context: { error, tag: 'x' } }));

    // The shape `log.error(msg, { error, ... })` produces; previously the phase was dropped here.
    expect(context).toMatchObject({ phase: 'session-failed', tag: 'x' });
  });

  test('lifts context from entry.error, which is what log.catch sets', ({ expect }) => {
    const error = Object.assign(new Error('boom'), { context: { phase: 'port-timeout' } });
    expect(getContextFromEntry(entry({ error }))).toMatchObject({ phase: 'port-timeout' });
  });

  test("the call's own keys win over the error's", ({ expect }) => {
    const error = Object.assign(new Error('boom'), { context: { phase: 'from-error' } });
    const context = getContextFromEntry(entry({ context: { error, phase: 'from-call' } }));

    expect(context?.phase).toBe('from-call');
  });

  test('an error without context contributes nothing', ({ expect }) => {
    expect(getContextFromEntry(entry({ context: { error: new Error('boom'), tag: 'x' } }))).toMatchObject({ tag: 'x' });
  });
});
