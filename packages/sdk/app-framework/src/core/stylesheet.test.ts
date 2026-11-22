//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Stylesheet from './stylesheet.ts';

const links = () => Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));

// jsdom fetches no stylesheet, so each test settles the link itself.
const settle = (type: 'load' | 'error') => links().forEach((link) => link.dispatchEvent(new Event(type)));

describe('Stylesheet', () => {
  afterEach(() => {
    links().forEach((link) => link.remove());
  });

  test('links the stylesheet and waits for it to load', async ({ expect }) => {
    let loaded = false;
    const pending = EffectEx.runPromise(Stylesheet.load('/assets/body.css')).then(() => {
      loaded = true;
    });
    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      new URL('/assets/body.css', document.baseURI).href,
    ]);

    await Promise.resolve();
    expect(loaded).toBe(false);

    settle('load');
    await pending;
    expect(loaded).toBe(true);
  });

  test('resolves a relative stylesheet against the module that needs it', async ({ expect }) => {
    const pending = EffectEx.runPromise(Stylesheet.load('./body.css', '/assets/plugin/body.js'));
    settle('load');
    await pending;
    expect(links().map((link) => link.href)).toEqual([new URL('/assets/plugin/body.css', document.baseURI).href]);
  });

  test('links a stylesheet once', async ({ expect }) => {
    const first = EffectEx.runPromise(Stylesheet.load('/assets/body.css'));
    settle('load');
    await first;

    // No event is dispatched: a second link would never settle.
    await EffectEx.runPromise(Stylesheet.load('./body.css', '/assets/body.js'));
    expect(links()).toHaveLength(1);
  });

  test('callers that need one stylesheet wait on the same link', async ({ expect }) => {
    const settled: string[] = [];
    const first = EffectEx.runPromise(Stylesheet.load('/assets/body.css')).then(() => settled.push('first'));
    const second = EffectEx.runPromise(Stylesheet.load('./body.css', '/assets/body.js')).then(() =>
      settled.push('second'),
    );
    expect(links()).toHaveLength(1);

    await Promise.resolve();
    expect(settled).toEqual([]);

    settle('load');
    await Promise.all([first, second]);
    expect(settled).toEqual(['first', 'second']);
  });

  test('fails every caller when the stylesheet does not load, and retries on the next call', async ({ expect }) => {
    const first = EffectEx.runPromise(Stylesheet.load('/assets/missing.css'));
    const second = EffectEx.runPromise(Stylesheet.load('/assets/missing.css'));
    settle('error');
    await expect(first).rejects.toBeInstanceOf(Stylesheet.StylesheetLoadError);
    await expect(second).rejects.toBeInstanceOf(Stylesheet.StylesheetLoadError);
    expect(links()).toHaveLength(0);

    const retry = EffectEx.runPromise(Stylesheet.load('/assets/missing.css'));
    expect(links()).toHaveLength(1);
    settle('load');
    await retry;
  });
});
