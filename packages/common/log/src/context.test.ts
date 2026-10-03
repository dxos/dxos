//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LogLevel } from './config.ts';
import { LogEntry, getContextFromEntry } from './context.ts';

const meta = { F: 'test.ts', L: 1, S: undefined };

const entry = (init: { context?: unknown; error?: Error }) =>
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

describe('computedError', () => {
  test('keeps the message when the stack is frames only, as in JavaScriptCore and SpiderMonkey', ({ expect }) => {
    const error = Object.assign(new Error('boom'), { stack: 'fail@app.js:1:2\nrun@app.js:3:4' });
    expect(entry({ error }).computedError).toBe('Error: boom\nfail@app.js:1:2\nrun@app.js:3:4');
  });

  test('does not repeat the message a V8 stack already opens with', ({ expect }) => {
    const error = Object.assign(new Error('boom'), { stack: 'Error: boom\n    at fail (app.js:1:2)' });
    expect(entry({ error }).computedError).toBe('Error: boom\n    at fail (app.js:1:2)');
  });

  test('falls back to the name and message when there is no stack', ({ expect }) => {
    const error = Object.assign(new TypeError('boom'), { stack: '' });
    expect(entry({ error }).computedError).toBe('TypeError: boom');
  });
});

describe('computedContext', () => {
  test('renders a context Error with its message and cause chain', ({ expect }) => {
    const root = Object.assign(new Error('no route'), { stack: '' });
    const cause = Object.assign(new Error('ICE timeout', { cause: root }), { stack: 'connect@worker.js:10:3' });
    expect(entry({ context: { cause } }).computedContext.cause).toBe(
      'Error: ICE timeout\nconnect@worker.js:10:3\nCaused by: Error: no route',
    );
  });
});
