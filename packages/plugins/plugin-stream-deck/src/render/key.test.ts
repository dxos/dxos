//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Shortcut } from '@dxos/plugin-space/dashboard';

import { renderEmptyKey, renderKey } from './key.ts';

const spec: Shortcut = { target: 'eid:01J/abc', label: 'Notes', icon: 'ph--note--regular', hue: 'cyan' };

describe('renderKey', () => {
  test('renders a square SVG at the requested size', ({ expect }) => {
    const svg = renderKey(spec, { size: 144 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('viewBox="0 0 144 144"');
    expect(svg).toContain('width="144"');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  test('uses the hue colour', ({ expect }) => {
    expect(renderKey(spec)).toContain('#22d3ee');
  });

  test('falls back to the neutral accent for an unknown hue', ({ expect }) => {
    expect(renderKey({ ...spec, hue: 'chartreuse' })).toContain('#9aa2b1');
  });

  test('escapes the label', ({ expect }) => {
    const svg = renderKey({ ...spec, label: 'A & B' });
    expect(svg).toContain('A &amp; B');
    expect(svg).not.toContain('A & B');
  });

  test('inlines the icon markup with a resolvable currentColor', ({ expect }) => {
    const svg = renderKey(spec, { icon: { markup: '<path d="M0 0h8v8H0z"/>', viewBox: '0 0 8 8' } });
    expect(svg).toContain('viewBox="0 0 8 8"');
    expect(svg).toContain('<path d="M0 0h8v8H0z"/>');
    expect(svg).toContain('color="#22d3ee"');
  });

  test('empty slot still produces an image', ({ expect }) => {
    const svg = renderEmptyKey(144);
    expect(svg).toContain('<rect');
    expect(svg).not.toContain('<text');
  });
});
