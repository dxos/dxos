//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedProtocol } from '@dxos/protocols';

import { type IndexPassResult, IndexScheduler } from './index-scheduler.ts';

describe('IndexScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = async (result: IndexPassResult = { done: true, drained: true }) => {
    const feedBlocks = new Event<{ spaceId: string; feedNamespace?: string }>();
    const documentsSaved = new Event();
    const runPass = vi.fn(async (_ctx: Context, _reasons: Record<string, number>) => result);
    const scheduler = new IndexScheduler({
      feedBlocks,
      isIndexedNamespace: FeedProtocol.isIndexedNamespace,
      documentsSaved,
      runPass,
    });
    await scheduler.open(Context.default());
    onTestFinished(async () => {
      await scheduler.close();
    });
    // The pass every open starts.
    await vi.advanceTimersByTimeAsync(0);
    expect(runPass).toHaveBeenCalledTimes(1);
    runPass.mockClear();
    const emitBlocks = (feedNamespace: string) => feedBlocks.emit({ spaceId: 'space', feedNamespace });
    return { scheduler, runPass, emitBlocks, documentsSaved };
  };

  // An agent turn appends trace messages continuously; a pass per append kept the worker saturated.
  test('starts no pass for appends to a namespace the index does not read', async () => {
    const { scheduler, runPass, emitBlocks } = await setup();
    for (let i = 0; i < 5; i++) {
      emitBlocks(FeedProtocol.WellKnownNamespaces.trace);
    }
    await vi.runAllTimersAsync();
    expect(runPass).not.toHaveBeenCalled();

    // Nor are they inputs a caller waits for.
    await scheduler.waitForIndexed('feed-scoped-query');
    expect(runPass).not.toHaveBeenCalled();
  });

  test('runs data appends and saves without delay', async () => {
    const { runPass, emitBlocks, documentsSaved } = await setup();
    emitBlocks(FeedProtocol.WellKnownNamespaces.data);
    documentsSaved.emit();
    await vi.advanceTimersByTimeAsync(0);
    expect(runPass).toHaveBeenCalledTimes(1);
    expect(runPass.mock.calls[0][1]).toEqual({ 'feed-blocks': 1, 'documents-saved': 1 });
  });

  test('continues a pass that left a backlog', async () => {
    const { runPass, documentsSaved } = await setup();
    runPass.mockResolvedValueOnce({ done: false, drained: false });
    documentsSaved.emit();
    await vi.runAllTimersAsync();
    expect(runPass).toHaveBeenCalledTimes(2);
    expect(runPass.mock.calls[1][1]).toEqual({ 'batch-continuation': 1 });
  });
});
