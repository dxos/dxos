//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { fadeOutDeck, setWorkspaceFadeTarget } from './workspace-fade.ts';

describe('fadeOutDeck', () => {
  let deck: HTMLElement;
  let dips: { opacities: (string | number | null | undefined)[]; cancelled: boolean }[];
  let release: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    deck = document.createElement('div');
    document.body.append(deck);
    dips = [];
    // happy-dom has no animations: record each one.
    Object.defineProperty(deck, 'animate', {
      value: (keyframes: Keyframe[]) => {
        const dip = { opacities: keyframes.map(({ opacity }) => opacity), cancelled: false };
        dips.push(dip);
        return {
          cancel: () => {
            dip.cancelled = true;
          },
        };
      },
    });
    release = setWorkspaceFadeTarget(deck);
  });

  afterEach(() => {
    release();
    deck.remove();
    vi.useRealTimers();
  });

  test('dips the deck out and back in as one animation, resolving once it is out', async () => {
    let out = false;
    void EffectEx.runPromise(fadeOutDeck()).then(() => {
      out = true;
    });
    await vi.advanceTimersByTimeAsync(20);
    // From wherever the deck is, out, held out, back in.
    expect(dips.map(({ opacities }) => opacities.slice(1))).toEqual([[0, 0, 1]]);
    expect(out).toBe(false);
    await vi.advanceTimersByTimeAsync(90);
    expect(out).toBe(true);
  });

  test('a later switch replaces the dip still running', async () => {
    void EffectEx.runPromise(fadeOutDeck());
    await vi.advanceTimersByTimeAsync(20);
    void EffectEx.runPromise(fadeOutDeck());
    await vi.advanceTimersByTimeAsync(20);
    expect(dips.map(({ cancelled }) => cancelled)).toEqual([true, false]);
  });

  test('switches without a dip for a reader who prefers reduced motion', async () => {
    const matchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }),
    });
    try {
      await EffectEx.runPromise(fadeOutDeck());
      expect(dips).toEqual([]);
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    }
  });
});
