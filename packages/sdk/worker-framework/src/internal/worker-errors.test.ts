//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { workerErrorFromEvent } from './worker-errors';

describe('workerErrorFromEvent', () => {
  test('passes a real error through unchanged', ({ expect }) => {
    const thrown = new Error('worker body threw');
    const event = { error: thrown, message: 'Uncaught Error', filename: 'worker.js', lineno: 1, colno: 1 };
    expect(workerErrorFromEvent(event, 'dedicated')).toBe(thrown);
  });

  test('synthesizes an error when the event carries none', ({ expect }) => {
    const event = { error: null, message: 'Script error.', filename: 'https://app/worker.js', lineno: 1, colno: 2 };
    const error = workerErrorFromEvent(event, 'coordinator');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('coordinator worker error: Script error. (https://app/worker.js:1:2)');
    expect(error.cause).toBeUndefined();
  });

  test('synthesizes an error when the event carries nothing at all', ({ expect }) => {
    const event = { error: null, message: '', filename: '', lineno: 0, colno: 0 };
    const error = workerErrorFromEvent(event, 'coordinator');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('coordinator worker error: unknown error');
  });

  test('carries a non-Error thrown value as the cause rather than dropping it', ({ expect }) => {
    const event = { error: 'boom', message: 'Uncaught boom', filename: 'worker.js', lineno: 3, colno: 4 };
    const error = workerErrorFromEvent(event, 'dedicated');

    expect(error).toBeInstanceOf(Error);
    expect(error.cause).toBe('boom');
  });
});
