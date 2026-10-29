//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { useFeedModelAdapter } from './useFeedModelAdapter.ts';

const renderer = (message: Message.Message) => [message.id];

const makeMessage = (text: string) =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { name: 'Astrid Holm' },
    blocks: [{ _tag: 'text', text }],
  });

describe('useFeedModelAdapter', () => {
  test('appends each item once as a query result grows', () => {
    const first = makeMessage('one');
    const second = makeMessage('two');
    const third = makeMessage('three');
    const { result, rerender } = renderHook(({ objects }) => useFeedModelAdapter(renderer, objects), {
      initialProps: { objects: [first] },
    });

    // Each rerender passes a new array, as a live query does when the feed grows.
    rerender({ objects: [first, second] });
    rerender({ objects: [first, second, third] });
    expect(result.current.chunks.map((chunk) => chunk.id)).toEqual([first.id, second.id, third.id]);
  });

  test('a new snapshot with the same items adds nothing', () => {
    const first = makeMessage('one');
    const { result, rerender } = renderHook(({ objects }) => useFeedModelAdapter(renderer, objects), {
      initialProps: { objects: [first] },
    });

    rerender({ objects: [first] });
    expect(result.current.chunks).toHaveLength(1);
  });
});
