//
// Copyright 2026 DXOS.org
//

import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { ContentBlock } from '@dxos/types';

import { Outbox, PromptCancelledError } from './outbox.ts';

/** A dispatch the test settles by hand, recording the order prompts reached it in. */
const createDispatch = () => {
  const started: string[] = [];
  const pending = new Map<string, { resolve: () => void; reject: (error: unknown) => void }>();
  const waiters = new Map<string, () => void>();
  const dispatch = (text: string) =>
    new Promise<void>((resolve, reject) => {
      started.push(text);
      pending.set(text, { resolve, reject });
      waiters.get(text)?.();
    });
  /** Settles when the dispatch of `text` starts (again). */
  const reached = (text: string) => new Promise<void>((resolve) => waiters.set(text, resolve));
  return { started, pending, dispatch, reached };
};

const blocks = (text: string) => [ContentBlock.Text.make({ text })];

describe('Outbox', () => {
  test('an added prompt is listed synchronously, before its dispatch has done anything', ({ expect }) => {
    const registry = AtomRegistry.make();
    const { dispatch } = createDispatch();
    const outbox = new Outbox(registry, dispatch);

    const entry = outbox.add('hello', { blocks: blocks('hello'), known: new Set() });
    expect(registry.get(outbox.entries)).toEqual([entry]);
    expect(entry.state).toBe('sending');
  });

  test('dispatches one at a time in submit order, each after the previous is submitted', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const { started, pending, dispatch, reached } = createDispatch();
    const outbox = new Outbox(registry, dispatch);

    const first = reached('first');
    outbox.add('first', { blocks: blocks('first'), known: new Set() });
    outbox.add('second', { blocks: blocks('second'), known: new Set() });
    await first;
    expect(started).toEqual(['first']);

    const second = reached('second');
    pending.get('first')?.resolve();
    await second;
    expect(started).toEqual(['first', 'second']);
    expect(registry.get(outbox.entries).map(({ state }) => state)).toEqual(['submitted', 'sending']);
  });

  test('a failure is recorded on its entry and does not hold up the prompts behind it', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const { started, pending, dispatch, reached } = createDispatch();
    const outbox = new Outbox(registry, dispatch);

    const reachedFirst = reached('first');
    const first = outbox.add('first', { blocks: blocks('first'), known: new Set() });
    outbox.add('second', { blocks: blocks('second'), known: new Set() });
    await reachedFirst;

    const reachedSecond = reached('second');
    pending.get('first')?.reject(new Error('offline'));
    await reachedSecond;

    expect(started).toEqual(['first', 'second']);
    expect(outbox.get(first.id)?.state).toBe('failed');
    expect(outbox.get(first.id)?.error?.message).toBe('offline');
  });

  test('a retried prompt moves behind everything sent meanwhile and is dispatched again', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const { started, pending, dispatch, reached } = createDispatch();
    const outbox = new Outbox(registry, dispatch);

    const reachedFirst = reached('first');
    const first = outbox.add('first', { blocks: blocks('first'), known: new Set() });
    const second = outbox.add('second', { blocks: blocks('second'), known: new Set() });
    await reachedFirst;
    const reachedSecond = reached('second');
    pending.get('first')?.reject(new Error('offline'));
    await reachedSecond;
    pending.get('second')?.resolve();
    await outbox.idle;

    const reachedAgain = reached('first');
    outbox.retry(first.id);
    expect(registry.get(outbox.entries).map(({ id }) => id)).toEqual([second.id, first.id]);
    expect(outbox.get(first.id)?.state).toBe('sending');
    await reachedAgain;
    expect(started).toEqual(['first', 'second', 'first']);
    pending.get('first')?.resolve();
    await outbox.idle;
    expect(outbox.get(first.id)?.state).toBe('submitted');
  });

  test('a prompt cancelled before it was sent is dropped rather than failed', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const { pending, dispatch, reached } = createDispatch();
    const outbox = new Outbox(registry, dispatch);

    const reachedFirst = reached('first');
    outbox.add('first', { blocks: blocks('first'), known: new Set() });
    await reachedFirst;
    pending.get('first')?.reject(new PromptCancelledError());
    await outbox.idle;
    expect(registry.get(outbox.entries)).toEqual([]);
  });

  test('a removed prompt that has not started is never dispatched', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const { started, pending, dispatch, reached } = createDispatch();
    const outbox = new Outbox(registry, dispatch);

    const reachedFirst = reached('first');
    outbox.add('first', { blocks: blocks('first'), known: new Set() });
    const second = outbox.add('second', { blocks: blocks('second'), known: new Set() });
    outbox.remove(second.id);
    await reachedFirst;
    pending.get('first')?.resolve();
    await outbox.idle;
    expect(started).toEqual(['first']);
  });
});
