//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LAYOUTS } from './markdown/frontmatter.ts';
import * as SlideFooter from './SlideFooter.ts';

describe('SlideFooter', () => {
  test('a slide that says nothing shows the footer on every layout but the ones that open or close a deck', () => {
    const bare = LAYOUTS.filter((layout) => !SlideFooter.shownOn({ layout }));
    expect(bare).toEqual(['cover', 'end']);
  });

  test('a slide’s own `footer:` decides, whatever its layout', () => {
    expect(SlideFooter.shownOn({ layout: 'default', footer: false })).toBe(false);
    expect(SlideFooter.shownOn({ layout: 'cover', footer: true })).toBe(true);
    expect(SlideFooter.shownOn({ layout: 'end', footer: true })).toBe(true);
    expect(SlideFooter.shownOn({ layout: 'cover', footer: false })).toBe(false);
  });

  test('a footer with no part set is empty', () => {
    expect(SlideFooter.isEmpty(undefined)).toBe(true);
    expect(SlideFooter.isEmpty({})).toBe(true);
    expect(SlideFooter.isEmpty({ left: '  ', right: '' })).toBe(true);
    expect(SlideFooter.isEmpty({ center: 'DXOS' })).toBe(false);
  });
});
