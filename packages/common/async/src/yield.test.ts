//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { yieldOrContinue } from './yield.ts';

/** Whether a timer queued before the call ran before the call resolved, i.e. whether it yielded. */
const yielded = async (strategy: Parameters<typeof yieldOrContinue>[0]): Promise<boolean> => {
  let ran = false;
  setTimeout(() => {
    ran = true;
  }, 0);
  await yieldOrContinue(strategy);
  return ran;
};

describe('yieldOrContinue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('continues within the strategy budget and yields once it is spent', async ({ expect }) => {
    let now = 1_000_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    now += 1_000;
    expect(await yielded('idle')).toBe(true);

    now += 4;
    expect(await yielded('idle')).toBe(false);
    now += 2;
    expect(await yielded('idle')).toBe(true);
  });

  test('gives each strategy its own budget', async ({ expect }) => {
    let now = 2_000_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    now += 1_000;
    await yieldOrContinue('idle');

    now += 10;
    expect(await yielded('smooth')).toBe(false);
    expect(await yielded('idle')).toBe(true);
    now += 50;
    expect(await yielded('interactive')).toBe(false);
    expect(await yielded('smooth')).toBe(true);
  });
});
