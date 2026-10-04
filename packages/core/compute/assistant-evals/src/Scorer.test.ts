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

  test('any result is a success', ({ expect }) => {
    expect(Scorer.failedCall(call({ result: JSON.stringify('done') }))).toBe(false);
    expect(Scorer.failedCall(call({ result: 'plain text' }))).toBe(false);
    expect(Scorer.failedCall(call({ result: undefined }))).toBe(false);
  });
});
