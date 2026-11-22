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

  test('fails when the stylesheet does not load', async ({ expect }) => {
    const pending = EffectEx.runPromise(Stylesheet.load('/assets/missing.css'));
    settle('error');
    await expect(pending).rejects.toBeInstanceOf(Stylesheet.StylesheetLoadError);
  });
});
