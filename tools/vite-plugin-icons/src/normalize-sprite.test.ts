//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { normalizeSprite } from './normalize-sprite.ts';

const sprite = (...symbols: string[]) => `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>`;

describe('normalizeSprite', () => {
  test('adds a fill to a symbol that declares none', () => {
    const { svg } = normalizeSprite(
      sprite('<symbol viewBox="0 0 256 256" id="px--a--regular"><path d="M0 0h1v1z"/></symbol>'),
    );
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('<path d="M0 0h1v1z"/>');
  });

  test('replaces a hardcoded fill attribute rather than duplicating it', () => {
    const { svg } = normalizeSprite(sprite('<symbol fill="#000" id="px--a--regular"><path/></symbol>'));
    expect(svg).toContain('fill="currentColor"');
    expect(svg).not.toContain('#000');
    expect(svg.match(/fill=/g)).toHaveLength(1);
  });

  test('is idempotent', () => {
    const once = normalizeSprite(sprite('<symbol id="px--a--regular"><path/></symbol>')).svg;
    expect(normalizeSprite(once).svg).toEqual(once);
  });

  test('normalizes every symbol in a multi-symbol sprite', () => {
    const { svg } = normalizeSprite(
      sprite('<symbol id="ph--a--regular"><path/></symbol>', '<symbol id="px--b--regular"><circle/></symbol>'),
    );
    expect(svg.match(/fill="currentColor"/g)).toHaveLength(2);
  });

  test('preserves other attributes and the body verbatim', () => {
    const body = '<circle cx="128" cy="128" r="96" style="fill:none;stroke:currentColor;stroke-width:16px"/>';
    const { svg } = normalizeSprite(sprite(`<symbol viewBox="0 0 256 256" id="px--circle--regular">${body}</symbol>`));
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain('id="px--circle--regular"');
    expect(svg).toContain(body);
  });

  describe('hardcoded colors', () => {
    test('reports a literal the symbol attribute cannot override', () => {
      const { hardcoded } = normalizeSprite(
        sprite('<symbol id="px--a--regular"><path style="stroke:#000;stroke-width:10px"/></symbol>'),
      );
      expect(hardcoded).toEqual(['px--a--regular']);
    });

    test('reports a named color', () => {
      const { hardcoded } = normalizeSprite(
        sprite('<symbol id="px--a--regular"><circle style="fill:none;stroke:black"/></symbol>'),
      );
      expect(hardcoded).toEqual(['px--a--regular']);
    });

    test.for(['stroke:red', 'stroke: red', 'fill:rebeccapurple', 'fill:rgb(1 2 3)', 'fill:url(#gradient)'] as const)(
      'reports the non-inheriting paint %s',
      (style) => {
        const { hardcoded } = normalizeSprite(sprite(`<symbol id="px--a--regular"><path style="${style}"/></symbol>`));
        expect(hardcoded).toEqual(['px--a--regular']);
      },
    );

    test('reports a pinned paint set as an attribute rather than a style', () => {
      const { hardcoded } = normalizeSprite(sprite('<symbol id="px--a--regular"><path fill="red" d="M0 0"/></symbol>'));
      expect(hardcoded).toEqual(['px--a--regular']);
    });

    test.for([
      'fill:none',
      'fill:currentColor',
      'stroke:currentColor',
      'fill:transparent',
      'fill:inherit',
      // Unknowable here, so not worth a warning.
      'fill:var(--dx-icon-color)',
      // Not paint properties at all — the `-` sits where the separator would be.
      'fill-rule:nonzero',
      'stroke-width:16px',
      'stroke-linecap:round',
    ] as const)('does not report %s', (style) => {
      const { hardcoded } = normalizeSprite(sprite(`<symbol id="px--a--regular"><path style="${style}"/></symbol>`));
      expect(hardcoded).toEqual([]);
    });

    test('does not report a clean Phosphor symbol', () => {
      const { hardcoded } = normalizeSprite(
        sprite(
          '<symbol viewBox="0 0 256 256" fill="currentColor" id="ph--circle--regular"><path d="M128 24"/></symbol>',
        ),
      );
      expect(hardcoded).toEqual([]);
    });
  });
});
