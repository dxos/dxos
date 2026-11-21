//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type AwarenessProvider, type AwarenessState } from '@dxos/ui-editor';

import { SharedAwareness } from './shared-awareness.ts';

const ALICE: AwarenessState = {
  peerId: 'alice',
  info: { displayName: 'Alice', darkColor: 'pink', lightColor: 'pink' },
  position: { anchor: 'c', head: 'c' },
};

describe('SharedAwareness', () => {
  test('text that moves a caret out of a field redraws it, once', () => {
    const remoteStateChange = new Event<void>();
    const provider: AwarenessProvider = {
      remoteStateChange,
      open: () => {},
      close: () => {},
      getRemoteStates: () => [ALICE],
      update: () => {},
    };
    const awareness = new SharedAwareness();
    awareness.wrap(provider);

    let inTitle = true;
    const title = awareness.field({ hasFocus: () => false, contains: () => inTitle });
    invariant(title);
    title.open();
    expect(title.getRemoteStates()).toEqual([ALICE]);

    let redraws = 0;
    remoteStateChange.on(() => {
      redraws++;
    });
    awareness.textChanged();
    expect(redraws).toBe(0);

    // Alice's caret names the same character while text typed ahead of it moves it into the description.
    inTitle = false;
    awareness.textChanged();
    expect(redraws).toBe(1);
    expect(title.getRemoteStates()).toEqual([]);
    awareness.textChanged();
    expect(redraws).toBe(1);
  });
});
