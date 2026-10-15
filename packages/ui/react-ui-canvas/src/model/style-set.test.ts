//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import {
  Background,
  CLASSIC_STYLE_SET,
  DEFAULT_BACKGROUNDS,
  DEFAULT_STYLE_SETS,
  GLASS_STYLE_SET,
  PAPER_BACKGROUND,
  PLAIN_BACKGROUND,
  StyleSet,
  createStyleSetRegistry,
  defaultStyleSetRegistry,
  resolveBackground,
  resolveLook,
  resolveStyleSet,
} from './style-set.ts';

describe('style sets', () => {
  test('every built-in decodes against its schema', ({ expect }) => {
    for (const styleSet of Object.values(DEFAULT_STYLE_SETS)) {
      expect(Schema.decodeUnknownSync(StyleSet)(styleSet)).toEqual(styleSet);
    }
    for (const background of Object.values(DEFAULT_BACKGROUNDS)) {
      expect(Schema.decodeUnknownSync(Background)(background)).toEqual(background);
    }
  });

  test('a malformed set does not decode', ({ expect }) => {
    expect(() =>
      Schema.decodeUnknownSync(StyleSet)({
        ...CLASSIC_STYLE_SET,
        link: { kind: 'zigzag', width: 2, caption: 'opaque' },
      }),
    ).toThrow();
    expect(() => Schema.decodeUnknownSync(Background)({ ...PLAIN_BACKGROUND, grain: 2 })).toThrow();
  });

  test('ids resolve, and an unknown one falls back to classic on plain', ({ expect }) => {
    expect(resolveStyleSet(defaultStyleSetRegistry, 'glass')).toBe(GLASS_STYLE_SET);
    expect(resolveStyleSet(defaultStyleSetRegistry, 'gone')).toBe(CLASSIC_STYLE_SET);
    expect(resolveStyleSet(defaultStyleSetRegistry, undefined)).toBe(CLASSIC_STYLE_SET);
    expect(resolveBackground(defaultStyleSetRegistry, 'gone')).toBe(PLAIN_BACKGROUND);
  });

  test("a set's background applies unless one is named", ({ expect }) => {
    expect(resolveLook(defaultStyleSetRegistry, 'glass', undefined).background.id).toBe('glow');
    expect(resolveLook(defaultStyleSetRegistry, 'glass', 'paper').background).toBe(PAPER_BACKGROUND);
    // An unknown background falls back to the set's own.
    expect(resolveLook(defaultStyleSetRegistry, 'glass', 'gone').background.id).toBe('glow');
  });

  test("a background's tone picks the look's tone", ({ expect }) => {
    expect(resolveLook(defaultStyleSetRegistry, undefined, undefined).tone).toBe('theme');
    expect(resolveLook(defaultStyleSetRegistry, 'glass', 'paper').tone).toBe('light');
  });

  test("a host's sets extend the built-ins and override one of the same id", ({ expect }) => {
    const mine: StyleSet = { ...GLASS_STYLE_SET, id: 'mine', name: 'Mine', background: 'paper' };
    const registry = createStyleSetRegistry({
      styleSets: { mine },
      backgrounds: { plain: { ...PLAIN_BACKGROUND, name: 'Bare' } },
    });
    expect(resolveStyleSet(registry, 'mine')).toBe(mine);
    expect(resolveStyleSet(registry, 'classic')).toBe(CLASSIC_STYLE_SET);
    expect(resolveBackground(registry, 'plain').name).toBe('Bare');
  });
});
