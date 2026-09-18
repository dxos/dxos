//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { type YieldStrategy, yieldOrContinue } from './yield.ts';

describe('yieldOrContinue', () => {
  let now = 0;

  beforeEach(async () => {
    now = 1_000_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('continues within the strategy budget and yields once it is spent', async ({ expect }) => {
    expect(await yielded('idle')).toBe(false);
    now += 4;
    expect(await yielded('idle')).toBe(false);
    now += 2;
    expect(await yielded('idle')).toBe(true);
  });

  test('gives each strategy its own budget', async ({ expect }) => {
    expect(await yielded('smooth')).toBe(false);
    now += 10;
    expect(await yielded('smooth')).toBe(false);
    expect(await yielded('idle')).toBe(true);

    expect(await yielded('interactive')).toBe(false);
    now += 50;
    expect(await yielded('interactive')).toBe(false);
    expect(await yielded('smooth')).toBe(true);
  });

  test('does not count time the event loop spent idle', async ({ expect }) => {
    expect(await yielded('idle')).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    now += 1_000;
    expect(await yielded('idle')).toBe(false);
  });

  test('yields every call made after the budget is spent in the same turn', async ({ expect }) => {
    expect(await yielded('idle')).toBe(false);
    now += 6;
    expect(await Promise.all([yielded('idle'), yielded('idle')])).toEqual([true, true]);
  });
});

const yielded = async (strategy: YieldStrategy): Promise<boolean> => {
  let ran = false;
  setTimeout(() => {
    ran = true;
  }, 0);
  await yieldOrContinue(strategy);
  return ran;
};
