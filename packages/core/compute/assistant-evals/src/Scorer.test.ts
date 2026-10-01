//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ToolInvocation } from './assertions.ts';
import * as Scorer from './Scorer.ts';

const call = (overrides: Partial<ToolInvocation>): ToolInvocation => ({ name: 'eval', input: '{}', ...overrides });

describe('Scorer.failedCall', () => {
  test('a tool error is a failure', ({ expect }) => {
    expect(Scorer.failedCall(call({ error: 'boom' }))).toBe(true);
  });

  test('a result reporting `ok: false` is a failure, as a JSON string or parsed', ({ expect }) => {
    expect(Scorer.failedCall(call({ result: JSON.stringify({ output: 'Error: boom', ok: false }) }))).toBe(true);
    expect(Scorer.failedCall(call({ result: { output: 'Error: boom', ok: false } }))).toBe(true);
  });

  test('any other result is a success', ({ expect }) => {
    expect(Scorer.failedCall(call({ result: JSON.stringify({ output: 'done', ok: true }) }))).toBe(false);
    expect(Scorer.failedCall(call({ result: 'plain text' }))).toBe(false);
    expect(Scorer.failedCall(call({ result: undefined }))).toBe(false);
  });
});
